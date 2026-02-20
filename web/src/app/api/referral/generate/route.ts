import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateApiKey, isAuthError } from "@/lib/api-auth";
import { getOrCreateReferralCode } from "@/lib/referral";

export async function POST(request: NextRequest) {
  const admin = createAdminClient();

  // Try API key auth first (for CLI)
  const authResult = await validateApiKey(request);
  if (!isAuthError(authResult)) {
    // API key auth — get user_id from org_members
    const { data: member } = await admin
      .from("org_members")
      .select("user_id")
      .eq("org_id", authResult.org_id)
      .eq("role", "owner")
      .limit(1)
      .single();

    if (!member) {
      return NextResponse.json({ error: "No owner found" }, { status: 404 });
    }

    const code = await getOrCreateReferralCode(admin, authResult.org_id, member.user_id);
    return NextResponse.json({ code, url: `https://clawkeeper.dev/r/${code}` });
  }

  // Try session auth (for dashboard)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .single();

  if (!membership) {
    return NextResponse.json({ error: "No organization" }, { status: 404 });
  }

  try {
    const code = await getOrCreateReferralCode(admin, membership.org_id, user.id);
    return NextResponse.json({ code, url: `https://clawkeeper.dev/r/${code}` });
  } catch (err) {
    console.error("Referral code generation failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Failed to generate code: ${message}` }, { status: 500 });
  }
}
