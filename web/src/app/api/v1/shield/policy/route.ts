import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateApiKey, isAuthError } from "@/lib/api-auth";
import { canUseRuntimeShield } from "@/lib/tier";

const DEFAULT_POLICY = {
  security_level: "strict",
  custom_blacklist: [] as string[],
  trusted_sources: [] as string[],
  entropy_threshold: 4.5,
  max_input_length: 10000,
  auto_block: true,
};

export async function GET(request: NextRequest) {
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

  const { data: policy } = await supabase
    .from("shield_policies")
    .select("security_level, custom_blacklist, trusted_sources, entropy_threshold, max_input_length, auto_block")
    .eq("org_id", orgId)
    .single();

  return NextResponse.json(policy || DEFAULT_POLICY);
}
