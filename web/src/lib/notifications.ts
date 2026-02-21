import { SupabaseClient } from "@supabase/supabase-js";
import { sendInsightEmail } from "@/lib/email";
import type { NotificationSettings, InsightSeverity } from "@/types";
import crypto from "crypto";

interface NotificationPayload {
  type: "cve_vulnerability" | "critical_failure" | "credential_exposure" | "grade_degradation" | "new_regression" | "new_host" | "shield_block";
  severity: InsightSeverity;
  title: string;
  description: string;
  remediation: string;
  hostname: string;
  metadata?: Record<string, unknown>;
}

/**
 * Get notification settings for an org. Returns null if not configured.
 */
export async function getNotificationSettings(
  supabase: SupabaseClient,
  orgId: string
): Promise<NotificationSettings | null> {
  const { data } = await supabase
    .from("notification_settings")
    .select("*")
    .eq("org_id", orgId)
    .single();
  return data as NotificationSettings | null;
}

/**
 * Determine if a notification should be sent based on settings and payload type.
 */
function shouldNotify(settings: NotificationSettings, payload: NotificationPayload): boolean {
  if (payload.type === "cve_vulnerability" && settings.notify_on_cve) return true;
  if (payload.type === "grade_degradation" && settings.notify_on_grade_drop) return true;
  if (payload.type === "new_host" && settings.notify_on_new_host) return true;
  if (
    settings.notify_on_critical &&
    (payload.type === "critical_failure" || payload.type === "credential_exposure" || payload.type === "new_regression") &&
    (payload.severity === "critical" || payload.severity === "high")
  ) {
    return true;
  }
  if (payload.type === "shield_block" && settings.notify_on_shield_block) return true;
  return false;
}

/**
 * Send a webhook notification to the configured URL.
 */
async function sendWebhook(
  url: string,
  secret: string | null,
  payload: NotificationPayload
): Promise<void> {
  const body = JSON.stringify({
    event: payload.type,
    severity: payload.severity,
    title: payload.title,
    description: payload.description,
    remediation: payload.remediation,
    hostname: payload.hostname,
    metadata: payload.metadata || {},
    timestamp: new Date().toISOString(),
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "Clawkeeper-Webhook/1.0",
  };

  // Sign the payload with HMAC-SHA256 if a secret is configured
  if (secret) {
    const signature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");
    headers["X-Clawkeeper-Signature"] = `sha256=${signature}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body,
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
  }
}

/**
 * Send notifications (email + webhook) for an insight event.
 * Call this from the insight generation pipeline.
 */
export async function sendNotifications(
  supabase: SupabaseClient,
  orgId: string,
  payload: NotificationPayload
): Promise<void> {
  const settings = await getNotificationSettings(supabase, orgId);
  if (!settings) return;
  if (!shouldNotify(settings, payload)) return;

  const promises: Promise<void>[] = [];

  // Email notification
  if (settings.email_enabled && settings.email_address) {
    promises.push(
      sendInsightEmail({
        to: settings.email_address,
        title: payload.title,
        severity: payload.severity,
        description: payload.description,
        remediation: payload.remediation,
        affectedHosts: [payload.hostname],
      }).catch((err) => {
        console.error("Notification email failed:", err);
      })
    );
  }

  // Webhook notification
  if (settings.webhook_enabled && settings.webhook_url) {
    promises.push(
      sendWebhook(settings.webhook_url, settings.webhook_secret, payload).catch((err) => {
        console.error("Webhook delivery failed:", err);
      })
    );
  }

  await Promise.allSettled(promises);
}
