import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canAddAlertRule } from "@/lib/tier";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
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

  const plan = (orgRes.data?.plan || "free") as "free" | "pro";
  if (!canAddAlertRule(plan, ruleCountRes.count || 0)) {
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

  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

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

  const { id } = await request.json();

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
