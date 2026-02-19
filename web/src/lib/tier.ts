import { TIER_LIMITS } from "@/types";

export type Plan = "free" | "pro" | "enterprise";

export function getLimits(plan: Plan) {
  return TIER_LIMITS[plan];
}

export function canAddHost(plan: Plan, currentHostCount: number): boolean {
  const limit = getLimits(plan).hosts;
  if (limit === -1) return true;
  return currentHostCount < limit;
}

export function canAddApiKey(plan: Plan, currentKeyCount: number): boolean {
  const limit = getLimits(plan).api_keys;
  if (limit === -1) return true;
  return currentKeyCount < limit;
}

export function canViewInsights(plan: Plan): boolean {
  return plan === "pro" || plan === "enterprise";
}

export function getScanRetentionDays(plan: Plan): number {
  return getLimits(plan).scan_history_days;
}

export function canViewFullEvents(plan: Plan): boolean {
  return getLimits(plan).events_visible === -1;
}

export function getMaxEvents(plan: Plan): number {
  return getLimits(plan).events_visible;
}

export function canViewCVEAudit(plan: Plan): boolean {
  return getLimits(plan).cve_audit;
}

export function canViewScoreTrends(plan: Plan): boolean {
  return getLimits(plan).score_trends;
}

export function isPaidPlan(plan: Plan): boolean {
  return plan === "pro" || plan === "enterprise";
}
