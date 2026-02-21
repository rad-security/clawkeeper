import { DetectionResult, Severity } from "../types";

interface Pattern {
  name: string;
  regex: RegExp;
  severity: Severity;
}

const PATTERNS: Pattern[] = [
  // Persona hijack
  { name: "persona_hijack", regex: /(?:you are now|from now on you are|your new identity is|act as|pretend to be)\s/i, severity: "critical" },
  { name: "persona_reset", regex: /(?:forget (?:everything|all|your|what)|disregard (?:all|your|previous))/i, severity: "critical" },
  { name: "new_instructions", regex: /(?:new instructions?|updated instructions?|revised instructions?):/i, severity: "critical" },

  // Instruction override
  { name: "ignore_previous", regex: /(?:ignore|disregard|forget|override)\s+(?:all\s+)?(?:previous|prior|above|earlier)\s+(?:instructions?|rules?|guidelines?|constraints?)/i, severity: "critical" },
  { name: "system_override", regex: /(?:system\s*(?:override|prompt|message)|admin\s*(?:mode|override)|developer\s*mode|debug\s*mode)/i, severity: "critical" },
  { name: "jailbreak", regex: /(?:jailbreak|DAN\s*mode|do anything now|evil\s*mode|uncensored\s*mode)/i, severity: "critical" },

  // Boundary escape
  { name: "boundary_markers", regex: /(?:```system|<\|system\|>|<\|im_start\|>|<\|endoftext\|>|\[INST\]|\[\/INST\])/i, severity: "high" },
  { name: "xml_injection", regex: /<(?:system|assistant|user|tool_result|function_call)\s*>/i, severity: "high" },
  { name: "markdown_escape", regex: /(?:---\s*(?:system|instructions|prompt)\s*---)/i, severity: "high" },

  // Social engineering
  { name: "urgency_pressure", regex: /(?:this is (?:urgent|critical|an emergency)|you must (?:immediately|now)|failure to comply)/i, severity: "medium" },
  { name: "authority_claim", regex: /(?:i am (?:your|the) (?:admin|developer|creator|owner)|i have (?:admin|root|sudo) (?:access|privileges))/i, severity: "medium" },
  { name: "emotional_manipulation", regex: /(?:if you don'?t .+ (?:people will|someone will|i will) (?:die|be hurt|suffer))/i, severity: "medium" },

  // Encoding / obfuscation
  { name: "base64_block", regex: /[A-Za-z0-9+/]{50,}={0,2}/m, severity: "medium" },
  { name: "hex_encoding", regex: /(?:\\x[0-9a-fA-F]{2}){8,}/m, severity: "medium" },
  { name: "unicode_escape", regex: /(?:\\u[0-9a-fA-F]{4}){4,}/m, severity: "medium" },
  { name: "zero_width_chars", regex: /[\u200B\u200C\u200D\uFEFF]{2,}/, severity: "high" },
  { name: "homoglyphs", regex: /[\u0400-\u04FF].*[\x41-\x5A\x61-\x7A]|[\x41-\x5A\x61-\x7A].*[\u0400-\u04FF]/, severity: "medium" },

  // Tool/data exfiltration
  { name: "exfil_curl", regex: /(?:curl|wget|fetch)\s+(?:https?:\/\/|ftp:\/\/)(?!(?:localhost|127\.0\.0\.1))/i, severity: "high" },
  { name: "exfil_webhook", regex: /(?:webhook|callback|notify).*(?:https?:\/\/)/i, severity: "medium" },
  { name: "data_extraction", regex: /(?:send|post|upload|transmit|exfiltrate)\s+(?:all|the|my|this)\s+(?:data|information|content|files|credentials)/i, severity: "high" },

  // Prompt leak
  { name: "prompt_leak_request", regex: /(?:show|reveal|display|print|output|repeat)\s+(?:your|the)\s+(?:system\s*)?(?:prompt|instructions|rules|guidelines)/i, severity: "medium" },
  { name: "prompt_leak_indirect", regex: /(?:what (?:are|were) your (?:original\s+)?instructions|what is your (?:system\s+)?prompt)/i, severity: "medium" },

  // Command injection
  { name: "shell_injection", regex: /(?:;\s*(?:rm|cat|curl|wget|nc|bash|sh|python|perl|ruby)\s|&&\s*(?:rm|cat|curl)|`[^`]*(?:rm|cat|curl))/i, severity: "critical" },
  { name: "path_traversal", regex: /(?:\.\.\/){3,}|(?:\/etc\/(?:passwd|shadow|hosts))/i, severity: "high" },

  // Skill-specific attacks
  { name: "skill_impersonation", regex: /(?:SKILL\.md|skill manifest|skill config)\s*:?\s*\n/i, severity: "high" },
  { name: "tool_result_spoof", regex: /(?:tool_result|function_response|api_response)\s*[:{]/i, severity: "high" },

  // Multi-step / chain
  { name: "chain_instructions", regex: /(?:step\s*1[:\s].*(?:ignore|override|forget).*step\s*2[:\s])/is, severity: "high" },
  { name: "nested_injection", regex: /(?:when\s+(?:asked|prompted|queried)\s+about\s+.+?\s+(?:say|respond|answer|reply))/i, severity: "medium" },
];

export function detectRegex(input: string): DetectionResult {
  let highestSeverity: Severity = "low";
  let bestMatch: Pattern | null = null;
  let matchCount = 0;

  const severityRank: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1 };

  for (const pattern of PATTERNS) {
    if (pattern.regex.test(input)) {
      matchCount++;
      if (severityRank[pattern.severity] > severityRank[highestSeverity]) {
        highestSeverity = pattern.severity;
        bestMatch = pattern;
      }
    }
  }

  return {
    layer: "regex",
    flagged: matchCount > 0,
    severity: highestSeverity,
    confidence: Math.min(1, matchCount * 0.3),
    patternName: bestMatch?.name,
    detail: matchCount > 0 ? `${matchCount} pattern(s) matched` : undefined,
  };
}
