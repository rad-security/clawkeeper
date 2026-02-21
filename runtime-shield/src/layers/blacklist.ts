import { DetectionResult } from "../types";
import { DEFAULT_BLACKLIST } from "../config";

/**
 * Layer 4: Blacklist
 * Exact match + Levenshtein fuzzy matching (distance ≤ 2).
 */

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[m][n];
}

export function detectBlacklist(input: string, customBlacklist: string[] = []): DetectionResult {
  const lowerInput = input.toLowerCase();
  const allEntries = [...DEFAULT_BLACKLIST, ...customBlacklist];

  let matchedEntry: string | undefined;
  let isExact = false;

  for (const entry of allEntries) {
    const lowerEntry = entry.toLowerCase();

    // Exact substring match
    if (lowerInput.includes(lowerEntry)) {
      matchedEntry = entry;
      isExact = true;
      break;
    }

    // Fuzzy: check sliding windows of input text
    // Only for shorter entries to avoid false positives
    if (lowerEntry.length >= 8 && lowerEntry.length <= 50) {
      const windowSize = lowerEntry.length;
      for (let i = 0; i <= lowerInput.length - windowSize; i++) {
        const window = lowerInput.slice(i, i + windowSize);
        if (levenshtein(window, lowerEntry) <= 2) {
          matchedEntry = entry;
          break;
        }
      }
      if (matchedEntry) break;
    }
  }

  return {
    layer: "blacklist",
    flagged: !!matchedEntry,
    severity: matchedEntry ? "critical" : "low",
    confidence: isExact ? 1.0 : matchedEntry ? 0.8 : 0,
    patternName: matchedEntry ? `blacklist:${matchedEntry.slice(0, 30)}` : undefined,
    detail: matchedEntry ? `Matched blacklist entry: "${matchedEntry}"${isExact ? " (exact)" : " (fuzzy)"}` : undefined,
  };
}
