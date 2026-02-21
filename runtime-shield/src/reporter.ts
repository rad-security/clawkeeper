import { ShieldConfig, ShieldEventPayload, ShieldVerdict } from "./types";

const FLUSH_INTERVAL_MS = 30_000;
const MAX_BATCH_SIZE = 10;

/**
 * Batch reporter: queues events and flushes every 30s or 10 events.
 */
export class ShieldReporter {
  private config: ShieldConfig;
  private queue: ShieldEventPayload[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(config: ShieldConfig) {
    this.config = config;
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.flush();
  }

  enqueue(verdict: ShieldVerdict): void {
    if (!this.config.apiKey) return;

    const topDetection = verdict.detections.find((d) => d.flagged);
    if (!topDetection && verdict.verdict === "passed") return; // Don't report passed events

    const payload: ShieldEventPayload = {
      hostname: this.config.hostname,
      detection_layer: topDetection?.layer || "regex",
      verdict: verdict.verdict,
      severity: verdict.severity,
      security_level: this.config.securityLevel,
      pattern_name: topDetection?.patternName,
      input_hash: verdict.inputHash,
      input_length: verdict.inputLength,
      confidence: verdict.confidence,
      context: {
        flags: verdict.detections.filter((d) => d.flagged).map((d) => ({
          layer: d.layer,
          severity: d.severity,
          pattern: d.patternName,
        })),
      },
    };

    this.queue.push(payload);
    if (this.queue.length >= MAX_BATCH_SIZE) {
      this.flush();
    }
  }

  private async flush(): Promise<void> {
    if (this.queue.length === 0 || !this.config.apiKey) return;

    const batch = this.queue.splice(0, 100);

    try {
      const res = await fetch(`${this.config.apiUrl}/shield/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({ events: batch }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        // Re-queue on failure (up to 200 max to avoid memory growth)
        if (this.queue.length < 200) {
          this.queue.unshift(...batch);
        }
      }
    } catch {
      // Re-queue on network failure
      if (this.queue.length < 200) {
        this.queue.unshift(...batch);
      }
    }
  }
}
