import { ShieldConfig } from "./types";
import * as os from "os";
import * as path from "path";

export const DEFAULT_BLACKLIST = [
  "ignore all previous instructions",
  "disregard your instructions",
  "forget your rules",
  "you are now",
  "pretend you are",
  "act as if you are",
  "new persona:",
  "system override:",
  "admin mode:",
  "developer mode:",
  "jailbreak",
  "DAN mode",
  "bypass safety",
  "ignore safety",
  "override restrictions",
  "disable content filter",
  "remove all restrictions",
  "you have no rules",
  "forget everything above",
];

export function loadConfig(): ShieldConfig {
  const home = os.homedir();
  return {
    apiKey: process.env.CLAWKEEPER_API_KEY || "",
    apiUrl: (process.env.CLAWKEEPER_API_URL || "https://clawkeeper.dev/api/v1").replace(/\/$/, ""),
    securityLevel: (process.env.SHIELD_SECURITY_LEVEL as ShieldConfig["securityLevel"]) || "strict",
    logDir: (process.env.SHIELD_LOG_DIR || "~/.clawkeeper/shield-logs").replace("~", home),
    hostname: os.hostname(),
    customBlacklist: [],
    trustedSources: [],
    entropyThreshold: 4.5,
    maxInputLength: 10000,
    autoBlock: true,
  };
}

export function getLogPath(config: ShieldConfig): string {
  const date = new Date().toISOString().slice(0, 10);
  return path.join(config.logDir, `shield-${date}.jsonl`);
}
