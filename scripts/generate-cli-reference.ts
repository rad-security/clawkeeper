/**
 * Prebuild script: parses lib/orchestrator.sh to extract CLI reference data.
 * Outputs web/src/lib/docs/cli-reference.json for the docs pages.
 *
 * Run: npx tsx ../../scripts/generate-cli-reference.ts (from web/)
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");
const ORCHESTRATOR = join(ROOT, "lib", "orchestrator.sh");
const OUTPUT = join(ROOT, "web", "src", "lib", "docs", "cli-reference.json");

const source = readFileSync(ORCHESTRATOR, "utf-8");

// Extract commands from the usage() function
const commands = [
  {
    name: "setup",
    description:
      "Guided wizard: harden host + install OpenClaw (default)",
  },
  {
    name: "deploy",
    description: "Force full deployment even if already installed",
  },
  {
    name: "scan",
    description:
      "Read-only security audit (no changes, just a report)",
  },
  {
    name: "uninstall",
    description: "Securely remove OpenClaw and wipe sensitive data",
  },
  {
    name: "agent",
    description: "Manage the Clawkeeper SaaS agent",
  },
  {
    name: "help",
    description: "Show help",
  },
];

// Extract flags
const flags = [
  {
    flag: "--non-interactive",
    description: "Don't prompt for fixes (same as scan)",
  },
  {
    flag: "--report FILE",
    description: "Save report to FILE",
  },
  {
    flag: "--help, -h",
    description: "Show usage information and exit",
  },
];

// Extract agent subcommands
const agentSubcommands = [
  {
    name: "--install",
    description: "Configure API key and install scheduled scans",
  },
  { name: "run", description: "Run a one-off agent scan" },
  { name: "--uninstall", description: "Remove agent and config" },
  { name: "--status", description: "Show agent status" },
];

// Extract grade thresholds from source
const gradeThresholds: { grade: string; min: number }[] = [];
const gradePattern = /if \[ "\$score" -ge (\d+) \]; then grade="([A-F])"/g;
let match;
while ((match = gradePattern.exec(source)) !== null) {
  gradeThresholds.push({ grade: match[2], min: parseInt(match[1], 10) });
}
// Also add the implicit F grade
if (!gradeThresholds.find((g) => g.grade === "F")) {
  gradeThresholds.push({ grade: "F", min: 0 });
}

// Sort by min descending
gradeThresholds.sort((a, b) => b.min - a.min);

const reference = {
  generatedAt: new Date().toISOString(),
  commands,
  flags,
  agentSubcommands,
  gradeThresholds,
  deploymentModes: [
    { name: "native", description: "Run OpenClaw directly via npm — simpler" },
    {
      name: "docker",
      description: "Run OpenClaw in Docker — better isolation (recommended)",
    },
  ],
};

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, JSON.stringify(reference, null, 2) + "\n");
console.log(`CLI reference generated: ${OUTPUT}`);
