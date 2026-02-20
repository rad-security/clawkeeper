import { describe, it, expect } from "vitest";
import { validateScanPayload } from "@/lib/report-parser";

const validPayload = {
  hostname: "test-host.local",
  platform: "darwin",
  os_version: "14.2",
  score: 85,
  grade: "B",
  passed: 30,
  failed: 5,
  fixed: 2,
  skipped: 2,
  checks: [
    { status: "PASS", check_name: "Firewall", detail: "Enabled" },
    { status: "FAIL", check_name: "FileVault", detail: "Not enabled" },
    { status: "FIXED", check_name: "Auto Updates", detail: "Fixed" },
    { status: "SKIPPED", check_name: "Siri", detail: "N/A" },
  ],
  raw_report: "test report content",
  scanned_at: "2026-02-19T00:00:00Z",
  agent_version: "1.0.0",
};

describe("validateScanPayload", () => {
  it("accepts a valid payload", () => {
    const result = validateScanPayload(validPayload);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.hostname).toBe("test-host.local");
      expect(result.data.platform).toBe("darwin");
      expect(result.data.score).toBe(85);
      expect(result.data.grade).toBe("B");
      expect(result.data.checks).toHaveLength(4);
    }
  });

  it("rejects null body", () => {
    const result = validateScanPayload(null);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain("JSON object");
  });

  it("rejects non-object body", () => {
    expect(validateScanPayload("string").valid).toBe(false);
    expect(validateScanPayload(123).valid).toBe(false);
    expect(validateScanPayload([]).valid).toBe(false);
  });

  it("rejects missing hostname", () => {
    const result = validateScanPayload({ ...validPayload, hostname: undefined });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain("hostname");
  });

  it("rejects missing platform", () => {
    const result = validateScanPayload({ ...validPayload, platform: undefined });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain("platform");
  });

  it("rejects invalid score (negative)", () => {
    const result = validateScanPayload({ ...validPayload, score: -1 });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain("score");
  });

  it("rejects invalid score (over 100)", () => {
    const result = validateScanPayload({ ...validPayload, score: 101 });
    expect(result.valid).toBe(false);
  });

  it("rejects invalid score (string)", () => {
    const result = validateScanPayload({ ...validPayload, score: "85" });
    expect(result.valid).toBe(false);
  });

  it("accepts score of 0", () => {
    const result = validateScanPayload({ ...validPayload, score: 0 });
    expect(result.valid).toBe(true);
  });

  it("accepts score of 100", () => {
    const result = validateScanPayload({ ...validPayload, score: 100 });
    expect(result.valid).toBe(true);
  });

  it("rejects invalid grade", () => {
    const result = validateScanPayload({ ...validPayload, grade: "Z" });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain("grade");
  });

  it("accepts all valid grades", () => {
    for (const grade of ["A", "B", "C", "D", "F"]) {
      const result = validateScanPayload({ ...validPayload, grade });
      expect(result.valid).toBe(true);
    }
  });

  it("rejects non-array checks", () => {
    const result = validateScanPayload({ ...validPayload, checks: "not-array" });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain("checks");
  });

  it("rejects checks array exceeding 500", () => {
    const checks = Array.from({ length: 501 }, (_, i) => ({
      status: "PASS",
      check_name: `Check ${i}`,
      detail: "",
    }));
    const result = validateScanPayload({ ...validPayload, checks });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain("500");
  });

  it("rejects raw_report over 1MB", () => {
    const result = validateScanPayload({
      ...validPayload,
      raw_report: "x".repeat(1_000_001),
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain("1MB");
  });

  it("rejects invalid check status", () => {
    const result = validateScanPayload({
      ...validPayload,
      checks: [{ status: "INVALID", check_name: "Test", detail: "" }],
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain("status");
  });

  it("rejects check without check_name", () => {
    const result = validateScanPayload({
      ...validPayload,
      checks: [{ status: "PASS", detail: "" }],
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain("check_name");
  });

  it("defaults optional fields when missing", () => {
    const minimal = {
      hostname: "test",
      platform: "linux",
      score: 50,
      grade: "C",
      checks: [],
    };
    const result = validateScanPayload(minimal);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.os_version).toBe("");
      expect(result.data.passed).toBe(0);
      expect(result.data.failed).toBe(0);
      expect(result.data.fixed).toBe(0);
      expect(result.data.skipped).toBe(0);
      expect(result.data.raw_report).toBe("");
      expect(result.data.agent_version).toBe("unknown");
      // scanned_at should default to a valid ISO date
      expect(new Date(result.data.scanned_at).getTime()).not.toBeNaN();
    }
  });

  it("accepts all valid check statuses", () => {
    for (const status of ["PASS", "FAIL", "FIXED", "SKIPPED"]) {
      const result = validateScanPayload({
        ...validPayload,
        checks: [{ status, check_name: "Test", detail: "ok" }],
      });
      expect(result.valid).toBe(true);
    }
  });

  it("preserves check details correctly", () => {
    const result = validateScanPayload(validPayload);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.checks[0].detail).toBe("Enabled");
      expect(result.data.checks[1].detail).toBe("Not enabled");
    }
  });
});
