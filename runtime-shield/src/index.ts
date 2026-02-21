import { loadConfig } from "./config";
import { detect } from "./detector";
import { ShieldLogger } from "./logger";
import { ShieldReporter } from "./reporter";
import { PolicySync } from "./policy";
import { Heartbeat } from "./heartbeat";
import { handleShieldCommand } from "./commands";
import { ShieldStats, DetectionLayer } from "./types";

// Global state
let config = loadConfig();
let logger: ShieldLogger;
let reporter: ShieldReporter;
let policySync: PolicySync;
let heartbeat: Heartbeat;
let connected = false;

const stats: ShieldStats = {
  totalChecked: 0,
  blocked: 0,
  warned: 0,
  passed: 0,
  byLayer: {
    regex: 0,
    semantic: 0,
    context_integrity: 0,
    blacklist: 0,
    entropy_heuristic: 0,
  },
};

/**
 * OpenClaw hook: called when the skill is loaded.
 */
export function onLoad(): void {
  config = loadConfig();
  logger = new ShieldLogger(config);
  reporter = new ShieldReporter(config);
  policySync = new PolicySync(config);
  heartbeat = new Heartbeat(config);

  reporter.start();
  policySync.start();
  heartbeat.start();

  connected = !!config.apiKey;

  console.log(`[shield] Runtime Shield v1.0.0 active (level: ${config.securityLevel}, dashboard: ${connected ? "connected" : "local-only"})`);
}

/**
 * OpenClaw hook: called on every user message.
 * Return a string to display a warning/block message, or undefined to pass.
 */
export function onMessage(message: string): string | undefined {
  // Handle /shield commands
  if (message.startsWith("/shield")) {
    const args = message.slice("/shield".length).trim();
    return handleShieldCommand(args, config, stats, logger, policySync, connected);
  }

  return runDetection(message, "user");
}

/**
 * OpenClaw hook: called on every tool result.
 * Only runs regex, blacklist, and entropy layers (not semantic/context).
 */
export function onToolResult(result: string): string | undefined {
  return runDetection(result, "tool_result");
}

function runDetection(input: string, turnType: "user" | "tool_result"): string | undefined {
  const verdict = detect(input, config, turnType);

  // Update stats
  stats.totalChecked++;
  if (verdict.verdict === "blocked") stats.blocked++;
  else if (verdict.verdict === "warned") stats.warned++;
  else stats.passed++;

  // Track layer stats for flagged detections
  for (const d of verdict.detections) {
    if (d.flagged) {
      stats.byLayer[d.layer as DetectionLayer]++;
    }
  }

  // Log locally
  logger.log(verdict, turnType);

  // Report to dashboard
  reporter.enqueue(verdict);

  // Respond based on verdict
  if (verdict.verdict === "blocked") {
    const topDetection = verdict.detections.find((d) => d.flagged);
    return [
      `[SHIELD BLOCKED] Potential prompt injection detected.`,
      `  Layer: ${topDetection?.layer || "multiple"}`,
      `  Pattern: ${topDetection?.patternName || "unknown"}`,
      `  Severity: ${verdict.severity}`,
      `  Confidence: ${Math.round(verdict.confidence * 100)}%`,
      ``,
      `This message was blocked by Clawkeeper Runtime Shield.`,
      `Use /shield status for more info.`,
    ].join("\n");
  }

  if (verdict.verdict === "warned") {
    const topDetection = verdict.detections.find((d) => d.flagged);
    return [
      `[SHIELD WARNING] Suspicious content detected.`,
      `  Layer: ${topDetection?.layer || "multiple"}`,
      `  Pattern: ${topDetection?.patternName || "unknown"}`,
      `  Severity: ${verdict.severity}`,
      ``,
      `Proceeding with caution. Use /shield stats for details.`,
    ].join("\n");
  }

  return undefined; // Passed — no message
}

/**
 * Cleanup on skill unload.
 */
export function onUnload(): void {
  reporter.stop();
  policySync.stop();
  heartbeat.stop();
}
