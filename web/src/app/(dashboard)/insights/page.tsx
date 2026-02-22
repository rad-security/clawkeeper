import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/get-org-id";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InsightCard } from "@/components/insights/InsightCard";
import { InsightFilters } from "@/components/insights/InsightFilters";
import { InsightStats } from "@/components/insights/InsightStats";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import type { Insight, InsightSeverity } from "@/types";

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ severity?: string; resolved?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const orgId = await getOrgId(supabase);

  const { data: org } = await supabase
    .from("organizations")
    .select("plan")
    .eq("id", orgId)
    .single();

  const plan = org?.plan || "free";
  const hasAccess = plan === "pro" || plan === "enterprise";

  if (!hasAccess) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Insights</h1>
          <p className="text-muted-foreground">
            AI-powered security analysis of your fleet
          </p>
        </div>

        {/* Blurred mock preview */}
        <div className="relative">
          <div className="pointer-events-none space-y-4 opacity-50 blur-[2px]">
            {/* Mock stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {[
                { label: "CVEs", count: 3, color: "text-violet-500" },
                { label: "Critical", count: 2, color: "text-red-500" },
                { label: "High", count: 5, color: "text-orange-500" },
                { label: "Medium", count: 8, color: "text-yellow-500" },
                { label: "Resolved", count: 12, color: "text-emerald-500" },
              ].map((s) => (
                <Card key={s.label}>
                  <CardContent className="pt-5 pb-4">
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Mock insight cards */}
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="space-y-2 pt-5 pb-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-red-500/10 text-red-500 text-[10px]">CRITICAL</Badge>
                  <span className="font-medium">Credential Exposure Detected</span>
                </div>
                <p className="text-sm text-muted-foreground">API key found in configuration on 2 hosts</p>
                <div className="flex gap-1.5">
                  <Badge variant="secondary" className="text-xs">e2e-macbook.local</Badge>
                  <Badge variant="secondary" className="text-xs">staging-server</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="space-y-2 pt-5 pb-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-orange-500/10 text-orange-500 text-[10px]">HIGH</Badge>
                  <span className="font-medium">CVE-2026-25253: Vulnerability Detected</span>
                </div>
                <p className="text-sm text-muted-foreground">HIGH (8.8): 1-Click RCE via Authentication Token Exfiltration</p>
                <div className="flex gap-1.5">
                  <Badge variant="outline" className="text-xs border-violet-500/30 text-violet-400">npm/clawdbot</Badge>
                  <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">Fix: &gt;= 2026.1.29</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-yellow-500">
              <CardContent className="space-y-2 pt-5 pb-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 text-[10px]">MEDIUM</Badge>
                  <span className="font-medium">Fleet Drift: Firewall Status</span>
                </div>
                <p className="text-sm text-muted-foreground">Firewall is enabled on 3/4 hosts but disabled on dev-laptop.</p>
              </CardContent>
            </Card>
          </div>

          {/* Overlay CTA */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Card className="w-full max-w-md border-primary/50 shadow-lg">
              <CardContent className="py-8 text-center">
                <Sparkles className="mx-auto mb-3 h-10 w-10 text-primary" />
                <h3 className="text-lg font-semibold">
                  Unlock AI Security Insights
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                  Automated fleet analysis, CVE detection, remediation guidance,
                  and email & webhook alerts — like having a security analyst
                  watching your infrastructure 24/7.
                </p>
                <Link href="/upgrade?reason=insights">
                  <Button className="mt-4">Upgrade to Pro</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Build query for insights
  const showResolved = params.resolved === "true";
  const severityFilter = params.severity;
  const isCVEFilter = severityFilter === "cve";

  // Fetch counts for stats
  const [unresolvedRes, resolvedCountRes] = await Promise.all([
    supabase
      .from("insights")
      .select("id, severity, insight_type")
      .eq("org_id", orgId)
      .eq("is_resolved", false),
    supabase
      .from("insights")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("is_resolved", true),
  ]);

  const unresolved = (unresolvedRes.data || []) as { id: string; severity: string; insight_type: string }[];
  const resolvedCount = resolvedCountRes.count || 0;

  const criticalCount = unresolved.filter((i) => i.severity === "critical").length;
  const highCount = unresolved.filter((i) => i.severity === "high").length;
  const mediumCount = unresolved.filter(
    (i) => i.severity === "medium" || i.severity === "low" || i.severity === "info"
  ).length;
  const cveCount = unresolved.filter((i) => i.insight_type === "cve_vulnerability").length;

  // Fetch insights for display
  let query = supabase
    .from("insights")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!showResolved) {
    query = query.eq("is_resolved", false);
  }
  if (isCVEFilter) {
    query = query.eq("insight_type", "cve_vulnerability");
  } else if (severityFilter) {
    query = query.eq("severity", severityFilter as InsightSeverity);
  }

  const { data: insights } = await query;
  const insightList = (insights || []) as Insight[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Insights</h1>
        <p className="text-muted-foreground">
          AI-powered security analysis of your fleet
        </p>
      </div>

      <InsightStats
        critical={criticalCount}
        high={highCount}
        medium={mediumCount}
        resolved={resolvedCount}
        cves={cveCount}
      />

      <InsightFilters />

      {insightList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">
              {showResolved
                ? "No resolved insights yet."
                : "No active insights — your fleet is looking good!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {insightList.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}
    </div>
  );
}
