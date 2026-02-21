import { DetectionResult, Severity } from "../types";

interface SemanticSignal {
  name: string;
  weight: number;
  patterns: RegExp[];
  severity: Severity;
}

const SIGNALS: SemanticSignal[] = [
  {
    name: "persona_hijack",
    weight: 0.30,
    severity: "critical",
    patterns: [
      /you\s+(?:are|will be|shall be|must be)\s+(?:a|an|the|my)\s+\w+/i,
      /(?:new|your new|changed?)\s+(?:role|persona|identity|character)/i,
      /(?:from now|starting now|henceforth)\s+/i,
      /(?:roleplay|role-?play)\s+as/i,
    ],
  },
  {
    name: "instruction_overwrite",
    weight: 0.25,
    severity: "critical",
    patterns: [
      /(?:actual|real|true|correct)\s+(?:instructions?|task|purpose)/i,
      /(?:original|underlying)\s+(?:purpose|goal|objective)/i,
      /(?:instead|rather)\s+(?:you should|you must|do this)/i,
      /(?:updated|new|revised|corrected)\s+(?:instructions?|guidelines?|rules?)/i,
    ],
  },
  {
    name: "boundary_escape",
    weight: 0.20,
    severity: "high",
    patterns: [
      /(?:end|close|terminate)\s+(?:the\s+)?(?:system|assistant|user)\s+(?:prompt|message|section)/i,
      /(?:breaking|escaping|leaving)\s+(?:the\s+)?(?:context|sandbox|restrictions)/i,
      /(?:outside|beyond|above)\s+(?:your|the)\s+(?:context|scope|boundaries)/i,
    ],
  },
  {
    name: "social_engineering",
    weight: 0.15,
    severity: "medium",
    patterns: [
      /(?:trust me|believe me|i promise)\s/i,
      /(?:don'?t (?:tell|mention|reveal|share)|keep (?:this|it) (?:secret|private|between us))/i,
      /(?:only you can|you'?re the only one|special exception)/i,
      /(?:testing|debugging|auditing)\s+(?:your|the)\s+(?:safety|security|filters?)/i,
    ],
  },
  {
    name: "encoding_obfuscation",
    weight: 0.10,
    severity: "medium",
    patterns: [
      /(?:encode|decode|convert|translate)\s+(?:this|the following|it)\s+(?:to|from|in|into)\s+(?:base64|hex|binary|rot13)/i,
      /(?:spell|write)\s+(?:it|this)\s+(?:backwards?|reversed?|in reverse)/i,
      /(?:pig latin|caesar cipher|rot\d+)/i,
    ],
  },
];

export function detectSemantic(input: string): DetectionResult {
  let totalScore = 0;
  let highestSeverity: Severity = "low";
  let topSignal: string | undefined;
  let topWeight = 0;

  const severityRank: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1 };

  for (const signal of SIGNALS) {
    let matched = false;
    for (const pattern of signal.patterns) {
      if (pattern.test(input)) {
        matched = true;
        break;
      }
    }
    if (matched) {
      totalScore += signal.weight;
      if (signal.weight > topWeight) {
        topWeight = signal.weight;
        topSignal = signal.name;
      }
      if (severityRank[signal.severity] > severityRank[highestSeverity]) {
        highestSeverity = signal.severity;
      }
    }
  }

  const flagged = totalScore >= 0.20;

  return {
    layer: "semantic",
    flagged,
    severity: highestSeverity,
    confidence: Math.min(1, totalScore),
    patternName: topSignal,
    detail: flagged ? `Anomaly score: ${totalScore.toFixed(2)}` : undefined,
  };
}
