import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateApiKey, isAuthError } from "@/lib/api-auth";
import { canUseRuntimeShield } from "@/lib/tier";

export async function POST(request: NextRequest) {
  const authResult = await validateApiKey(request);
  if (isAuthError(authResult)) return authResult;

  const supabase = createAdminClient();
  const orgId = authResult.org_id;

  // Check plan
  const { data: org } = await supabase
    .from("organizations")
    .select("plan")
    .eq("id", orgId)
    .single();

  const plan = (org?.plan || "free") as "free" | "pro" | "enterprise";
  if (!canUseRuntimeShield(plan)) {
    return NextResponse.json(
      { error: "Runtime Shield is a Pro feature. Upgrade at https://clawkeeper.dev/upgrade" },
      { status: 403 }
    );
  }

  // Parse body
  let body: { hostname?: string; shield_version?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.hostname || typeof body.hostname !== "string") {
    return NextResponse.json({ error: "hostname is required" }, { status: 400 });
  }

  // Update host shield status
  const { error } = await supabase
    .from("hosts")
    .update({
      shield_active: true,
      shield_last_seen_at: new Date().toISOString(),
    })
    .eq("org_id", orgId)
    .eq("hostname", body.hostname);

  if (error) {
    console.error("[shield] Heartbeat update error:", error);
    return NextResponse.json({ error: "Failed to update heartbeat" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
