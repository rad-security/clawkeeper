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

interface WelcomeEmailParams {
  to: string;
  referralCode: string;
}

interface ReferralRewardEmailParams {
  to: string;
  credits: number;
}

interface CreditsLowEmailParams {
  to: string;
  creditsRemaining: number;
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

export async function sendWelcomeEmail({ to, referralCode }: WelcomeEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set, skipping email");
    return;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://clawkeeper.dev";
  const safeCode = escapeHtml(referralCode);

  await getResend().emails.send({
    from: "Clawkeeper <hello@clawkeeper.dev>",
    to,
    subject: "Welcome to Clawkeeper — your referral code is inside",
    html: `
      <div style="font-family: sans-serif; max-width: 600px;">
        <h2 style="color: #06b6d4;">Welcome to Clawkeeper</h2>
        <p>You're all set! Your free account includes <strong>1 host on the dashboard</strong> with scan history and security grading.</p>
        <p>Share your referral code with friends:</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; text-align: center; margin: 16px 0;">
          <p style="margin: 0 0 4px 0; font-size: 12px; color: #6b7280;">Your referral link</p>
          <p style="margin: 0; font-size: 18px; font-weight: 700; font-family: monospace;">
            <a href="${appUrl}/r/${safeCode}" style="color: #06b6d4; text-decoration: none;">${appUrl}/r/${safeCode}</a>
          </p>
        </div>
        <p style="font-size: 14px; color: #6b7280;">
          Get started by installing the agent:
        </p>
        <div style="background: #1a1a2e; color: #06b6d4; padding: 12px 16px; border-radius: 6px; font-family: monospace; font-size: 13px; margin: 12px 0;">
          curl -fsSL https://clawkeeper.dev/install.sh | bash
        </div>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #6b7280; font-size: 14px;">
          <a href="${appUrl}/dashboard">Go to dashboard</a> ·
          <a href="${appUrl}/settings">Settings</a>
        </p>
      </div>
    `,
  });
}

export async function sendReferralRewardEmail({ to, credits }: ReferralRewardEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set, skipping email");
    return;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://clawkeeper.dev";

  await getResend().emails.send({
    from: "Clawkeeper <hello@clawkeeper.dev>",
    to,
    subject: `You earned ${credits} scan credits from a referral!`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px;">
        <h2 style="color: #06b6d4;">You earned ${credits} scan credits!</h2>
        <p>Someone signed up with your referral code. As a thank you, we've added <strong>${credits} scan credits</strong> to your account.</p>
        <p>Keep sharing to earn more credits:</p>
        <p>
          <a href="${appUrl}/settings" style="display: inline-block; background: #06b6d4; color: #000; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600;">
            View your referral stats
          </a>
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #6b7280; font-size: 14px;">
          <a href="${appUrl}/dashboard">Dashboard</a> ·
          <a href="${appUrl}/settings">Settings</a>
        </p>
      </div>
    `,
  });
}

export async function sendCreditsLowEmail({ to, creditsRemaining }: CreditsLowEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set, skipping email");
    return;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://clawkeeper.dev";

  await getResend().emails.send({
    from: "Clawkeeper <hello@clawkeeper.dev>",
    to,
    subject: `You have ${creditsRemaining} scan credit${creditsRemaining === 1 ? "" : "s"} left`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px;">
        <h2 style="color: #f59e0b;">${creditsRemaining === 0 ? "You're out of scan credits" : "Running low on scan credits"}</h2>
        <p>You have <strong>${creditsRemaining}</strong> scan credit${creditsRemaining === 1 ? "" : "s"} remaining this month.</p>
        <p>Two ways to keep scanning:</p>
        <ul>
          <li><strong>Upgrade to Pro</strong> for 200 scans/month with rollover — from $16/mo</li>
          <li><strong>Refer a friend</strong> to earn +5 credits per signup</li>
        </ul>
        <p>
          <a href="${appUrl}/upgrade" style="display: inline-block; background: #06b6d4; color: #000; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600;">
            Upgrade to Pro
          </a>
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #6b7280; font-size: 14px;">
          Credits refill automatically each month on your billing cycle.
        </p>
      </div>
    `,
  });
}
