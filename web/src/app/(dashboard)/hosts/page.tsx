import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/get-org-id";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CopyCommand } from "@/components/landing/CopyCommand";
import Link from "next/link";
import { Download, Apple } from "lucide-react";

export default async function HostsPage() {
  const supabase = await createClient();
  const orgId = await getOrgId(supabase);

  const { data: hosts } = await supabase
    .from("hosts")
    .select("*")
    .eq("org_id", orgId)
    .order("last_scan_at", { ascending: false });

  const gradeVariant = (grade: string | null) => {
    if (grade === "A" || grade === "B") return "default" as const;
    if (grade === "C") return "secondary" as const;
    return "destructive" as const;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hosts</h1>
        <p className="text-muted-foreground">
          All monitored OpenClaw instances in your organization
        </p>
      </div>

      {!hosts || hosts.length === 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              <CardTitle>Install the Clawkeeper Agent</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              No hosts registered yet. Run this command on any machine running
              OpenClaw to install the agent:
            </p>
            <CopyCommand command="curl -fsSL https://clawkeeper.dev/install.sh | bash" />
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">
                or use the desktop app
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <a
              href="https://github.com/rad-security/clawkeeper/releases/latest/download/Clawkeeper.dmg"
              className="inline-flex items-center gap-2"
            >
              <Button variant="outline" size="sm">
                <Apple className="h-4 w-4" />
                Download for macOS
              </Button>
            </a>
            <p className="text-sm text-muted-foreground">
              Need an API key first?{" "}
              <Link
                href="/dashboard"
                className="text-cyan-400 hover:underline"
              >
                Go to the setup wizard
              </Link>{" "}
              to generate one.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hostname</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Last Scan</TableHead>
                <TableHead>Agent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hosts.map((host) => (
                <TableRow key={host.id}>
                  <TableCell>
                    <Link
                      href={`/hosts/${host.id}`}
                      className="font-medium text-cyan-400 hover:underline"
                    >
                      {host.hostname}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {host.platform || "\u2014"}
                    {host.os_version ? ` ${host.os_version}` : ""}
                  </TableCell>
                  <TableCell>
                    {host.last_grade ? (
                      <Badge variant={gradeVariant(host.last_grade)}>
                        {host.last_grade}
                      </Badge>
                    ) : (
                      "\u2014"
                    )}
                  </TableCell>
                  <TableCell>
                    {host.last_score !== null ? `${host.last_score}/100` : "\u2014"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {host.last_scan_at
                      ? new Date(host.last_scan_at).toLocaleString()
                      : "Never"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {host.agent_version || "\u2014"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
