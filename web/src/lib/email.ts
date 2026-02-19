import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

/** Escape HTML special characters to prevent XSS in emails */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface AlertEmailParams {
  to: string;
  hostName: string;
  ruleName: string;
  message: string;
  grade?: string;
  score?: number;
}

interface InsightEmailParams {
  to: string;
  title: string;
  severity: string;
  description: string;
  remediation: string;
  affectedHosts: string[];
}

export async function sendAlertEmail({
  to,
  hostName,
  ruleName,
  message,
  grade,
  score,
}: AlertEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set, skipping email");
    return;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://clawkeeper.dev";
  const safeHost = escapeHtml(hostName);
  const safeRule = escapeHtml(ruleName);
  const safeMessage = escapeHtml(message);
  const safeGrade = grade ? escapeHtml(grade) : undefined;

  await getResend().emails.send({
    from: "Clawkeeper Alerts <alerts@clawkeeper.dev>",
    to,
    subject: `[Clawkeeper] Alert: ${safeRule} — ${safeHost}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px;">
        <h2 style="color: #e11d48;">🔔 Clawkeeper Alert</h2>
        <p><strong>Host:</strong> ${safeHost}</p>
        <p><strong>Rule:</strong> ${safeRule}</p>
        ${safeGrade ? `<p><strong>Grade:</strong> ${safeGrade}${score !== undefined ? ` (${score}/100)` : ""}</p>` : ""}
        <p>${safeMessage}</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #6b7280; font-size: 14px;">
          <a href="${appUrl}/alerts">View alerts</a> ·
          <a href="${appUrl}/settings">Manage rules</a>
        </p>
      </div>
    `,
  });
}

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#dc2626",
  high: "#ea580c",
  medium: "#ca8a04",
  low: "#2563eb",
  info: "#6b7280",
};

export async function sendInsightEmail({
  to,
  title,
  severity,
  description,
  remediation,
  affectedHosts,
}: InsightEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set, skipping email");
    return;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://clawkeeper.dev";
  const safeTitle = escapeHtml(title);
  const safeSeverity = escapeHtml(severity);
  const safeDescription = escapeHtml(description);
  const safeRemediation = escapeHtml(remediation).replace(/\n/g, "<br>");
  const safeHosts = affectedHosts.map(escapeHtml).join(", ");
  const color = SEVERITY_COLOR[severity] || "#6b7280";

  await getResend().emails.send({
    from: "Clawkeeper Insights <insights@clawkeeper.dev>",
    to,
    subject: `[Clawkeeper] ${safeSeverity.toUpperCase()}: ${safeTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px;">
        <h2 style="color: ${color};">⚡ Security Insight</h2>
        <p><strong>Severity:</strong> <span style="color: ${color}; text-transform: uppercase;">${safeSeverity}</span></p>
        <p><strong>Finding:</strong> ${safeTitle}</p>
        <p>${safeDescription}</p>
        ${safeHosts ? `<p><strong>Affected hosts:</strong> ${safeHosts}</p>` : ""}
        <div style="background: #f3f4f6; padding: 12px 16px; border-radius: 6px; margin: 16px 0;">
          <p style="margin: 0 0 4px 0; font-weight: 600;">Remediation</p>
          <p style="margin: 0; font-size: 14px;">${safeRemediation}</p>
        </div>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #6b7280; font-size: 14px;">
          <a href="${appUrl}/insights">View all insights</a> ·
          <a href="${appUrl}/settings">Settings</a>
        </p>
      </div>
    `,
  });
}
