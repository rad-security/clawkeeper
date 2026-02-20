import { SupabaseClient } from "@supabase/supabase-js";
import { TIER_LIMITS } from "@/types";
import type { Plan } from "./tier";

const REFILL_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface CreditCheckResult {
  allowed: boolean;
  credits_remaining: number;
  credits_monthly_cap: number;
}

/**
 * Lazy-refill credit check and deduction.
 * If 30 days have passed since last refill, resets balance to monthly cap.
 * Then deducts 1 credit. Returns whether the scan is allowed.
 *
 * Must be called with admin (service-role) client to bypass RLS.
 */
export async function checkAndDeductCredit(
  admin: SupabaseClient,
  orgId: string
): Promise<CreditCheckResult> {
  const { data: org } = await admin
    .from("organizations")
    .select("plan, credits_balance, credits_monthly_cap, credits_last_refill_at")
    .eq("id", orgId)
    .single();

  if (!org) {
    return { allowed: false, credits_remaining: 0, credits_monthly_cap: 0 };
  }

  const plan = (org.plan || "free") as Plan;
  const monthlyCap = TIER_LIMITS[plan].credits_monthly;

  // Enterprise gets unlimited
  if (monthlyCap === -1) {
    return { allowed: true, credits_remaining: -1, credits_monthly_cap: -1 };
  }

  let balance = org.credits_balance;
  const lastRefill = new Date(org.credits_last_refill_at).getTime();
  const now = Date.now();
  const canRollover = TIER_LIMITS[plan].credits_rollover;

  // Lazy refill: reset or rollover balance if 30 days have passed
  if (now - lastRefill >= REFILL_INTERVAL_MS) {
    if (canRollover) {
      // Pro/Enterprise: unused credits roll over, capped at 2x monthly
      balance = Math.min(balance + monthlyCap, monthlyCap * 2);
    } else {
      // Free: reset to monthly cap (no rollover)
      balance = monthlyCap;
    }
    await admin
      .from("organizations")
      .update({
        credits_balance: balance,
        credits_monthly_cap: monthlyCap,
        credits_last_refill_at: new Date().toISOString(),
      })
      .eq("id", orgId);
  }

  // Check if they have credits
  if (balance <= 0) {
    return { allowed: false, credits_remaining: 0, credits_monthly_cap: monthlyCap };
  }

  // Deduct 1 credit
  const newBalance = balance - 1;
  await admin
    .from("organizations")
    .update({ credits_balance: newBalance })
    .eq("id", orgId);

  return {
    allowed: true,
    credits_remaining: newBalance,
    credits_monthly_cap: monthlyCap,
  };
}

/** Get credit balance for display (no deduction). */
export async function getCreditBalance(
  admin: SupabaseClient,
  orgId: string
): Promise<{ credits_remaining: number; credits_monthly_cap: number }> {
  const { data: org } = await admin
    .from("organizations")
    .select("plan, credits_balance, credits_monthly_cap, credits_last_refill_at")
    .eq("id", orgId)
    .single();

  if (!org) {
    return { credits_remaining: 0, credits_monthly_cap: 10 };
  }

  const plan = (org.plan || "free") as Plan;
  const monthlyCap = TIER_LIMITS[plan].credits_monthly;

  if (monthlyCap === -1) {
    return { credits_remaining: -1, credits_monthly_cap: -1 };
  }

  // Check for lazy refill without mutating
  const lastRefill = new Date(org.credits_last_refill_at).getTime();
  if (Date.now() - lastRefill >= REFILL_INTERVAL_MS) {
    const canRollover = TIER_LIMITS[plan].credits_rollover;
    const projected = canRollover
      ? Math.min(org.credits_balance + monthlyCap, monthlyCap * 2)
      : monthlyCap;
    return { credits_remaining: projected, credits_monthly_cap: monthlyCap };
  }

  return { credits_remaining: org.credits_balance, credits_monthly_cap: monthlyCap };
}
