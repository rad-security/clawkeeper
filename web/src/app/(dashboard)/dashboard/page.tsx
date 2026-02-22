import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/get-org-id";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SecurityGradeCard } from "@/components/dashboard/SecurityGradeCard";
import { OnboardingFlow } from "@/components/dashboard/OnboardingFlow";
import { Monitor, Shield, ShieldCheck, AlertTriangle, Sparkles, Lock, Gift } from "lucide-react";
import { UpgradeBanner } from "@/components/dashboard/UpgradeBanner";
import { isPaidPlan } from "@/lib/tier";
import Link from "next/link";
import { ReferralSection } from "@/components/settings/ReferralSection";

export default async function DashboardPage() {
  const supabase = await createClient();
  const orgId = await getOrgId(supabase);

  // Parallel queries
  const [hostsRes, recentScansRes, insightsCountRes, orgRes, shieldActiveRes, referralsRes] = await Promise.all([
    supabase
      .from("hosts")
      .select("id, hostname, last_grade, last_score, last_scan_at, platform, shield_active")
      .eq("org_id", orgId)
      .order("last_scan_at", { ascending: false }),
    supabase
      .from("scans")
      .select("id, score, grade, scanned_at, host_id, hosts(hostname)")
      .eq("org_id", orgId)
      .order("scanned_at", { ascending: false })
      .limit(5),
    supabase
      .from("insights")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("is_resolved", false),
    supabase.from("organizations").select("plan").eq("id", orgId).single(),
    supabase
      .from("hosts")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("shield_active", true),
    supabase
      .from("referral_events")
      .select("id, referrer_credits")
      .eq("referrer_org_id", orgId),
  ]);

  const hosts = hostsRes.data || [];
  const recentScans = recentScansRes.data || [];
  const activeInsights = insightsCountRes.count || 0;
  const plan = orgRes.data?.plan || "free";
  const paid = isPaidPlan(plan);
  const shieldActiveCount = shieldActiveRes.count || 0;
  const referralEvents = referralsRes.data || [];
  const referralCount = referralEvents.length;
  const referralCredits = referralEvents.reduce((sum, e) => sum + (e.referrer_credits || 0), 0);

  // No hosts yet — show onboarding wizard
  if (hosts.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            OpenClaw security overview
          </p>
        </div>
        <OnboardingFlow orgId={orgId} />
      </div>
    );
  }

  // Calculate stats
  const totalHosts = hosts.length;
  const avgScore =
    totalHosts > 0
      ? Math.round(
          hosts.reduce((sum, h) => sum + (h.last_score || 0), 0) / totalHosts
        )
      : 0;
  const failingHosts = hosts.filter(
    (h) => h.last_grade === "D" || h.last_grade === "F"
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <Badge variant="outline" className="gap-1.5 text-xs">
            <Gift className="h-3 w-3 text-cyan-400" />
            {referralCount} referral{referralCount === 1 ? "" : "s"} • +{referralCredits} credits
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Organization security overview
        </p>
      </div>

      {/* Upgrade banner for free users */}
      {!paid && <UpgradeBanner />}

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Instances</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHosts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgScore}/100</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Failing
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{failingHosts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Insights</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {paid ? (
              <div className="text-2xl font-bold">{activeInsights}</div>
            ) : (
              <Link href="/upgrade?reason=insights" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                <Lock className="h-3.5 w-3.5" />
                Pro feature
              </Link>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Shield Active</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {paid ? (
              <div className="text-2xl font-bold">{shieldActiveCount}</div>
            ) : (
              <Link href="/upgrade?reason=shield" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                <Lock className="h-3.5 w-3.5" />
                Pro feature
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Grade distribution */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {["A", "B", "C", "D", "F"].map((grade) => {
          const count = hosts.filter((h) => h.last_grade === grade).length;
          return (
            <SecurityGradeCard
              key={grade}
              grade={grade}
              count={count}
              total={totalHosts}
            />
          );
        })}
      </div>

      {/* Recent scans */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Scans</CardTitle>
        </CardHeader>
        <CardContent>
          {recentScans.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No scans yet. Install the agent on an OpenClaw host to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {recentScans.map((scan) => (
                <div
                  key={scan.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <p className="font-medium">
                      {(scan.hosts as unknown as { hostname: string } | null)?.hostname || "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(scan.scanned_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {scan.score}/100
                    </span>
                    <Badge
                      variant={
                        scan.grade === "A" || scan.grade === "B"
                          ? "default"
                          : scan.grade === "C"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {scan.grade}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {recentScans.length > 0 && referralCount === 0 && (
        <Card className="border-cyan-500/20 bg-cyan-500/5">
          <CardContent className="flex items-center justify-between gap-3 py-4">
            <div>
              <p className="text-sm font-medium text-cyan-300">Earn +5 credits per referral</p>
              <p className="text-xs text-cyan-400/80">
                Share your referral link after your first scans to grow your free scan credits.
              </p>
            </div>
            <Link href="/settings#referrals">
              <Badge className="cursor-pointer bg-cyan-500 text-black hover:bg-cyan-400">
                Open referrals
              </Badge>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Viral growth loop: surface referrals in the core dashboard */}
      <ReferralSection />
    </div>
  );
}
