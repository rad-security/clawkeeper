import { ScanUploadPayload } from "@/types";

const VALID_STATUSES = ["PASS", "FAIL", "FIXED", "SKIPPED"];
const VALID_GRADES = ["A", "B", "C", "D", "F"];
const MAX_HOSTNAME_LENGTH = 255;
const MAX_PLATFORM_LENGTH = 64;
const MAX_CHECK_NAME_LENGTH = 200;
const MAX_CHECK_DETAIL_LENGTH = 2_000;
const MAX_OS_VERSION_LENGTH = 128;
const MAX_AGENT_VERSION_LENGTH = 64;

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
  if (b.hostname.length > MAX_HOSTNAME_LENGTH) {
    return { valid: false, error: `hostname exceeds ${MAX_HOSTNAME_LENGTH} characters` };
  }
  if (!b.platform || typeof b.platform !== "string") {
    return { valid: false, error: "platform is required (string)" };
  }
  if (b.platform.length > MAX_PLATFORM_LENGTH) {
    return { valid: false, error: `platform exceeds ${MAX_PLATFORM_LENGTH} characters` };
  }
  if (typeof b.os_version === "string" && b.os_version.length > MAX_OS_VERSION_LENGTH) {
    return { valid: false, error: `os_version exceeds ${MAX_OS_VERSION_LENGTH} characters` };
  }
  if (typeof b.agent_version === "string" && b.agent_version.length > MAX_AGENT_VERSION_LENGTH) {
    return { valid: false, error: `agent_version exceeds ${MAX_AGENT_VERSION_LENGTH} characters` };
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
  if (b.checks.length > 500) {
    return { valid: false, error: "checks array exceeds maximum of 500 entries" };
  }
  if (typeof b.raw_report === "string" && b.raw_report.length > 1_000_000) {
    return { valid: false, error: "raw_report exceeds maximum size of 1MB" };
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
    if (c.check_name.length > MAX_CHECK_NAME_LENGTH) {
      return {
        valid: false,
        error: `checks[${i}].check_name exceeds ${MAX_CHECK_NAME_LENGTH} characters`,
      };
    }
    if (typeof c.detail === "string" && c.detail.length > MAX_CHECK_DETAIL_LENGTH) {
      return {
        valid: false,
        error: `checks[${i}].detail exceeds ${MAX_CHECK_DETAIL_LENGTH} characters`,
      };
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
