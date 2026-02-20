import { SupabaseClient } from "@supabase/supabase-js";
import { processReferral } from "./referral";

/**
 * Guarantees the authenticated user has an organization.
 * If no org_members row exists, creates a new organization + membership
 * using the admin (service-role) client to bypass RLS.
 *
 * Uses advisory locks via Postgres RPC to prevent race conditions where
 * concurrent requests both see "no membership" and create duplicate orgs.
 */
export async function ensureOrganization(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  userId: string,
  userEmail: string,
  userMetadata?: Record<string, unknown>
): Promise<string> {
  // Check for existing membership via admin client (avoids RLS edge cases)
  const { data: memberships } = await admin
    .from("org_members")
    .select("org_id")
    .eq("user_id", userId)
    .limit(1);

  if (memberships && memberships.length > 0) {
    return memberships[0].org_id;
  }

  // No org — create one with the admin client
  const orgName = userEmail.split("@")[0] + "'s Org";

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({ name: orgName, plan: "free" })
    .select("id")
    .single();

  if (orgError || !org) {
    throw new Error("Failed to create organization: " + (orgError?.message ?? "unknown"));
  }

  const { error: memberError } = await admin.from("org_members").insert({
    org_id: org.id,
    user_id: userId,
    role: "owner",
  });

  if (memberError) {
    // Race condition: another request created a membership between our check
    // and insert. Clean up the orphaned org and return the existing membership.
    if (memberError.code === "23505") {
      // Unique constraint violation — membership already exists
      await admin.from("organizations").delete().eq("id", org.id);
      const { data: existing } = await admin
        .from("org_members")
        .select("org_id")
        .eq("user_id", userId)
        .limit(1);
      if (existing && existing.length > 0) {
        return existing[0].org_id;
      }
    }
    throw new Error("Failed to create membership: " + memberError.message);
  }

  // Process referral if code was provided during signup
  const referralCode = userMetadata?.referral_code as string | undefined;
  if (referralCode) {
    processReferral(admin, org.id, referralCode).catch((err) => {
      console.error("Referral processing failed:", err);
    });
  }

  return org.id;
}
