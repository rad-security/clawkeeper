import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/get-org-id";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChecksTable } from "@/components/dashboard/ChecksTable";
import { DeploymentBadge } from "@/components/dashboard/DeploymentBadge";
import { GradeHistoryChart } from "@/components/dashboard/GradeHistoryChart";
import { ZoneCard } from "@/components/dashboard/ZoneCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EventFeed } from "@/components/activity/EventFeed";
import { analyzeHost, PHASE_LABELS, PHASE_ORDER } from "@/lib/host-analysis";
import { getScanRetentionDays, getMaxEvents, isPaidPlan, canUseRuntimeShield } from "@/lib/tier";
import { Lock, TrendingUp, Activity } from "lucide-react";
import { ShieldStatusCard } from "@/components/shield/ShieldStatusCard";
import { ShareScanCard } from "@/components/dashboard/ShareScanCard";
import type { Event, PlanType } from "@/types";

function ProFeatureGate({ title, description, icon: Icon }: { title: string; description: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card className="border-dashed border-muted-foreground/30">
      <CardContent className="py-8 text-center">
        <Icon className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
        <h3 className="font-medium text-muted-foreground">{title}</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground/70">{description}</p>
        <Link href="/upgrade">
          <Button size="sm" className="mt-3">
            <Lock className="mr-1.5 h-3.5 w-3.5" />
            Upgrade to Pro
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export default async function HostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const orgId = await getOrgId(supabase);

  // Get org plan
  const { data: org } = await supabase
    .from("organizations")
    .select("plan")
    .eq("id", orgId)
    .single();

  const plan = (org?.plan || "free") as PlanType;
  const paid = isPaidPlan(plan);
  const retentionDays = getScanRetentionDays(plan);
  const maxEvents = getMaxEvents(plan);
  const eventLimit = maxEvents === -1 ? 20 : Math.min(maxEvents, 20);

  const { data: host } = await supabase
    .from("hosts")
    .select("*")
    .eq("id", id)
    .single();

  if (!host) notFound();

  // Enforce scan retention: only fetch scans within plan's retention window
  const retentionDate = retentionDays === -1
    ? undefined
    : new Date(Date.now() - retentionDays * 86_400_000).toISOString();

  let scansQuery = supabase
    .from("scans")
    .select("id, score, grade, scanned_at, passed, failed, fixed, skipped")
    .eq("host_id", id)
    .order("scanned_at", { ascending: true })
    .limit(90);

  if (retentionDate) {
    scansQuery = scansQuery.gte("scanned_at", retentionDate);
  }

  const oneDayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const [{ data: scans }, { data: hostEvents }, shieldBlocksRes] = await Promise.all([
    scansQuery,
    supabase
      .from("events")
      .select("*, hosts(hostname)")
      .eq("host_id", id)
      .order("created_at", { ascending: false })
      .limit(eventLimit),
    canUseRuntimeShield(plan)
      ? supabase
          .from("shield_events")
          .select("id", { count: "exact", head: true })
          .eq("host_id", id)
          .eq("verdict", "blocked")
          .gte("created_at", oneDayAgo)
      : Promise.resolve({ count: 0 }),
  ]);
  const recentBlocks = shieldBlocksRes.count || 0;

  // Get latest scan checks
  const latestScan = scans && scans.length > 0 ? scans[scans.length - 1] : null;

  let checks: { id: string; status: string; check_name: string; detail: string | null }[] = [];
  if (latestScan) {
    const { data } = await supabase
      .from("scan_checks")
      .select("id, status, check_name, detail")
      .eq("scan_id", latestScan.id)
      .order("status", { ascending: true });
    checks = data || [];
  }

  // Run analysis
  const analysis = analyzeHost(checks);

  // Determine which phase tabs have checks
  const activePhaseTabs = PHASE_ORDER.filter(
    (phase) => analysis.phaseGroups[phase].length > 0
  );
  const defaultTab = activePhaseTabs[0] || "security_audit";

  const gradeVariant = (grade: string | null) => {
    if (grade === "A" || grade === "B") return "default" as const;
    if (grade === "C") return "secondary" as const;
    return "destructive" as const;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{host.hostname}</h1>
          <p className="text-muted-foreground">
            {host.platform || "Unknown platform"}
            {host.os_version ? ` ${host.os_version}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DeploymentBadge
            deployment={analysis.deployment}
            detail={analysis.deploymentDetail}
          />
          {host.last_grade && (
            <Badge variant={gradeVariant(host.last_grade)} className="text-lg px-3 py-1">
              Grade {host.last_grade}
            </Badge>
          )}
        </div>
        {latestScan && (
          <div className="ml-auto">
            <ShareScanCard
              scanId={latestScan.id}
              grade={latestScan.grade}
              score={latestScan.score}
            />
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {host.last_score !== null ? `${host.last_score}/100` : "—"}
            </div>
            <p className="text-xs text-muted-foreground">Current Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{scans?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Scans {!paid && "(last 7 days)"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{host.agent_version || "—"}</div>
            <p className="text-xs text-muted-foreground">Agent Version</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {host.last_scan_at
                ? new Date(host.last_scan_at).toLocaleDateString()
                : "Never"}
            </div>
            <p className="text-xs text-muted-foreground">Last Scan</p>
          </CardContent>
        </Card>
      </div>

      {/* Security Zones */}
      {analysis.hasOpenClawChecks && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Security Zones</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {analysis.zones.map((zone) => (
              <ZoneCard key={zone.zone} zone={zone} />
            ))}
          </div>
        </div>
      )}

      {/* Shield Status — Pro only */}
      {canUseRuntimeShield(plan) && (
        <ShieldStatusCard
          shieldActive={host.shield_active}
          shieldLastSeenAt={host.shield_last_seen_at}
          recentBlocks={recentBlocks}
          hostId={id}
        />
      )}

      {/* Grade history chart — Pro only */}
      {paid ? (
        scans && scans.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Score History</CardTitle>
            </CardHeader>
            <CardContent>
              <GradeHistoryChart
                data={scans.map((s) => ({
                  date: s.scanned_at,
                  score: s.score,
                  grade: s.grade,
                }))}
              />
            </CardContent>
          </Card>
        )
      ) : (
        <ProFeatureGate
          icon={TrendingUp}
          title="Score Trends"
          description="Track how your security score changes over time with interactive charts. Upgrade to Pro for trend analysis."
        />
      )}

      {/* All Checks by Category */}
      {checks.length > 0 && activePhaseTabs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Checks by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={defaultTab}>
              <TabsList className="flex-wrap">
                {activePhaseTabs.map((phase) => (
                  <TabsTrigger key={phase} value={phase}>
                    {PHASE_LABELS[phase]}
                    <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                      {analysis.phaseGroups[phase].length}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
              {activePhaseTabs.map((phase) => (
                <TabsContent key={phase} value={phase}>
                  <ChecksTable checks={analysis.phaseGroups[phase]} />
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Scan history table */}
      {scans && scans.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Scan History</CardTitle>
              {!paid && (
                <span className="text-xs text-muted-foreground">Last 7 days</span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Pass</TableHead>
                  <TableHead>Fail</TableHead>
                  <TableHead>Fixed</TableHead>
                  <TableHead>Skipped</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...scans].reverse().map((scan) => (
                  <TableRow key={scan.id}>
                    <TableCell className="text-muted-foreground">
                      {new Date(scan.scanned_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={gradeVariant(scan.grade)}>
                        {scan.grade}
                      </Badge>
                    </TableCell>
                    <TableCell>{scan.score}/100</TableCell>
                    <TableCell>{scan.passed}</TableCell>
                    <TableCell>{scan.failed}</TableCell>
                    <TableCell>{scan.fixed}</TableCell>
                    <TableCell>{scan.skipped}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!paid && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                <Link href="/upgrade" className="text-primary hover:underline">
                  Upgrade to Pro
                </Link>
                {" "}for 365 days of scan history
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Activity — Pro only */}
      {paid ? (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <EventFeed
              initialEvents={(hostEvents || []) as Event[]}
              hostId={id}
              maxEvents={20}
              showLoadMore={false}
            />
          </CardContent>
        </Card>
      ) : (
        <ProFeatureGate
          icon={Activity}
          title="Activity Stream"
          description="See every scan, grade change, and agent event for this host. Upgrade to Pro for full activity history."
        />
      )}
    </div>
  );
}
