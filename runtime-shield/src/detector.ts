import { DetectionResult, SecurityLevel, Severity, ShieldVerdict, ShieldConfig } from "./types";
import { detectRegex } from "./layers/regex";
import { detectSemantic } from "./layers/semantic";
import { detectContext } from "./layers/context";
import { detectBlacklist } from "./layers/blacklist";
import { detectEntropy } from "./layers/entropy";
import * as crypto from "crypto";

/**
 * Run all 5 detection layers and determine verdict based on security level.
 */
export function detect(
  input: string,
  config: ShieldConfig,
  turnType: "user" | "tool_result" = "user"
): ShieldVerdict {
  const inputHash = crypto.createHash("sha256").update(input).digest("hex");

  // Run all layers
  const results: DetectionResult[] = [
    detectRegex(input),
    detectSemantic(input),
    detectContext(input, turnType),
    detectBlacklist(input, config.customBlacklist),
    detectEntropy(input, config.entropyThreshold, config.maxInputLength),
  ];

  const flagged = results.filter((r) => r.flagged);
  const flagCount = flagged.length;

  // Determine highest severity among flagged results
  const severityRank: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  let highestSeverity: Severity = "low";
  let highestConfidence = 0;

  for (const r of flagged) {
    if (severityRank[r.severity] > severityRank[highestSeverity]) {
      highestSeverity = r.severity;
    }
    if (r.confidence > highestConfidence) {
      highestConfidence = r.confidence;
    }
  }

  // Determine verdict based on security level
  const verdict = determineVerdict(config.securityLevel, flagCount, highestSeverity);

  return {
    verdict: config.autoBlock ? verdict : (verdict === "blocked" ? "warned" : verdict),
    severity: flagCount > 0 ? highestSeverity : "low",
    detections: results,
    confidence: highestConfidence,
    inputHash,
    inputLength: input.length,
  };
}

function determineVerdict(
  level: SecurityLevel,
  flagCount: number,
  highestSeverity: Severity
): "blocked" | "warned" | "passed" {
  if (flagCount === 0) return "passed";

  const isCritical = highestSeverity === "critical";
  const isHigh = highestSeverity === "high";

  switch (level) {
    case "paranoid":
      // Block on any single flag
      return "blocked";

    case "strict":
      // Block on 2+ flags OR any critical
      if (flagCount >= 2 || isCritical) return "blocked";
      return "warned";

    case "moderate":
      // Block on 2+ flags AND (critical or high)
      if (flagCount >= 2 && (isCritical || isHigh)) return "blocked";
      if (isCritical || isHigh) return "warned";
      return "passed";

    case "minimal":
      // Only block explicit blacklist or critical regex
      if (isCritical) return "blocked";
      if (isHigh) return "warned";
      return "passed";

    default:
      return flagCount >= 2 ? "blocked" : "warned";
  }
}
