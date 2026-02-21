import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/get-org-id";
import { canUseRuntimeShield } from "@/lib/tier";
import type { PlanType } from "@/types";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const orgId = await getOrgId(supabase);

  // Check plan
  const { data: org } = await supabase
    .from("organizations")
    .select("plan")
    .eq("id", orgId)
    .single();

  const plan = (org?.plan || "free") as PlanType;
  if (!canUseRuntimeShield(plan)) {
    return NextResponse.json({ error: "Pro feature" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const verdict = searchParams.get("verdict");
  const layer = searchParams.get("layer");
  const hostId = searchParams.get("host_id");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
  const offset = (page - 1) * limit;

  // Fetch events with filters
  let query = supabase
    .from("shield_events")
    .select("*", { count: "exact" })
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (verdict) query = query.eq("verdict", verdict);
  if (layer) query = query.eq("detection_layer", layer);
  if (hostId) query = query.eq("host_id", hostId);

  // Fetch aggregate stats in parallel
  const [eventsRes, blockedRes, warnedRes, passedRes, patternsRes] = await Promise.all([
    query,
    supabase.from("shield_events").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("verdict", "blocked"),
    supabase.from("shield_events").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("verdict", "warned"),
    supabase.from("shield_events").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("verdict", "passed"),
    supabase.from("shield_events").select("pattern_name").eq("org_id", orgId).not("pattern_name", "is", null),
  ]);

  const events = eventsRes.data || [];
  const total = eventsRes.count || 0;

  const uniquePatterns = new Set((patternsRes.data || []).map((p: { pattern_name: string }) => p.pattern_name));
  const stats = {
    total: (blockedRes.count || 0) + (warnedRes.count || 0) + (passedRes.count || 0),
    blocked: blockedRes.count || 0,
    warned: warnedRes.count || 0,
    passed: passedRes.count || 0,
    unique_patterns: uniquePatterns.size,
  };

  return NextResponse.json({
    events,
    stats,
    pagination: { page, limit, total },
  });
}
