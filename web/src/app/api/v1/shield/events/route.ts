import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateApiKey, isAuthError } from "@/lib/api-auth";
import { canUseRuntimeShield } from "@/lib/tier";
import { generateShieldInsights } from "@/lib/shield-insights";
import type { ShieldEventPayload } from "@/types";

const VALID_LAYERS = new Set(["regex", "semantic", "context_integrity", "blacklist", "entropy_heuristic"]);
const VALID_VERDICTS = new Set(["blocked", "warned", "passed"]);
const VALID_SEVERITIES = new Set(["critical", "high", "medium", "low"]);
const MAX_EVENTS_PER_BATCH = 100;

function validateEvent(e: unknown): e is ShieldEventPayload {
  if (!e || typeof e !== "object") return false;
  const ev = e as Record<string, unknown>;
  return (
    typeof ev.hostname === "string" &&
    typeof ev.detection_layer === "string" && VALID_LAYERS.has(ev.detection_layer) &&
    typeof ev.verdict === "string" && VALID_VERDICTS.has(ev.verdict) &&
    typeof ev.severity === "string" && VALID_SEVERITIES.has(ev.severity) &&
    typeof ev.security_level === "string" &&
    typeof ev.input_hash === "string"
  );
}

export async function POST(request: NextRequest) {
  const authResult = await validateApiKey(request);
  if (isAuthError(authResult)) return authResult;

  const supabase = createAdminClient();
  const orgId = authResult.org_id;

  // Check plan
  const { data: org } = await supabase
    .from("organizations")
    .select("plan")
    .eq("id", orgId)
    .single();

  const plan = (org?.plan || "free") as "free" | "pro" | "enterprise";
  if (!canUseRuntimeShield(plan)) {
    return NextResponse.json(
      { error: "Runtime Shield is a Pro feature. Upgrade at https://clawkeeper.dev/upgrade" },
      { status: 403 }
    );
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || !Array.isArray((body as Record<string, unknown>).events)) {
    return NextResponse.json({ error: "Body must contain an events array" }, { status: 400 });
  }

  const events = (body as { events: unknown[] }).events;
  if (events.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0 });
  }
  if (events.length > MAX_EVENTS_PER_BATCH) {
    return NextResponse.json(
      { error: `Maximum ${MAX_EVENTS_PER_BATCH} events per batch` },
      { status: 400 }
    );
  }

  // Validate each event
  for (let i = 0; i < events.length; i++) {
    if (!validateEvent(events[i])) {
      return NextResponse.json(
        { error: `Invalid event at index ${i}` },
        { status: 400 }
      );
    }
  }

  const validEvents = events as ShieldEventPayload[];

  // Resolve host_ids from hostnames
  const hostnames = [...new Set(validEvents.map((e) => e.hostname))];
  const { data: hosts } = await supabase
    .from("hosts")
    .select("id, hostname")
    .eq("org_id", orgId)
    .in("hostname", hostnames);

  const hostMap = new Map((hosts || []).map((h) => [h.hostname, h.id]));

  // Batch insert
  const rows = validEvents.map((e) => ({
    org_id: orgId,
    host_id: hostMap.get(e.hostname) || null,
    hostname: e.hostname,
    detection_layer: e.detection_layer,
    verdict: e.verdict,
    severity: e.severity,
    security_level: e.security_level,
    pattern_name: e.pattern_name || null,
    input_hash: e.input_hash,
    input_length: e.input_length || null,
    confidence: e.confidence || null,
    context: e.context || {},
  }));

  const { error: insertError } = await supabase.from("shield_events").insert(rows);
  if (insertError) {
    console.error("[shield] Event insert error:", insertError);
    return NextResponse.json({ error: "Failed to insert events" }, { status: 500 });
  }

  // Generate insights + notifications for blocked events (fire-and-forget)
  const blockedEvents = validEvents.filter((e) => e.verdict === "blocked");
  if (blockedEvents.length > 0) {
    generateShieldInsights(supabase, orgId, blockedEvents, hostMap).catch((err) => {
      console.error("[shield] Insight generation failed:", err);
    });
  }

  return NextResponse.json({ ok: true, inserted: rows.length });
}
