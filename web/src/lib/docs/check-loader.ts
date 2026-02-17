import { readdir, readFile, access } from "fs/promises";
import { join } from "path";
import { parse } from "smol-toml";

export interface Check {
  id: string;
  name: string;
  phase: string;
  platform: string;
  description: string;
  requiresSudo: boolean;
  order: number;
  hasRemediation: boolean;
}

const CHECKS_DIR = join(process.cwd(), "..", "checks");

export const PHASE_LABELS: Record<string, string> = {
  host_hardening: "Host Hardening",
  network: "Network",
  prerequisites: "Prerequisites",
  security_audit: "Security Audit",
};

export const PHASES = Object.keys(PHASE_LABELS);

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function getAllChecks(): Promise<Check[]> {
  const entries = await readdir(CHECKS_DIR, { withFileTypes: true });
  const checks: Check[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const tomlPath = join(CHECKS_DIR, entry.name, "check.toml");
    if (!(await fileExists(tomlPath))) continue;

    const raw = await readFile(tomlPath, "utf-8");
    const data = parse(raw);

    checks.push({
      id: data.id as string,
      name: data.name as string,
      phase: data.phase as string,
      platform: data.platform as string,
      description: data.description as string,
      requiresSudo: data.requires_sudo as boolean,
      order: data.order as number,
      hasRemediation: await fileExists(
        join(CHECKS_DIR, entry.name, "remediate.sh")
      ),
    });
  }

  return checks.sort((a, b) => a.order - b.order);
}

export async function getChecksByPhase(phase: string): Promise<Check[]> {
  const all = await getAllChecks();
  return all.filter((c) => c.phase === phase);
}
