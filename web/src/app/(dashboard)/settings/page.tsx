import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/get-org-id";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApiKeyManager } from "@/components/settings/ApiKeyManager";
import { BillingPortalButton } from "@/components/settings/BillingPortalButton";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { ReferralSection } from "@/components/settings/ReferralSection";
import { CopyCommand } from "@/components/landing/CopyCommand";
import { TIER_LIMITS, type PlanType } from "@/types";
import { isPaidPlan } from "@/lib/tier";
import { CheckCircle2, Bell, Zap } from "lucide-react";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const orgId = await getOrgId(supabase);

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
  const plan = (org?.plan || "free") as PlanType;
  const limits = TIER_LIMITS[plan];
  const hasStripe = !!org?.stripe_customer_id;

  const planLabel = plan === "enterprise" ? "Enterprise" : plan === "pro" ? "Pro" : "Free";
  const planVariant = plan === "free" ? "secondary" as const : "default" as const;

  // Format limit display (-1 means unlimited)
  const fmtLimit = (v: number) => (v === -1 ? "Unlimited" : String(v));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your organization and API keys
        </p>
      </div>

      {/* Post-checkout success banner */}
      {params.upgraded === "true" && (
        <div className="flex items-center gap-3 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-cyan-400" />
          <div>
            <p className="text-sm font-medium text-cyan-300">
              Welcome to Pro!
            </p>
            <p className="text-xs text-cyan-400/70">
              Your upgrade is active. All Pro features are now unlocked.
            </p>
          </div>
        </div>
      )}

      {/* Agent install instructions — first for discoverability */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Installation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Install the Clawkeeper agent on any machine running OpenClaw:
          </p>
          <CopyCommand command="curl -fsSL https://clawkeeper.dev/install.sh | bash" />
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
            <Badge variant={planVariant} className="text-sm">
              {planLabel}
            </Badge>
            {plan === "free" && (
              <Link href="/upgrade">
                <Button size="sm" className="bg-cyan-500 text-black font-medium hover:bg-cyan-400">
                  Upgrade to Pro
                </Button>
              </Link>
            )}
            {hasStripe && plan !== "free" && (
              <BillingPortalButton />
            )}
          </div>

          {/* Usage meters */}
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-md border p-3">
              <span className="text-muted-foreground">Hosts</span>
              <div className="flex items-center gap-2">
                <strong>
                  {hostCount}/{fmtLimit(limits.hosts)}
                </strong>
                {limits.hosts > 0 && (
                  <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-cyan-500 transition-all"
                      style={{
                        width: `${Math.min(100, (hostCount / limits.hosts) * 100)}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <span className="text-muted-foreground">API Keys</span>
              <strong>
                {keys.length}/{fmtLimit(limits.api_keys)}
              </strong>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <span className="text-muted-foreground">Scan History</span>
              <strong>
                {limits.scan_history_days === -1
                  ? "Unlimited"
                  : `${limits.scan_history_days} days`}
              </strong>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <span className="text-muted-foreground">AI Insights</span>
              {limits.insights === 0 ? (
                <Link href="/upgrade" className="text-sm font-semibold text-cyan-400 hover:underline">Upgrade to Pro</Link>
              ) : (
                <strong>Enabled</strong>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referral */}
      <ReferralSection />

      {/* API Keys */}
      <ApiKeyManager orgId={orgId} keys={keys} plan={plan} />

      {/* Notification Settings — Pro/Enterprise only */}
      {isPaidPlan(plan) ? (
        <NotificationSettings />
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Notifications</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Get email and webhook alerts for CVEs, misconfigurations, and grade drops.
              </p>
              <Link href="/upgrade?reason=notifications">
                <Button size="sm" className="gap-1.5">
                  <Zap className="h-3.5 w-3.5" />
                  Upgrade
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
