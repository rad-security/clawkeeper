import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/get-org-id";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertRuleForm } from "@/components/alerts/AlertRuleForm";
import { AlertHistory } from "@/components/alerts/AlertHistory";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Bell, TrendingDown, ShieldAlert } from "lucide-react";

export default async function AlertsPage() {
  const supabase = await createClient();
  const orgId = await getOrgId(supabase);

  const [orgRes, rulesRes, eventsRes] = await Promise.all([
    supabase.from("organizations").select("plan").eq("id", orgId).single(),
    supabase
      .from("alert_rules")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false }),
    supabase
      .from("alert_events")
      .select("*, hosts(hostname), alert_rules(name)")
      .eq("org_id", orgId)
      .order("notified_at", { ascending: false })
      .limit(50),
  ]);

  const plan = orgRes.data?.plan || "free";
  const rules = rulesRes.data || [];
  const events = eventsRes.data || [];
  const isPro = plan === "pro";

  if (!isPro) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Alerts</h1>
          <p className="text-muted-foreground">
            Get notified when your OpenClaw security posture changes
          </p>
        </div>

        {/* Mock alert preview */}
        <div className="relative">
          <div className="pointer-events-none space-y-3 opacity-50">
            {/* Example: Grade drop alert */}
            <Card>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Grade dropped: B &rarr; D</p>
                  <p className="text-xs text-muted-foreground">
                    jimmys-openclaw &middot; 2 minutes ago
                  </p>
                </div>
                <Badge variant="destructive">Critical</Badge>
              </CardContent>
            </Card>

            {/* Example: Score threshold alert */}
            <Card>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-500/10">
                  <ShieldAlert className="h-5 w-5 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">
                    Credential exposure detected in config
                  </p>
                  <p className="text-xs text-muted-foreground">
                    dev-server-01 &middot; 1 hour ago
                  </p>
                </div>
                <Badge variant="secondary">Warning</Badge>
              </CardContent>
            </Card>

            {/* Example: Check fail alert */}
            <Card>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500/10">
                  <Bell className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">
                    Suspicious skill installed: crypto-wallet-manager
                  </p>
                  <p className="text-xs text-muted-foreground">
                    staging-openclaw &middot; 3 hours ago
                  </p>
                </div>
                <Badge variant="secondary">Warning</Badge>
              </CardContent>
            </Card>
          </div>

          {/* Overlay CTA */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Card className="w-full max-w-md border-primary/50 shadow-lg">
              <CardContent className="py-8 text-center">
                <Bell className="mx-auto mb-3 h-10 w-10 text-primary" />
                <h3 className="text-lg font-semibold">
                  Unlock Smart Alerts
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                  Get email notifications when grades drop, suspicious skills
                  are installed, or credentials are exposed. Up to 20 rules.
                </p>
                <Link href="/upgrade">
                  <Button className="mt-4">Upgrade to Pro</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Alerts</h1>
        <p className="text-muted-foreground">
          Manage alert rules and view notification history
        </p>
      </div>

      {/* Create new rule */}
      <AlertRuleForm orgId={orgId} ruleCount={rules.length} />

      {/* Existing rules */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Rules ({rules.length}/20)</CardTitle>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No alert rules configured. Create one above.
            </p>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <p className="font-medium">{rule.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {rule.rule_type.replace("_", " ")} —{" "}
                      {JSON.stringify(rule.config)}
                    </p>
                  </div>
                  <Badge variant={rule.enabled ? "default" : "secondary"}>
                    {rule.enabled ? "Active" : "Disabled"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert history */}
      <AlertHistory events={events} />
    </div>
  );
}
