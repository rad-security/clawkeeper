import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApiKeyManager } from "@/components/settings/ApiKeyManager";
import { TIER_LIMITS } from "@/types";

export default async function SettingsPage() {
  const supabase = await createClient();

  // Layout guarantees org exists
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id, role")
    .single();

  const orgId = membership!.org_id;

  const [orgRes, keysRes, hostCountRes] = await Promise.all([
    supabase.from("organizations").select("*").eq("id", orgId).single(),
    supabase
      .from("api_keys")
      .select("id, name, key_prefix, last_used_at, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false }),
    supabase
      .from("hosts")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId),
  ]);

  const org = orgRes.data;
  const keys = keysRes.data || [];
  const hostCount = hostCountRes.count || 0;
  const plan = (org?.plan || "free") as "free" | "pro";
  const limits = TIER_LIMITS[plan];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your organization and API keys
        </p>
      </div>

      {/* Agent install instructions — first for discoverability */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Installation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Install the Clawkeeper agent on any machine running OpenClaw:
          </p>
          <pre className="overflow-x-auto rounded-md bg-muted p-4 text-sm">
{`curl -fsSL https://clawkeeper.dev/install.sh | bash`}
          </pre>
          <p className="text-sm text-muted-foreground">
            You&apos;ll be prompted for your API key. The agent scans your
            OpenClaw installation hourly and uploads results automatically.
          </p>
        </CardContent>
      </Card>

      {/* Plan info */}
      <Card>
        <CardHeader>
          <CardTitle>Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Badge variant={plan === "pro" ? "default" : "secondary"} className="text-sm">
              {plan === "pro" ? "Pro" : "Free"}
            </Badge>
            {plan === "free" && (
              <p className="text-sm text-muted-foreground">
                Upgrade to Pro for multi-instance monitoring, alerts, and
                extended history.
              </p>
            )}
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              Hosts: <strong>{hostCount}/{limits.hosts}</strong>
            </div>
            <div>
              API Keys: <strong>{keys.length}/{limits.api_keys}</strong>
            </div>
            <div>
              Scan History: <strong>{limits.scan_history_days} days</strong>
            </div>
            <div>
              Alert Rules: <strong>{limits.alert_rules} max</strong>
            </div>
            <div>
              Activity Events:{" "}
              <strong>
                {limits.events_visible === -1
                  ? "Unlimited"
                  : `${limits.events_visible} preview`}
              </strong>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Keys */}
      <ApiKeyManager orgId={orgId} keys={keys} plan={plan} />
    </div>
  );
}
