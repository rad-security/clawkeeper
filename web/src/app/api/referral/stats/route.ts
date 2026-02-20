import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getReferralStats } from "@/lib/referral";

export async function GET() {
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

  const admin = createAdminClient();
  const stats = await getReferralStats(admin, membership.org_id);

  return NextResponse.json(stats);
}
