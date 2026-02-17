import { redirect } from "next/navigation";
import { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Returns the authenticated user's org_id.
 * Falls back to admin client creation if the user-scoped query
 * returns nothing (e.g. first request after signup before RLS propagates).
 * Redirects to /login as a last resort.
 */
export async function getOrgId(supabase: SupabaseClient): Promise<string> {
  // Fast path: user-scoped query (relies on RLS)
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .single();

  if (membership) {
    return membership.org_id;
  }

  // Fallback: check auth and create org via admin client
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const admin = createAdminClient();

  // Check if org already exists via admin (bypasses RLS)
  const { data: adminMembership } = await admin
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .single();

  if (adminMembership) {
    return adminMembership.org_id;
  }

  // Create org + membership
  const orgName = (user.email?.split("@")[0] ?? "user") + "'s Org";

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({ name: orgName, plan: "free" })
    .select("id")
    .single();

  if (orgError || !org) {
    redirect("/login");
  }

  await admin.from("org_members").insert({
    org_id: org.id,
    user_id: user.id,
    role: "owner",
  });

  return org.id;
}
