import { SupabaseClient } from "@supabase/supabase-js";
import { processReferral } from "./referral";

/**
 * Looks up an existing owner membership for the user.
 * Returns the org_id if found, null otherwise.
 */
async function findExistingOrg(
  admin: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data } = await admin
    .from("org_members")
    .select("org_id")
    .eq("user_id", userId)
    .limit(1);
  return data && data.length > 0 ? data[0].org_id : null;
}

/**
 * Guarantees the authenticated user has an organization.
 * If no org_members row exists, creates a new organization + membership
 * using the admin (service-role) client to bypass RLS.
 *
 * Handles race conditions (concurrent requests after email verification)
 * by catching the unique constraint violation and retrying the lookup.
 */
export async function ensureOrganization(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  userId: string,
  userEmail: string,
  userMetadata?: Record<string, unknown>
): Promise<string> {
  // Check for existing membership via admin client (avoids RLS edge cases)
  const existing = await findExistingOrg(admin, userId);
  if (existing) return existing;

  // No org — create one with the admin client
  const orgName = userEmail.split("@")[0] + "'s Org";

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({ name: orgName, plan: "free" })
    .select("id")
    .single();

  if (orgError || !org) {
    // Org creation failed — check if another request already finished the job
    const fallback = await findExistingOrg(admin, userId);
    if (fallback) return fallback;
    throw new Error("Failed to create organization: " + (orgError?.message ?? "unknown"));
  }

  const { error: memberError } = await admin.from("org_members").insert({
    org_id: org.id,
    user_id: userId,
    role: "owner",
  });

  if (memberError) {
    // Clean up orphaned org first (this org has no members)
    await admin.from("organizations").delete().eq("id", org.id);

    if (memberError.code === "23505") {
      // Race condition: another request created a membership between our check
      // and insert. Wait briefly for the winning transaction to commit, then
      // look up the membership it created.
      await new Promise((r) => setTimeout(r, 200));
      const raceWinner = await findExistingOrg(admin, userId);
      if (raceWinner) return raceWinner;

      // One more retry after a longer delay
      await new Promise((r) => setTimeout(r, 500));
      const retried = await findExistingOrg(admin, userId);
      if (retried) return retried;
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
