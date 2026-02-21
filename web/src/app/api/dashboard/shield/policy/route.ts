import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/get-org-id";
import { canUseRuntimeShield } from "@/lib/tier";
import type { PlanType, ShieldSecurityLevel } from "@/types";

const DEFAULT_POLICY = {
  security_level: "strict" as ShieldSecurityLevel,
  custom_blacklist: [] as string[],
  trusted_sources: [] as string[],
  entropy_threshold: 4.5,
  max_input_length: 10000,
  auto_block: true,
};

const VALID_LEVELS = new Set(["paranoid", "strict", "moderate", "minimal"]);

export async function GET() {
  const supabase = await createClient();
  const orgId = await getOrgId(supabase);

  const { data: org } = await supabase
    .from("organizations")
    .select("plan")
    .eq("id", orgId)
    .single();

  const plan = (org?.plan || "free") as PlanType;
  if (!canUseRuntimeShield(plan)) {
    return NextResponse.json({ error: "Pro feature" }, { status: 403 });
  }

  const { data } = await supabase
    .from("shield_policies")
    .select("*")
    .eq("org_id", orgId)
    .single();

  return NextResponse.json(data || { ...DEFAULT_POLICY, org_id: orgId });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const orgId = await getOrgId(supabase);

  const { data: org } = await supabase
    .from("organizations")
    .select("plan")
    .eq("id", orgId)
    .single();

  const plan = (org?.plan || "free") as PlanType;
  if (!canUseRuntimeShield(plan)) {
    return NextResponse.json({ error: "Pro feature" }, { status: 403 });
  }

  const body = await request.json();

  // Validate
  if (body.security_level && !VALID_LEVELS.has(body.security_level)) {
    return NextResponse.json({ error: "Invalid security_level" }, { status: 400 });
  }

  if (body.entropy_threshold !== undefined) {
    const t = Number(body.entropy_threshold);
    if (isNaN(t) || t < 1 || t > 10) {
      return NextResponse.json({ error: "entropy_threshold must be between 1 and 10" }, { status: 400 });
    }
  }

  if (body.max_input_length !== undefined) {
    const l = Number(body.max_input_length);
    if (isNaN(l) || l < 100 || l > 100000) {
      return NextResponse.json({ error: "max_input_length must be between 100 and 100000" }, { status: 400 });
    }
  }

  const policy = {
    org_id: orgId,
    security_level: body.security_level || DEFAULT_POLICY.security_level,
    custom_blacklist: Array.isArray(body.custom_blacklist) ? body.custom_blacklist.filter((s: unknown) => typeof s === "string") : DEFAULT_POLICY.custom_blacklist,
    trusted_sources: Array.isArray(body.trusted_sources) ? body.trusted_sources.filter((s: unknown) => typeof s === "string") : DEFAULT_POLICY.trusted_sources,
    entropy_threshold: Number(body.entropy_threshold) || DEFAULT_POLICY.entropy_threshold,
    max_input_length: Number(body.max_input_length) || DEFAULT_POLICY.max_input_length,
    auto_block: body.auto_block !== false,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("shield_policies")
    .upsert(policy, { onConflict: "org_id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
