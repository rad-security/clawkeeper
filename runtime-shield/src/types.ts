export type DetectionLayer = "regex" | "semantic" | "context_integrity" | "blacklist" | "entropy_heuristic";
export type Verdict = "blocked" | "warned" | "passed";
export type Severity = "critical" | "high" | "medium" | "low";
export type SecurityLevel = "paranoid" | "strict" | "moderate" | "minimal";

export interface DetectionResult {
  layer: DetectionLayer;
  flagged: boolean;
  severity: Severity;
  confidence: number;
  patternName?: string;
  detail?: string;
}

export interface ShieldVerdict {
  verdict: Verdict;
  severity: Severity;
  detections: DetectionResult[];
  confidence: number;
  inputHash: string;
  inputLength: number;
}

export interface ShieldConfig {
  apiKey: string;
  apiUrl: string;
  securityLevel: SecurityLevel;
  logDir: string;
  hostname: string;
  customBlacklist: string[];
  trustedSources: string[];
  entropyThreshold: number;
  maxInputLength: number;
  autoBlock: boolean;
}

export interface ShieldEventPayload {
  hostname: string;
  detection_layer: DetectionLayer;
  verdict: Verdict;
  severity: Severity;
  security_level: string;
  pattern_name?: string;
  input_hash: string;
  input_length?: number;
  confidence?: number;
  context?: Record<string, unknown>;
}

export interface ShieldStats {
  totalChecked: number;
  blocked: number;
  warned: number;
  passed: number;
  byLayer: Record<DetectionLayer, number>;
}
