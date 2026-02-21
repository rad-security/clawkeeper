import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processReferral } from "@/lib/referral";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const code = body.code;
  if (!code || !/^CK[A-Z2-9]{6}$/i.test(code)) {
    return NextResponse.json({ error: "Invalid referral code" }, { status: 400 });
  }

  // Look up the user's org
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .single();

  if (!membership) {
    return NextResponse.json({ error: "No organization found" }, { status: 404 });
  }

  const admin = createAdminClient();

  // Check org doesn't already have a referral applied
  const { data: org } = await admin
    .from("organizations")
    .select("referred_by_code")
    .eq("id", membership.org_id)
    .single();

  if (org?.referred_by_code) {
    return NextResponse.json({ error: "Referral already applied" }, { status: 409 });
  }

  const success = await processReferral(admin, membership.org_id, code);

  if (!success) {
    return NextResponse.json({ error: "Could not apply referral code" }, { status: 422 });
  }

  return NextResponse.json({ ok: true });
}
