import { ShieldConfig } from "./types";

const HEARTBEAT_INTERVAL_MS = 5 * 60_000; // 5 minutes

/**
 * Sends periodic heartbeat to dashboard to keep shield status alive.
 */
export class Heartbeat {
  private config: ShieldConfig;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(config: ShieldConfig) {
    this.config = config;
  }

  start(): void {
    if (this.timer) return;
    this.send();
    this.timer = setInterval(() => this.send(), HEARTBEAT_INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async send(): Promise<void> {
    if (!this.config.apiKey) return;

    try {
      await fetch(`${this.config.apiUrl}/shield/heartbeat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          hostname: this.config.hostname,
          shield_version: "1.0.0",
        }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      // Best-effort
    }
  }
}
