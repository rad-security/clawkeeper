import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
// Legacy alerts route — kept for backwards compatibility but no longer used by the UI

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { name, rule_type, config, org_id: orgId } = body;

  if (!name || !rule_type || !orgId) {
    return NextResponse.json(
      { error: "name, rule_type, and org_id are required" },
      { status: 400 }
    );
  }

  // Check plan
  const [orgRes, ruleCountRes] = await Promise.all([
    supabase.from("organizations").select("plan").eq("id", orgId).single(),
    supabase
      .from("alert_rules")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId),
  ]);

  const plan = (orgRes.data?.plan || "free") as "free" | "pro" | "enterprise";
  const alertRuleLimit = plan === "free" ? 0 : plan === "pro" ? 20 : Infinity;
  if ((ruleCountRes.count || 0) >= alertRuleLimit) {
    return NextResponse.json(
      { error: "Alert rules are a Pro feature" },
      { status: 403 }
    );
  }

  const { data: rule, error } = await supabase
    .from("alert_rules")
    .insert({ org_id: orgId, name, rule_type, config: config || {} })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to create alert rule" },
      { status: 500 }
    );
  }

  return NextResponse.json(rule);
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { id, name, rule_type, config, enabled } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  // Whitelist allowed fields to prevent arbitrary column updates
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (rule_type !== undefined) updates.rule_type = rule_type;
  if (config !== undefined) updates.config = config;
  if (enabled !== undefined) updates.enabled = enabled;

  const { data, error } = await supabase
    .from("alert_rules")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to update alert rule" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { error } = await supabase.from("alert_rules").delete().eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete alert rule" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
