import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SecurityGradeCard } from "@/components/dashboard/SecurityGradeCard";
import { OnboardingFlow } from "@/components/dashboard/OnboardingFlow";
import { Monitor, Shield, AlertTriangle, Clock } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Layout guarantees org exists
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .single();

  const orgId = membership!.org_id;

  // Parallel queries
  const [hostsRes, recentScansRes, alertEventsRes, orgRes] = await Promise.all([
    supabase
      .from("hosts")
      .select("id, hostname, last_grade, last_score, last_scan_at, platform")
      .eq("org_id", orgId)
      .order("last_scan_at", { ascending: false }),
    supabase
      .from("scans")
      .select("id, score, grade, scanned_at, host_id, hosts(hostname)")
      .eq("org_id", orgId)
      .order("scanned_at", { ascending: false })
      .limit(5),
    supabase
      .from("alert_events")
      .select("id, message, notified_at")
      .eq("org_id", orgId)
      .order("notified_at", { ascending: false })
      .limit(5),
    supabase.from("organizations").select("plan").eq("id", orgId).single(),
  ]);

  const hosts = hostsRes.data || [];
  const recentScans = recentScansRes.data || [];
  const alertEvents = alertEventsRes.data || [];
  const plan = orgRes.data?.plan || "free";

  // No hosts yet — show onboarding wizard
  if (hosts.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            OpenClaw security overview
            <Badge variant="outline" className="ml-2">
              {plan}
            </Badge>
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
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Organization security overview
          <Badge variant="outline" className="ml-2">
            {plan}
          </Badge>
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <CardTitle className="text-sm font-medium">Recent Alerts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alertEvents.length}</div>
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
    </div>
  );
}
