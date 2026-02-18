import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Guarantees the authenticated user has an organization.
 * If no org_members row exists, creates a new organization + membership
 * using the admin (service-role) client to bypass RLS.
 */
export async function ensureOrganization(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  userId: string,
  userEmail: string
): Promise<string> {
  // Check for existing membership via user-scoped client
  const { data: memberships } = await supabase
    .from("org_members")
    .select("org_id")
    .limit(1);

  if (memberships && memberships.length > 0) {
    return memberships[0].org_id;
  }

  // No org — create one with the admin client (mirrors handle_new_user trigger)
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
    throw new Error("Failed to create membership: " + memberError.message);
  }

  return org.id;
}
