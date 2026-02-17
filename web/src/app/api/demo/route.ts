import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function POST(req: NextRequest) {
  try {
    const resend = getResend();
    const { name, email, company, clusters } = await req.json();

    if (!name || !email || !company) {
      return NextResponse.json(
        { error: "Name, email, and company are required" },
        { status: 400 }
      );
    }

    // Send notification to sales team
    await resend.emails.send({
      from: "Clawkeeper <noreply@clawkeeper.dev>",
      to: ["sales@clawkeeper.dev"],
      subject: `Enterprise Demo Request — ${company}`,
      html: `
        <h2>New Enterprise Demo Request</h2>
        <table style="border-collapse:collapse;">
          <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Name</td><td>${name}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Email</td><td>${email}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Company</td><td>${company}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Clusters</td><td>${clusters || "Not specified"}</td></tr>
        </table>
        <p style="margin-top:16px;color:#666;">Submitted via clawkeeper.dev/demo</p>
      `,
    });

    // Send confirmation to the prospect
    await resend.emails.send({
      from: "Clawkeeper <noreply@clawkeeper.dev>",
      to: [email],
      subject: "Your Clawkeeper Enterprise demo request",
      html: `
        <p>Hi ${name},</p>
        <p>Thanks for your interest in Clawkeeper Enterprise. We received your demo request and will reach out within one business day to schedule a walkthrough.</p>
        <p>In the meantime, you can try the free CLI scanner:</p>
        <pre style="background:#f4f4f5;padding:12px;border-radius:6px;">curl -fsSL https://clawkeeper.dev/install.sh | bash</pre>
        <p>— The Clawkeeper Team (RAD Security)</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Demo request error:", err);
    return NextResponse.json(
      { error: "Failed to process demo request" },
      { status: 500 }
    );
  }
}
