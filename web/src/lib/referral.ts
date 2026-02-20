import { SupabaseClient } from "@supabase/supabase-js";
import { sendReferralRewardEmail } from "./email";

// Exclude ambiguous characters: 0/O, 1/I
const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  let code = "CK";
  for (let i = 0; i < 6; i++) {
    code += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return code;
}

/**
 * Get or create a referral code for the given org.
 * Returns the active code string.
 */
export async function getOrCreateReferralCode(
  admin: SupabaseClient,
  orgId: string,
  userId: string
): Promise<string> {
  // Check for existing active code
  const { data: existing } = await admin
    .from("referral_codes")
    .select("code")
    .eq("org_id", orgId)
    .eq("is_active", true)
    .limit(1)
    .single();

  if (existing) {
    return existing.code;
  }

  // Generate a unique code (retry on collision)
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const { error } = await admin.from("referral_codes").insert({
      code,
      org_id: orgId,
      user_id: userId,
    });

    if (!error) return code;
    // If unique violation, retry with new code
    if (error.code !== "23505") throw error;
  }

  throw new Error("Failed to generate unique referral code after 5 attempts");
}

/**
 * Validate a referral code. Returns info for display or null if invalid.
 */
export async function validateReferralCode(
  admin: SupabaseClient,
  code: string
): Promise<{ valid: boolean; referrer_name?: string }> {
  const { data } = await admin
    .from("referral_codes")
    .select("id, org_id, is_active, use_count, max_uses")
    .eq("code", code.toUpperCase())
    .eq("is_active", true)
    .single();

  if (!data) return { valid: false };
  if (data.use_count >= data.max_uses) return { valid: false };

  // Get referrer org name
  const { data: org } = await admin
    .from("organizations")
    .select("name")
    .eq("id", data.org_id)
    .single();

  return { valid: true, referrer_name: org?.name };
}

const REFERRER_CREDITS = 5;
const REFEREE_CREDITS = 5;

/**
 * Process a referral after a new org is created.
 * Awards credits to both referrer and referee, records the event.
 */
export async function processReferral(
  admin: SupabaseClient,
  newOrgId: string,
  code: string
): Promise<boolean> {
  const upperCode = code.toUpperCase();

  // Look up the referral code
  const { data: refCode } = await admin
    .from("referral_codes")
    .select("id, org_id, use_count, max_uses, is_active")
    .eq("code", upperCode)
    .eq("is_active", true)
    .single();

  if (!refCode) return false;

  // Anti-abuse: max uses
  if (refCode.use_count >= refCode.max_uses) return false;

  // Anti-abuse: self-referral
  if (refCode.org_id === newOrgId) return false;

  // Anti-abuse: already referred (UNIQUE constraint will also catch this)
  const { data: existingEvent } = await admin
    .from("referral_events")
    .select("id")
    .eq("referee_org_id", newOrgId)
    .single();

  if (existingEvent) return false;

  // Record the event
  const { error: eventError } = await admin.from("referral_events").insert({
    referral_code: upperCode,
    referrer_org_id: refCode.org_id,
    referee_org_id: newOrgId,
    referrer_credits: REFERRER_CREDITS,
    referee_credits: REFEREE_CREDITS,
  });

  if (eventError) {
    // Unique violation means already referred
    if (eventError.code === "23505") return false;
    console.error("Referral event insert error:", eventError);
    return false;
  }

  // Award credits to referee (new user)
  await admin.rpc("increment_credits", {
    p_org_id: newOrgId,
    p_amount: REFEREE_CREDITS,
  });

  // Award credits to referrer
  await admin.rpc("increment_credits", {
    p_org_id: refCode.org_id,
    p_amount: REFERRER_CREDITS,
  });

  // Increment use count
  await admin
    .from("referral_codes")
    .update({ use_count: refCode.use_count + 1 })
    .eq("id", refCode.id);

  // Mark referred_by_code on the new org
  await admin
    .from("organizations")
    .update({ referred_by_code: upperCode })
    .eq("id", newOrgId);

  // Send email notification to referrer (fire-and-forget)
  notifyReferrer(admin, refCode.org_id, REFERRER_CREDITS).catch(() => {});

  return true;
}

async function notifyReferrer(
  admin: SupabaseClient,
  referrerOrgId: string,
  credits: number
) {
  // Get referrer's notification email
  const { data: members } = await admin
    .from("org_members")
    .select("user_id")
    .eq("org_id", referrerOrgId)
    .eq("role", "owner")
    .limit(1);

  if (!members || members.length === 0) return;

  const { data: userData } = await admin.auth.admin.getUserById(members[0].user_id);
  const email = userData?.user?.email;
  if (!email) return;

  await sendReferralRewardEmail({
    to: email,
    credits,
  });
}

/**
 * Get referral stats for the dashboard.
 */
export async function getReferralStats(
  admin: SupabaseClient,
  orgId: string
): Promise<{
  code: string | null;
  total_referrals: number;
  total_credits_earned: number;
}> {
  const { data: codeRow } = await admin
    .from("referral_codes")
    .select("code")
    .eq("org_id", orgId)
    .eq("is_active", true)
    .single();

  const { data: events } = await admin
    .from("referral_events")
    .select("referrer_credits")
    .eq("referrer_org_id", orgId);

  const totalReferrals = events?.length || 0;
  const totalCredits = events?.reduce((sum, e) => sum + e.referrer_credits, 0) || 0;

  return {
    code: codeRow?.code || null,
    total_referrals: totalReferrals,
    total_credits_earned: totalCredits,
  };
}
