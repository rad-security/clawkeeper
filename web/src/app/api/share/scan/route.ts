import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

export async function POST(request: NextRequest) {
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

  let body: { scan_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.scan_id) {
    return NextResponse.json({ error: "scan_id required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify scan belongs to this org
  const { data: scan } = await admin
    .from("scans")
    .select("id, org_id")
    .eq("id", body.scan_id)
    .eq("org_id", membership.org_id)
    .single();

  if (!scan) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }

  // Check if already shared
  const { data: existing } = await admin
    .from("shared_scans")
    .select("share_code")
    .eq("scan_id", body.scan_id)
    .single();

  if (existing) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://clawkeeper.dev";
    return NextResponse.json({
      share_code: existing.share_code,
      share_url: `${appUrl}/s/${existing.share_code}`,
    });
  }

  // Generate unique share code
  const shareCode = crypto.randomBytes(6).toString("base64url");

  const { error } = await admin.from("shared_scans").insert({
    scan_id: body.scan_id,
    org_id: membership.org_id,
    share_code: shareCode,
  });

  if (error) {
    return NextResponse.json({ error: "Failed to create share" }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://clawkeeper.dev";
  return NextResponse.json({
    share_code: shareCode,
    share_url: `${appUrl}/s/${shareCode}`,
  });
}
