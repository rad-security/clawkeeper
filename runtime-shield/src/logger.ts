import * as fs from "fs";
import * as path from "path";
import { ShieldConfig, ShieldVerdict } from "./types";
import { getLogPath } from "./config";

/**
 * Daily-rotated JSONL logger. SHA-256 hashed inputs only — never raw content.
 */
export class ShieldLogger {
  private config: ShieldConfig;

  constructor(config: ShieldConfig) {
    this.config = config;
    this.ensureLogDir();
  }

  private ensureLogDir(): void {
    try {
      fs.mkdirSync(this.config.logDir, { recursive: true });
    } catch {
      // Best-effort
    }
  }

  log(verdict: ShieldVerdict, turnType: "user" | "tool_result"): void {
    const logPath = getLogPath(this.config);
    const topDetection = verdict.detections.find((d) => d.flagged);

    const entry = {
      ts: new Date().toISOString(),
      hostname: this.config.hostname,
      turn_type: turnType,
      verdict: verdict.verdict,
      severity: verdict.severity,
      security_level: this.config.securityLevel,
      input_hash: verdict.inputHash,
      input_length: verdict.inputLength,
      confidence: verdict.confidence,
      detection_layer: topDetection?.layer || null,
      pattern_name: topDetection?.patternName || null,
      flags: verdict.detections.filter((d) => d.flagged).map((d) => d.layer),
    };

    try {
      fs.appendFileSync(logPath, JSON.stringify(entry) + "\n");
    } catch {
      // Best-effort logging
    }
  }

  readRecent(count: number = 10): string[] {
    const logPath = getLogPath(this.config);
    try {
      const content = fs.readFileSync(logPath, "utf-8");
      const lines = content.trim().split("\n").filter(Boolean);
      return lines.slice(-count);
    } catch {
      return [];
    }
  }
}
