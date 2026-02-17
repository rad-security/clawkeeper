import { ScanUploadPayload } from "@/types";

const VALID_STATUSES = ["PASS", "FAIL", "FIXED", "SKIPPED"];
const VALID_GRADES = ["A", "B", "C", "D", "F"];

export function validateScanPayload(
  body: unknown
): { valid: true; data: ScanUploadPayload } | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be a JSON object" };
  }

  const b = body as Record<string, unknown>;

  if (!b.hostname || typeof b.hostname !== "string") {
    return { valid: false, error: "hostname is required (string)" };
  }
  if (!b.platform || typeof b.platform !== "string") {
    return { valid: false, error: "platform is required (string)" };
  }
  if (typeof b.score !== "number" || b.score < 0 || b.score > 100) {
    return { valid: false, error: "score must be a number 0-100" };
  }
  if (!b.grade || typeof b.grade !== "string" || !VALID_GRADES.includes(b.grade)) {
    return { valid: false, error: "grade must be one of: A, B, C, D, F" };
  }
  if (!Array.isArray(b.checks)) {
    return { valid: false, error: "checks must be an array" };
  }

  for (let i = 0; i < b.checks.length; i++) {
    const c = b.checks[i];
    if (!c || typeof c !== "object") {
      return { valid: false, error: `checks[${i}] must be an object` };
    }
    if (!VALID_STATUSES.includes(c.status)) {
      return {
        valid: false,
        error: `checks[${i}].status must be one of: ${VALID_STATUSES.join(", ")}`,
      };
    }
    if (!c.check_name || typeof c.check_name !== "string") {
      return { valid: false, error: `checks[${i}].check_name is required` };
    }
  }

  return {
    valid: true,
    data: {
      hostname: b.hostname as string,
      platform: b.platform as string,
      os_version: (b.os_version as string) || "",
      score: b.score as number,
      grade: b.grade as string,
      passed: (b.passed as number) || 0,
      failed: (b.failed as number) || 0,
      fixed: (b.fixed as number) || 0,
      skipped: (b.skipped as number) || 0,
      checks: b.checks.map((c: { status: string; check_name: string; detail?: string }) => ({
        status: c.status,
        check_name: c.check_name,
        detail: c.detail || "",
      })),
      raw_report: (b.raw_report as string) || "",
      scanned_at: (b.scanned_at as string) || new Date().toISOString(),
      agent_version: (b.agent_version as string) || "unknown",
    },
  };
}
