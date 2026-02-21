import { SupabaseClient } from "@supabase/supabase-js";
import { sendNotifications } from "@/lib/notifications";
import type { ShieldEventPayload, InsightSeverity } from "@/types";

/**
 * Generate shield-specific insights for blocked events.
 * Called from the shield events API after batch insert.
 */
export async function generateShieldInsights(
  supabase: SupabaseClient,
  orgId: string,
  blockedEvents: ShieldEventPayload[],
  hostMap: Map<string, string>
) {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 3600_000).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();

  // Insight 1: Attack surge — >10 blocked events in 1 hour
  const { count: recentBlocks } = await supabase
    .from("shield_events")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("verdict", "blocked")
    .gte("created_at", oneHourAgo);

  if ((recentBlocks || 0) > 10) {
    await upsertShieldInsight(supabase, orgId, {
      insight_type: "shield_attack_surge",
      severity: "critical",
      title: "Shield Attack Surge Detected",
      description: `${recentBlocks} prompt injection attempts blocked in the last hour across your fleet.`,
      remediation: "Review the Runtime Shield dashboard for attack patterns. Consider tightening your security level to 'paranoid' temporarily. Check if a specific host is being targeted.",
      metadata: { blocked_count: recentBlocks, window: "1h" },
    });

    // Notify
    await sendShieldNotification(supabase, orgId, {
      severity: "critical",
      title: "Shield Attack Surge Detected",
      description: `${recentBlocks} prompt injection attempts blocked in the last hour.`,
      hostname: "fleet-wide",
    });
  }

  // Insight 2: Targeted host — single host >5 blocks in 1 hour
  const hostBlockCounts = new Map<string, number>();
  for (const e of blockedEvents) {
    hostBlockCounts.set(e.hostname, (hostBlockCounts.get(e.hostname) || 0) + 1);
  }

  for (const [hostname, count] of hostBlockCounts) {
    const { count: hostRecentBlocks } = await supabase
      .from("shield_events")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("hostname", hostname)
      .eq("verdict", "blocked")
      .gte("created_at", oneHourAgo);

    if ((hostRecentBlocks || 0) > 5) {
      const hostId = hostMap.get(hostname) || null;
      await upsertShieldInsight(supabase, orgId, {
        insight_type: "shield_targeted_host",
        severity: "high",
        title: `Targeted Host: ${hostname}`,
        description: `${hostRecentBlocks} prompt injection attempts blocked on ${hostname} in the last hour.`,
        remediation: `Investigate ${hostname} for signs of compromise. Review session logs and check for unauthorized skill installations. Consider isolating this host.`,
        metadata: { hostname, host_id: hostId, blocked_count: hostRecentBlocks, batch_count: count },
      });
    }
  }

  // Insight 3: New pattern — pattern_name not seen in last 7 days
  const newPatterns = new Set<string>();
  for (const e of blockedEvents) {
    if (!e.pattern_name) continue;

    const { count: prevCount } = await supabase
      .from("shield_events")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("pattern_name", e.pattern_name)
      .gte("created_at", sevenDaysAgo)
      .lt("created_at", oneHourAgo);

    if ((prevCount || 0) === 0 && !newPatterns.has(e.pattern_name)) {
      newPatterns.add(e.pattern_name);
      await upsertShieldInsight(supabase, orgId, {
        insight_type: "shield_new_pattern",
        severity: "medium",
        title: `New Attack Pattern: ${e.pattern_name}`,
        description: `A previously unseen attack pattern "${e.pattern_name}" was detected and blocked. This pattern hasn't appeared in the last 7 days.`,
        remediation: "Review the pattern details in the Runtime Shield dashboard. Consider adding this pattern to your custom blacklist for faster detection.",
        metadata: { pattern_name: e.pattern_name, detection_layer: e.detection_layer },
      });
    }
  }
}

interface ShieldInsightData {
  insight_type: string;
  severity: InsightSeverity;
  title: string;
  description: string;
  remediation: string;
  metadata: Record<string, unknown>;
}

async function upsertShieldInsight(
  supabase: SupabaseClient,
  orgId: string,
  data: ShieldInsightData
) {
  // Check for existing unresolved insight of same type
  const { data: existing } = await supabase
    .from("insights")
    .select("id")
    .eq("org_id", orgId)
    .eq("insight_type", data.insight_type)
    .eq("is_resolved", false)
    .limit(1);

  if (existing?.length) {
    // Update existing
    await supabase
      .from("insights")
      .update({
        description: data.description,
        metadata: data.metadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing[0].id);
  } else {
    // Insert new
    await supabase.from("insights").insert({
      org_id: orgId,
      insight_type: data.insight_type,
      severity: data.severity,
      category: "security",
      title: data.title,
      description: data.description,
      remediation: data.remediation,
      affected_hosts: [],
      metadata: data.metadata,
    });
  }
}

async function sendShieldNotification(
  supabase: SupabaseClient,
  orgId: string,
  payload: { severity: InsightSeverity; title: string; description: string; hostname: string }
) {
  try {
    await sendNotifications(supabase, orgId, {
      type: "shield_block",
      severity: payload.severity,
      title: payload.title,
      description: payload.description,
      remediation: "Review the Runtime Shield dashboard at https://clawkeeper.dev/shield",
      hostname: payload.hostname,
    });
  } catch (err) {
    console.error("[shield] Notification failed:", err);
  }
}
