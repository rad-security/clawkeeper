import { TIER_LIMITS } from "@/types";

export type Plan = "free" | "pro" | "enterprise";

export function getLimits(plan: Plan) {
  return TIER_LIMITS[plan];
}

export function canAddHost(plan: Plan, currentHostCount: number): boolean {
  return currentHostCount < getLimits(plan).hosts;
}

export function canAddApiKey(plan: Plan, currentKeyCount: number): boolean {
  return currentKeyCount < getLimits(plan).api_keys;
}

export function canAddAlertRule(
  plan: Plan,
  currentRuleCount: number
): boolean {
  return currentRuleCount < getLimits(plan).alert_rules;
}

export function getScanRetentionDays(plan: Plan): number {
  return getLimits(plan).scan_history_days;
}

export function canViewFullEvents(plan: Plan): boolean {
  return getLimits(plan).events_visible === -1;
}
