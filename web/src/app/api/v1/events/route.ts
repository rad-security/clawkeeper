import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateApiKey, isAuthError } from "@/lib/api-auth";
import { createEvent } from "@/lib/events";
import { EventType } from "@/types";

const AGENT_EVENT_TYPES: EventType[] = [
  "agent.installed",
  "agent.started",
  "agent.stopped",
  "agent.uninstalled",
];

const EVENT_TITLES: Record<string, (hostname: string) => string> = {
  "agent.installed": (h) => `Agent installed on ${h}`,
  "agent.started": (h) => `Agent scan started on ${h}`,
  "agent.stopped": (h) => `Agent scan finished on ${h}`,
  "agent.uninstalled": (h) => `Agent uninstalled from ${h}`,
};

export async function POST(request: NextRequest) {
  const authResult = await validateApiKey(request);
  if (isAuthError(authResult)) return authResult;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { event_type, hostname } = body as Record<string, unknown>;

  if (
    typeof event_type !== "string" ||
    !AGENT_EVENT_TYPES.includes(event_type as EventType)
  ) {
    return NextResponse.json(
      {
        error: `Invalid event_type. Must be one of: ${AGENT_EVENT_TYPES.join(", ")}`,
      },
      { status: 400 }
    );
  }

  if (typeof hostname !== "string" || hostname.length === 0) {
    return NextResponse.json(
      { error: "hostname is required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Resolve host_id if host exists
  const { data: host } = await supabase
    .from("hosts")
    .select("id")
    .eq("org_id", authResult.org_id)
    .eq("hostname", hostname)
    .single();

  const titleFn = EVENT_TITLES[event_type];
  const title = titleFn ? titleFn(hostname) : `${event_type} on ${hostname}`;

  await createEvent(supabase, {
    org_id: authResult.org_id,
    host_id: host?.id ?? null,
    event_type: event_type as EventType,
    title,
    detail: { hostname },
    actor: "agent",
  });

  return NextResponse.json({ ok: true });
}
