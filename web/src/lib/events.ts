import { SupabaseClient } from "@supabase/supabase-js";
import { EventType, ScanUploadPayload } from "@/types";

interface CreateEventParams {
  org_id: string;
  host_id?: string | null;
  event_type: EventType;
  title: string;
  detail?: Record<string, unknown>;
  actor?: string;
}

/** Insert a single event. Fire-and-forget — logs errors but never throws. */
export async function createEvent(
  supabase: SupabaseClient,
  params: CreateEventParams
) {
  try {
    await supabase.from("events").insert({
      org_id: params.org_id,
      host_id: params.host_id ?? null,
      event_type: params.event_type,
      title: params.title,
      detail: params.detail ?? {},
      actor: params.actor ?? "system",
    });
  } catch (err) {
    console.error("[events] Failed to create event:", err);
  }
}

/**
 * Generate all scan-derived events after a scan upload.
 * Fire-and-forget — does not block the scan response.
 */
export async function generateScanEvents(
  supabase: SupabaseClient,
  orgId: string,
  hostId: string,
  scanId: string,
  hostname: string,
  data: ScanUploadPayload,
  isNewHost: boolean
) {
  try {
    // Always: scan.completed
    await createEvent(supabase, {
      org_id: orgId,
      host_id: hostId,
      event_type: "scan.completed",
      title: `Scan completed on ${hostname}`,
      detail: {
        scan_id: scanId,
        grade: data.grade,
        score: data.score,
        passed: data.passed,
        failed: data.failed,
      },
      actor: "agent",
    });

    // If new host: host.registered
    if (isNewHost) {
      await createEvent(supabase, {
        org_id: orgId,
        host_id: hostId,
        event_type: "host.registered",
        title: `New host registered: ${hostname}`,
        detail: {
          platform: data.platform,
          os_version: data.os_version,
        },
        actor: "agent",
      });
    }

    // Compare to previous scan for grade changes and check flips
    const { data: prevScans } = await supabase
      .from("scans")
      .select("id, grade")
      .eq("host_id", hostId)
      .neq("id", scanId)
      .order("scanned_at", { ascending: false })
      .limit(1);

    const prevScan = prevScans?.[0];
    if (!prevScan) return;

    // grade.changed
    if (prevScan.grade !== data.grade) {
      await createEvent(supabase, {
        org_id: orgId,
        host_id: hostId,
        event_type: "grade.changed",
        title: `Grade changed ${prevScan.grade} \u2192 ${data.grade} on ${hostname}`,
        detail: {
          previous_grade: prevScan.grade,
          new_grade: data.grade,
          scan_id: scanId,
        },
        actor: "system",
      });
    }

    // check.flipped — compare each check to previous scan's checks
    const { data: prevChecks } = await supabase
      .from("scan_checks")
      .select("check_name, status")
      .eq("scan_id", prevScan.id);

    if (prevChecks && prevChecks.length > 0) {
      const prevMap = new Map(
        prevChecks.map((c) => [c.check_name, c.status])
      );

      for (const check of data.checks) {
        const prevStatus = prevMap.get(check.check_name);
        if (prevStatus && prevStatus !== check.status) {
          await createEvent(supabase, {
            org_id: orgId,
            host_id: hostId,
            event_type: "check.flipped",
            title: `${check.check_name}: ${prevStatus} \u2192 ${check.status} on ${hostname}`,
            detail: {
              check_name: check.check_name,
              previous_status: prevStatus,
              new_status: check.status,
              scan_id: scanId,
            },
            actor: "system",
          });
        }
      }
    }
  } catch (err) {
    console.error("[events] Failed to generate scan events:", err);
  }
}
