import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAddApiKey } from "@/lib/tier";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, org_id: orgId } = body;

  if (!name || !orgId) {
    return NextResponse.json(
      { error: "name and org_id are required" },
      { status: 400 }
    );
  }

  // Verify membership
  const { data: member } = await supabase
    .from("org_members")
    .select("id")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .single();

  if (!member) {
    return NextResponse.json({ error: "Not a member of this org" }, { status: 403 });
  }

  // Check plan limits
  const admin = createAdminClient();

  const [orgRes, keyCountRes] = await Promise.all([
    admin.from("organizations").select("plan").eq("id", orgId).single(),
    admin
      .from("api_keys")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId),
  ]);

  const plan = (orgRes.data?.plan || "free") as "free" | "pro";
  const keyCount = keyCountRes.count || 0;

  if (!canAddApiKey(plan, keyCount)) {
    return NextResponse.json(
      { error: `API key limit reached (${plan} plan)` },
      { status: 403 }
    );
  }

  // Generate key
  const rawKey = `ck_live_${crypto.randomBytes(24).toString("hex")}`;
  const keyPrefix = rawKey.slice(0, 16);
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  const { error: insertError } = await admin.from("api_keys").insert({
    org_id: orgId,
    name,
    key_prefix: keyPrefix,
    key_hash: keyHash,
  });

  if (insertError) {
    return NextResponse.json(
      { error: "Failed to create API key" },
      { status: 500 }
    );
  }

  return NextResponse.json({ key: rawKey, prefix: keyPrefix });
}
