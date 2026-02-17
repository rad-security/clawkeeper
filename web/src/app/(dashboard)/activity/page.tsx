import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/get-org-id";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EventFeed } from "@/components/activity/EventFeed";
import { EventFilters } from "@/components/activity/EventFilters";
import { Activity } from "lucide-react";
import Link from "next/link";
import { TIER_LIMITS } from "@/types";
import type { Event } from "@/types";

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; host_id?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const orgId = await getOrgId(supabase);

  const [orgRes, hostsRes] = await Promise.all([
    supabase.from("organizations").select("plan").eq("id", orgId).single(),
    supabase
      .from("hosts")
      .select("id, hostname")
      .eq("org_id", orgId)
      .order("hostname"),
  ]);

  const plan = orgRes.data?.plan || "free";
  const hosts = hostsRes.data || [];
  const isPro = plan === "pro";

  if (!isPro) {
    // Blurred mock preview for free users
    const mockEvents: Event[] = [
      {
        id: "mock-1",
        org_id: orgId,
        host_id: null,
        event_type: "scan.completed",
        title: "Scan completed on prod-server-01",
        detail: { grade: "B", score: 87 },
        actor: "agent",
        created_at: new Date(Date.now() - 120_000).toISOString(),
      },
      {
        id: "mock-2",
        org_id: orgId,
        host_id: null,
        event_type: "grade.changed",
        title: "Grade changed B \u2192 C on staging-box",
        detail: { previous_grade: "B", new_grade: "C" },
        actor: "system",
        created_at: new Date(Date.now() - 3_600_000).toISOString(),
      },
      {
        id: "mock-3",
        org_id: orgId,
        host_id: null,
        event_type: "agent.installed",
        title: "Agent installed on dev-laptop",
        detail: { hostname: "dev-laptop" },
        actor: "agent",
        created_at: new Date(Date.now() - 7_200_000).toISOString(),
      },
      {
        id: "mock-4",
        org_id: orgId,
        host_id: null,
        event_type: "host.registered",
        title: "New host registered: ci-runner-03",
        detail: { platform: "linux" },
        actor: "agent",
        created_at: new Date(Date.now() - 86_400_000).toISOString(),
      },
    ];

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Activity</h1>
          <p className="text-muted-foreground">
            Full audit trail of scans, grade changes, and agent events
          </p>
        </div>

        <div className="relative">
          <div className="pointer-events-none space-y-1 opacity-50">
            <EventFeed
              initialEvents={mockEvents}
              showLoadMore={false}
            />
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
            <Card className="w-full max-w-md border-primary/50 shadow-lg">
              <CardContent className="py-8 text-center">
                <Activity className="mx-auto mb-3 h-10 w-10 text-primary" />
                <h3 className="text-lg font-semibold">
                  Unlock Activity Stream
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                  See every scan result, grade change, check flip, and agent
                  lifecycle event across all your hosts. Full audit trail with
                  filtering and pagination.
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

  // Pro users: build query
  const limit = TIER_LIMITS.pro.events_visible === -1 ? 20 : TIER_LIMITS.pro.events_visible;

  let query = supabase
    .from("events")
    .select("*, hosts(hostname)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  // Apply filters
  if (params.host_id) {
    query = query.eq("host_id", params.host_id);
  }
  if (params.category === "scan") {
    query = query.in("event_type", [
      "scan.completed",
      "grade.changed",
      "check.flipped",
      "host.registered",
    ]);
  } else if (params.category === "agent") {
    query = query.in("event_type", [
      "agent.installed",
      "agent.started",
      "agent.stopped",
      "agent.uninstalled",
    ]);
  }

  const { data: events } = await query;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Activity</h1>
        <p className="text-muted-foreground">
          Full audit trail of scans, grade changes, and agent events
        </p>
      </div>

      <EventFilters hosts={hosts} />

      <Card>
        <CardHeader>
          <CardTitle>Event Stream</CardTitle>
        </CardHeader>
        <CardContent>
          <EventFeed
            initialEvents={(events || []) as Event[]}
            hostId={params.host_id}
            eventType={
              params.category === "scan"
                ? "scan.completed"
                : params.category === "agent"
                  ? "agent.installed"
                  : undefined
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
