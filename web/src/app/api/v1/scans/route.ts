import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateScanPayload } from "@/lib/report-parser";
import { canAddHost } from "@/lib/tier";
import { evaluateAlerts } from "@/lib/alerts";
import { validateApiKey, isAuthError } from "@/lib/api-auth";
import { generateScanEvents } from "@/lib/events";

export async function POST(request: NextRequest) {
  // Validate API key
  const authResult = await validateApiKey(request);
  if (isAuthError(authResult)) return authResult;

  const supabase = createAdminClient();

  // Parse and validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const result = validateScanPayload(body);
  if (!result.valid) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const data = result.data;
  const orgId = authResult.org_id;

  // Get org plan
  const { data: org } = await supabase
    .from("organizations")
    .select("plan")
    .eq("id", orgId)
    .single();

  const plan = (org?.plan || "free") as "free" | "pro" | "enterprise";

  // Check if host exists or needs to be created
  let isNewHost = false;
  let { data: host } = await supabase
    .from("hosts")
    .select("id")
    .eq("org_id", orgId)
    .eq("hostname", data.hostname)
    .single();

  if (!host) {
    isNewHost = true;
    // Check host limit
    const { count } = await supabase
      .from("hosts")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId);

    if (!canAddHost(plan, count || 0)) {
      return NextResponse.json(
        {
          error: `Host limit reached (${plan} plan). Upgrade to Pro for more hosts.`,
        },
        { status: 403 }
      );
    }

    // Create host
    const { data: newHost, error: hostError } = await supabase
      .from("hosts")
      .insert({
        org_id: orgId,
        hostname: data.hostname,
        platform: data.platform,
        os_version: data.os_version,
        agent_version: data.agent_version,
        last_grade: data.grade,
        last_score: data.score,
        last_scan_at: data.scanned_at,
      })
      .select("id")
      .single();

    if (hostError || !newHost) {
      console.error("Host insert error:", hostError);
      return NextResponse.json(
        { error: "Failed to create host", detail: hostError?.message },
        { status: 500 }
      );
    }
    host = newHost;
  } else {
    // Update host metadata
    await supabase
      .from("hosts")
      .update({
        platform: data.platform,
        os_version: data.os_version,
        agent_version: data.agent_version,
        last_grade: data.grade,
        last_score: data.score,
        last_scan_at: data.scanned_at,
      })
      .eq("id", host.id);
  }

  // Insert scan
  const { data: scan, error: scanError } = await supabase
    .from("scans")
    .insert({
      host_id: host.id,
      org_id: orgId,
      score: data.score,
      grade: data.grade,
      passed: data.passed,
      failed: data.failed,
      fixed: data.fixed,
      skipped: data.skipped,
      raw_report: data.raw_report,
      scanned_at: data.scanned_at,
    })
    .select("id")
    .single();

  if (scanError || !scan) {
    return NextResponse.json(
      { error: "Failed to insert scan" },
      { status: 500 }
    );
  }

  // Insert scan checks
  if (data.checks.length > 0) {
    const checks = data.checks.map((c) => ({
      scan_id: scan.id,
      status: c.status,
      check_name: c.check_name,
      detail: c.detail,
    }));

    await supabase.from("scan_checks").insert(checks);
  }

  // Evaluate alert rules
  await evaluateAlerts(supabase, orgId, host.id, scan.id, data);

  // Generate audit events (fire-and-forget)
  generateScanEvents(supabase, orgId, host.id, scan.id, data.hostname, data, isNewHost);

  return NextResponse.json({
    ok: true,
    host_id: host.id,
    scan_id: scan.id,
  });
}
