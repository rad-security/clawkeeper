import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/get-org-id";
import { isPaidPlan, type Plan } from "@/lib/tier";

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

  const { id } = body;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const orgId = await getOrgId(supabase);

  // Check plan — insights are a Pro feature
  const { data: org } = await supabase
    .from("organizations")
    .select("plan")
    .eq("id", orgId)
    .single();

  const plan = (org?.plan || "free") as Plan;
  if (!isPaidPlan(plan)) {
    return NextResponse.json(
      { error: "Insights are a Pro feature" },
      { status: 403 }
    );
  }

  const { error } = await supabase
    .from("insights")
    .update({
      is_resolved: true,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("org_id", orgId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to resolve insight" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
