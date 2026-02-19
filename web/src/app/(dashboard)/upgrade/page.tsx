import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/get-org-id";
import { TIER_LIMITS, type PlanType } from "@/types";
import { UpgradeContent } from "@/components/upgrade/UpgradeContent";

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const orgId = await getOrgId(supabase);

  const [orgRes, hostCountRes, keyCountRes] = await Promise.all([
    supabase.from("organizations").select("plan").eq("id", orgId).single(),
    supabase
      .from("hosts")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId),
    supabase
      .from("api_keys")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId),
  ]);

  const plan = (orgRes.data?.plan || "free") as PlanType;
  const hostCount = hostCountRes.count || 0;
  const keyCount = keyCountRes.count || 0;
  const limits = TIER_LIMITS[plan];

  return (
    <UpgradeContent
      plan={plan}
      hostCount={hostCount}
      keyCount={keyCount}
      limits={limits}
      reason={params.reason}
    />
  );
}
