import { DetectionResult, Severity } from "../types";

/**
 * Layer 5: Entropy Heuristic
 * Shannon entropy, base64 detection, context flooding.
 */

function shannonEntropy(str: string): number {
  if (str.length === 0) return 0;

  const freq = new Map<string, number>();
  for (const char of str) {
    freq.set(char, (freq.get(char) || 0) + 1);
  }

  let entropy = 0;
  const len = str.length;
  for (const count of freq.values()) {
    const p = count / len;
    if (p > 0) entropy -= p * Math.log2(p);
  }

  return entropy;
}

function isLikelyBase64(str: string): boolean {
  // Look for large base64 blocks
  const b64Regex = /[A-Za-z0-9+/]{64,}={0,2}/;
  return b64Regex.test(str);
}

function hasContextFlooding(str: string, maxLength: number): boolean {
  return str.length > maxLength;
}

export function detectEntropy(
  input: string,
  threshold: number = 4.5,
  maxInputLength: number = 10000
): DetectionResult {
  const flags: string[] = [];
  let highestSeverity: Severity = "low";
  let confidence = 0;

  // Shannon entropy check
  const entropy = shannonEntropy(input);
  if (entropy > threshold) {
    flags.push(`high_entropy:${entropy.toFixed(2)}`);
    highestSeverity = "medium";
    confidence = Math.max(confidence, Math.min(1, (entropy - threshold) / 2));
  }

  // Base64 block detection
  if (isLikelyBase64(input)) {
    flags.push("base64_block");
    highestSeverity = "medium";
    confidence = Math.max(confidence, 0.7);
  }

  // Context flooding
  if (hasContextFlooding(input, maxInputLength)) {
    flags.push(`context_flooding:${input.length}`);
    if (input.length > maxInputLength * 2) {
      highestSeverity = "high";
      confidence = Math.max(confidence, 0.9);
    } else {
      highestSeverity = highestSeverity === "low" ? "medium" : highestSeverity;
      confidence = Math.max(confidence, 0.6);
    }
  }

  // Repetition detection (many repeated chars/patterns = padding attack)
  const uniqueChars = new Set(input).size;
  if (input.length > 200 && uniqueChars < 10) {
    flags.push("low_diversity");
    highestSeverity = "medium";
    confidence = Math.max(confidence, 0.65);
  }

  const flagged = flags.length > 0;

  return {
    layer: "entropy_heuristic",
    flagged,
    severity: highestSeverity,
    confidence,
    patternName: flags[0],
    detail: flagged ? `Flags: ${flags.join(", ")}` : undefined,
  };
}
