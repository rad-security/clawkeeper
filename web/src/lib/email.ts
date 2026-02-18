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
