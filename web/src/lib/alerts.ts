import { SupabaseClient } from "@supabase/supabase-js";
import { ScanUploadPayload } from "@/types";
import { sendAlertEmail } from "@/lib/email";

export async function evaluateAlerts(
  supabase: SupabaseClient,
  orgId: string,
  hostId: string,
  scanId: string,
  data: ScanUploadPayload
) {
  // Get enabled alert rules for this org
  const { data: rules } = await supabase
    .from("alert_rules")
    .select("*")
    .eq("org_id", orgId)
    .eq("enabled", true);

  if (!rules || rules.length === 0) return;

  // Get the previous scan for grade_drop comparisons
  const { data: prevScans } = await supabase
    .from("scans")
    .select("grade, score")
    .eq("host_id", hostId)
    .neq("id", scanId)
    .order("scanned_at", { ascending: false })
    .limit(1);

  const prevScan = prevScans?.[0] || null;

  // Get org owner email for notifications
  const { data: members } = await supabase
    .from("org_members")
    .select("user_id")
    .eq("org_id", orgId)
    .eq("role", "owner")
    .limit(1);

  let ownerEmail = "";
  if (members?.[0]) {
    const { data: user } = await supabase.auth.admin.getUserById(
      members[0].user_id
    );
    ownerEmail = user?.user?.email || "";
  }

  for (const rule of rules) {
    let triggered = false;
    let message = "";

    switch (rule.rule_type) {
      case "grade_drop": {
        if (prevScan && data.grade > prevScan.grade) {
          // Grade letters: A < B < C < D < F (alphabetically higher = worse)
          triggered = true;
          message = `Grade dropped from ${prevScan.grade} to ${data.grade} on ${data.hostname}`;
        }
        break;
      }
      case "score_below": {
        const threshold = rule.config?.threshold as number;
        if (threshold !== undefined && data.score < threshold) {
          triggered = true;
          message = `Score ${data.score} is below threshold ${threshold} on ${data.hostname}`;
        }
        break;
      }
      case "check_fail": {
        const targetCheck = rule.config?.check_name as string;
        if (targetCheck) {
          const failed = data.checks.find(
            (c) =>
              c.status === "FAIL" &&
              c.check_name.toLowerCase().includes(targetCheck.toLowerCase())
          );
          if (failed) {
            triggered = true;
            message = `Check "${failed.check_name}" failed on ${data.hostname}: ${failed.detail}`;
          }
        }
        break;
      }
    }

    if (!triggered) continue;

    // Rate limit: max 1 event per rule per hour
    const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await supabase
      .from("alert_events")
      .select("id", { count: "exact", head: true })
      .eq("alert_rule_id", rule.id)
      .gte("notified_at", oneHourAgo);

    if ((count || 0) > 0) continue;

    // Insert alert event
    await supabase.from("alert_events").insert({
      org_id: orgId,
      alert_rule_id: rule.id,
      host_id: hostId,
      scan_id: scanId,
      message,
    });

    // Send email
    if (ownerEmail) {
      try {
        await sendAlertEmail({
          to: ownerEmail,
          hostName: data.hostname,
          ruleName: rule.name,
          message,
          grade: data.grade,
          score: data.score,
        });
      } catch (err) {
        console.error("Failed to send alert email:", err);
      }
    }
  }
}
