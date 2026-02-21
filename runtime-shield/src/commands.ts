import { ShieldConfig, ShieldStats, SecurityLevel } from "./types";
import { ShieldLogger } from "./logger";
import { PolicySync } from "./policy";

/**
 * Handle /shield slash commands.
 */
export function handleShieldCommand(
  args: string,
  config: ShieldConfig,
  stats: ShieldStats,
  logger: ShieldLogger,
  policySync: PolicySync,
  connected: boolean
): string {
  const parts = args.trim().split(/\s+/);
  const subcommand = parts[0]?.toLowerCase() || "status";

  switch (subcommand) {
    case "status":
      return formatStatus(config, stats, connected);

    case "level": {
      const level = parts[1]?.toLowerCase();
      const validLevels: SecurityLevel[] = ["paranoid", "strict", "moderate", "minimal"];
      if (!level || !validLevels.includes(level as SecurityLevel)) {
        return `Usage: /shield level <${validLevels.join("|")}>\nCurrent: ${config.securityLevel}`;
      }
      config.securityLevel = level as SecurityLevel;
      return `Security level set to: ${level}`;
    }

    case "blacklist": {
      const action = parts[1]?.toLowerCase();
      if (action === "add" && parts[2]) {
        const entry = parts.slice(2).join(" ");
        config.customBlacklist.push(entry);
        return `Added to blacklist: "${entry}"`;
      }
      if (action === "remove" && parts[2]) {
        const entry = parts.slice(2).join(" ");
        const idx = config.customBlacklist.indexOf(entry);
        if (idx >= 0) {
          config.customBlacklist.splice(idx, 1);
          return `Removed from blacklist: "${entry}"`;
        }
        return `Entry not found in blacklist: "${entry}"`;
      }
      if (action === "list") {
        if (config.customBlacklist.length === 0) return "Custom blacklist is empty.";
        return "Custom blacklist:\n" + config.customBlacklist.map((e) => `  - ${e}`).join("\n");
      }
      return "Usage: /shield blacklist <add|remove|list> [entry]";
    }

    case "log": {
      const count = parseInt(parts[1] || "10", 10);
      const lines = logger.readRecent(Math.min(count, 50));
      if (lines.length === 0) return "No local shield events yet.";
      return `Last ${lines.length} events:\n${lines.join("\n")}`;
    }

    case "sync": {
      policySync.forceSync().then((ok) => {
        // In practice this would need to be async, but for command output we report intent
      });
      return "Syncing policy from dashboard...";
    }

    case "stats":
      return formatStats(stats);

    default:
      return [
        "Usage: /shield <command>",
        "",
        "Commands:",
        "  status              Show current shield status",
        "  level <level>       Set security level",
        "  blacklist add/remove/list   Manage blacklist",
        "  log [count]         Show recent events",
        "  sync                Force policy sync",
        "  stats               Detection statistics",
      ].join("\n");
  }
}

function formatStatus(config: ShieldConfig, stats: ShieldStats, connected: boolean): string {
  return [
    "Clawkeeper Runtime Shield v1.0.0",
    `  Security level: ${config.securityLevel}`,
    `  Auto-block: ${config.autoBlock ? "on" : "off"}`,
    `  Dashboard: ${connected ? "connected" : "disconnected"}`,
    `  Hostname: ${config.hostname}`,
    `  Session: ${stats.totalChecked} checked, ${stats.blocked} blocked, ${stats.warned} warned`,
    `  Custom blacklist: ${config.customBlacklist.length} entries`,
  ].join("\n");
}

function formatStats(stats: ShieldStats): string {
  return [
    "Shield Detection Statistics",
    `  Total checked: ${stats.totalChecked}`,
    `  Blocked: ${stats.blocked}`,
    `  Warned: ${stats.warned}`,
    `  Passed: ${stats.passed}`,
    "",
    "By layer:",
    `  Regex: ${stats.byLayer.regex || 0}`,
    `  Semantic: ${stats.byLayer.semantic || 0}`,
    `  Context: ${stats.byLayer.context_integrity || 0}`,
    `  Blacklist: ${stats.byLayer.blacklist || 0}`,
    `  Entropy: ${stats.byLayer.entropy_heuristic || 0}`,
  ].join("\n");
}
