import { DetectionResult } from "../types";

/**
 * Layer 3: Context Integrity
 * Validates turn types and detects tool response impersonation.
 */

const TOOL_RESPONSE_PATTERNS = [
  /^\s*\{[\s\S]*"(?:result|output|response|data|status)"[\s\S]*\}\s*$/,
  /^\s*(?:tool_result|function_response|api_response)\s*[:=]/i,
  /^\s*<tool_result>/i,
  /^\s*\[(?:TOOL|FUNCTION|API)\s+(?:RESULT|RESPONSE|OUTPUT)\]/i,
];

const SYSTEM_IMPERSONATION_PATTERNS = [
  /^\s*\[?system\]?\s*[:>]/im,
  /^\s*<system>/i,
  /^\s*assistant\s*[:>]\s/im,
  /^\s*\[?(?:instruction|directive)\]?\s*[:>]/im,
];

const MULTI_ROLE_PATTERNS = [
  /user\s*[:>][\s\S]{5,}assistant\s*[:>]/i,
  /human\s*[:>][\s\S]{5,}(?:ai|assistant|bot)\s*[:>]/i,
];

export function detectContext(input: string, turnType: "user" | "tool_result" = "user"): DetectionResult {
  let flagged = false;
  let detail: string | undefined;
  let patternName: string | undefined;

  // In user messages, detect tool response impersonation
  if (turnType === "user") {
    for (const pattern of TOOL_RESPONSE_PATTERNS) {
      if (pattern.test(input)) {
        flagged = true;
        patternName = "tool_response_impersonation";
        detail = "User message appears to impersonate a tool response";
        break;
      }
    }
  }

  // Detect system message impersonation
  if (!flagged) {
    for (const pattern of SYSTEM_IMPERSONATION_PATTERNS) {
      if (pattern.test(input)) {
        flagged = true;
        patternName = "system_impersonation";
        detail = "Input contains system message markers";
        break;
      }
    }
  }

  // Detect multi-role conversation injection
  if (!flagged) {
    for (const pattern of MULTI_ROLE_PATTERNS) {
      if (pattern.test(input)) {
        flagged = true;
        patternName = "multi_role_injection";
        detail = "Input contains multiple conversation role markers";
        break;
      }
    }
  }

  return {
    layer: "context_integrity",
    flagged,
    severity: flagged ? "high" : "low",
    confidence: flagged ? 0.85 : 0,
    patternName,
    detail,
  };
}
