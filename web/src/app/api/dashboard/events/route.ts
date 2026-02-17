import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TIER_LIMITS } from "@/types";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get org
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .single();

  if (!membership) {
    return NextResponse.json({ error: "No organization" }, { status: 403 });
  }

  const orgId = membership.org_id;

  // Get plan
  const { data: org } = await supabase
    .from("organizations")
    .select("plan")
    .eq("id", orgId)
    .single();

  const plan = (org?.plan || "free") as "free" | "pro";
  const maxEvents = TIER_LIMITS[plan].events_visible;

  // Parse query params
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor"); // created_at ISO string
  const hostId = searchParams.get("host_id");
  const eventType = searchParams.get("event_type");
  const rawLimit = parseInt(searchParams.get("limit") || "20", 10);
  const limit = Math.min(rawLimit, 50);

  // Build query
  let query = supabase
    .from("events")
    .select("*, hosts(hostname)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(maxEvents === -1 ? limit : Math.min(limit, maxEvents));

  if (cursor) {
    query = query.lt("created_at", cursor);
  }
  if (hostId) {
    query = query.eq("host_id", hostId);
  }
  if (eventType) {
    query = query.eq("event_type", eventType);
  }

  const { data: events, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }

  const hasMore =
    maxEvents === -1 && events !== null && events.length === limit;

  return NextResponse.json({
    events: events || [],
    has_more: hasMore,
    plan,
  });
}
