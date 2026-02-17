import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckStatusBadge } from "@/components/dashboard/CheckStatusBadge";
import { GradeHistoryChart } from "@/components/dashboard/GradeHistoryChart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EventFeed } from "@/components/activity/EventFeed";
import type { Event } from "@/types";

export default async function HostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: host } = await supabase
    .from("hosts")
    .select("*")
    .eq("id", id)
    .single();

  if (!host) notFound();

  // Get scans for grade history chart + recent events
  const [{ data: scans }, { data: hostEvents }] = await Promise.all([
    supabase
      .from("scans")
      .select("id, score, grade, scanned_at, passed, failed, fixed, skipped")
      .eq("host_id", id)
      .order("scanned_at", { ascending: true })
      .limit(90),
    supabase
      .from("events")
      .select("*, hosts(hostname)")
      .eq("host_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

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

  const gradeVariant = (grade: string | null) => {
    if (grade === "A" || grade === "B") return "default" as const;
    if (grade === "C") return "secondary" as const;
    return "destructive" as const;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">{host.hostname}</h1>
          <p className="text-muted-foreground">
            {host.platform || "Unknown platform"}
            {host.os_version ? ` ${host.os_version}` : ""}
          </p>
        </div>
        {host.last_grade && (
          <Badge variant={gradeVariant(host.last_grade)} className="text-lg px-3 py-1">
            Grade {host.last_grade}
          </Badge>
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
            <p className="text-xs text-muted-foreground">Total Scans</p>
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

      {/* Grade history chart */}
      {scans && scans.length > 1 && (
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
      )}

      {/* Latest scan checks */}
      <Card>
        <CardHeader>
          <CardTitle>Latest Scan Checks</CardTitle>
        </CardHeader>
        <CardContent>
          {checks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No check data available.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Check</TableHead>
                  <TableHead>Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checks.map((check) => (
                  <TableRow key={check.id}>
                    <TableCell>
                      <CheckStatusBadge status={check.status} />
                    </TableCell>
                    <TableCell className="font-medium">
                      {check.check_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {check.detail || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Scan history table */}
      {scans && scans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Scan History</CardTitle>
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
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
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
    </div>
  );
}
