import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/get-org-id";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldStats } from "@/components/shield/ShieldStats";
import { ShieldTimelineChart } from "@/components/shield/ShieldTimelineChart";
import { ShieldPatternTable } from "@/components/shield/ShieldPatternTable";
import { ShieldPolicyPanel } from "@/components/shield/ShieldPolicyPanel";
import { ShieldEventFeed } from "@/components/shield/ShieldEventFeed";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ShieldEvent } from "@/types";

export default async function ShieldPage() {
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
          <h1 className="text-2xl font-bold">Runtime Shield</h1>
          <p className="text-muted-foreground">
            Real-time prompt injection defense for your fleet
          </p>
        </div>

        {/* Blurred mock preview */}
        <div className="relative">
          <div className="pointer-events-none space-y-4 opacity-50 blur-[2px]">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {[
                { label: "Total Events", count: 847, color: "text-zinc-300" },
                { label: "Blocked", count: 23, color: "text-red-500" },
                { label: "Warned", count: 41, color: "text-yellow-500" },
                { label: "Passed", count: 783, color: "text-emerald-500" },
                { label: "Patterns", count: 8, color: "text-violet-500" },
              ].map((s) => (
                <Card key={s.label}>
                  <CardContent className="pt-5 pb-4">
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardContent className="space-y-2 pt-5 pb-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-red-500/10 text-red-500 text-[10px]">BLOCKED</Badge>
                  <Badge variant="secondary" className="text-[10px]">Regex</Badge>
                  <span className="font-medium">prod-server-01</span>
                  <span className="font-mono text-xs text-muted-foreground">persona_hijack</span>
                </div>
                <p className="text-xs text-muted-foreground">2 minutes ago &middot; critical &middot; 95% conf</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-2 pt-5 pb-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 text-[10px]">WARNED</Badge>
                  <Badge variant="secondary" className="text-[10px]">Semantic</Badge>
                  <span className="font-medium">dev-laptop</span>
                  <span className="font-mono text-xs text-muted-foreground">instruction_override</span>
                </div>
                <p className="text-xs text-muted-foreground">15 minutes ago &middot; high &middot; 72% conf</p>
              </CardContent>
            </Card>
          </div>

          {/* Overlay CTA */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Card className="w-full max-w-md border-primary/50 shadow-lg">
              <CardContent className="py-8 text-center">
                <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-primary" />
                <h3 className="text-lg font-semibold">
                  Unlock Runtime Shield
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                  Real-time prompt injection defense with 5 detection layers,
                  fleet-wide analytics, centralized policy management, and
                  instant alerts.
                </p>
                <Link href="/upgrade?reason=shield">
                  <Button className="mt-4">Upgrade to Pro</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Pro/Enterprise: fetch real data
  const [eventsRes, blockedRes, warnedRes, passedRes, patternsRes] = await Promise.all([
    supabase
      .from("shield_events")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("shield_events")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("verdict", "blocked"),
    supabase
      .from("shield_events")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("verdict", "warned"),
    supabase
      .from("shield_events")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("verdict", "passed"),
    supabase
      .from("shield_events")
      .select("pattern_name")
      .eq("org_id", orgId)
      .not("pattern_name", "is", null),
  ]);

  const events = (eventsRes.data || []) as ShieldEvent[];
  const blocked = blockedRes.count || 0;
  const warned = warnedRes.count || 0;
  const passed = passedRes.count || 0;
  const total = blocked + warned + passed;
  const uniquePatterns = new Set((patternsRes.data || []).map((p: { pattern_name: string }) => p.pattern_name)).size;

  // Total count for pagination
  const { count: totalCount } = await supabase
    .from("shield_events")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Runtime Shield</h1>
        <p className="text-muted-foreground">
          Real-time prompt injection defense for your fleet
        </p>
      </div>

      <ShieldStats
        total={total}
        blocked={blocked}
        warned={warned}
        passed={passed}
        uniquePatterns={uniquePatterns}
      />

      {events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detection Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ShieldTimelineChart events={events} />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Attack Patterns</CardTitle>
          </CardHeader>
          <CardContent>
            <ShieldPatternTable events={events} />
          </CardContent>
        </Card>
        <ShieldPolicyPanel />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Events</CardTitle>
        </CardHeader>
        <CardContent>
          <ShieldEventFeed
            initialEvents={events}
            total={totalCount || 0}
          />
        </CardContent>
      </Card>
    </div>
  );
}
