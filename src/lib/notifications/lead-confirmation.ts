/**
 * Send a confirmation email to the lead after intake completion.
 * Uses the receipt template with the firm's branding.
 */

import { generateReferenceNumber } from "./receipt";

type LeadConfirmData = {
  leadId: string;
  name: string;
  email: string;
  matterType: string | null;
  firmName: string;
  createdAt: string;
};

export async function sendLeadConfirmationEmail(data: LeadConfirmData): Promise<void> {
  if (!data.email) return;

  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.LEAD_NOTIFICATION_FROM ?? "IntakeLLG <notifications@intakellg.com>";

  const refNumber = generateReferenceNumber(data.leadId);
  const matter = data.matterType?.replace(/_/g, " ") ?? "your case";

  const html = `
<div style="max-width:520px;margin:0 auto;padding:32px 16px;font-family:-apple-system,sans-serif;">
  <div style="background:#0f172a;color:#fff;padding:28px;border-radius:16px 16px 0 0;text-align:center;">
    <h1 style="margin:0;font-size:22px;font-weight:700;">${data.firmName}</h1>
    <p style="margin:8px 0 0;color:#94a3b8;font-size:14px;">Intake Confirmation</p>
  </div>
  <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;padding:28px;border-radius:0 0 16px 16px;">
    <p style="font-size:16px;color:#0f172a;line-height:1.6;margin:0 0 16px;">
      Hi ${data.name},
    </p>
    <p style="font-size:15px;color:#334155;line-height:1.6;margin:0 0 16px;">
      Thank you for reaching out about ${matter}. We've received your information and a member of our team will be in contact with you shortly.
    </p>
    <div style="background:#f8fafc;border-radius:10px;padding:16px;margin:16px 0;">
      <table style="width:100%;">
        <tr><td style="padding:4px 0;color:#64748b;font-size:13px;">Reference</td><td style="padding:4px 0;font-weight:700;font-size:14px;">${refNumber}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;font-size:13px;">Submitted</td><td style="padding:4px 0;font-size:14px;">${new Date(data.createdAt).toLocaleString()}</td></tr>
      </table>
    </div>
    <p style="font-size:14px;color:#64748b;line-height:1.6;margin:16px 0 0;">
      If you need immediate assistance, please call us directly. Your consultation is free and confidential.
    </p>
  </div>
  <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:16px;">Powered by IntakeLLG</p>
</div>`;

  const text = `Hi ${data.name},\n\nThank you for reaching out about ${matter}. We've received your information and will be in contact shortly.\n\nReference: ${refNumber}\nSubmitted: ${new Date(data.createdAt).toLocaleString()}\n\nIf you need immediate assistance, please call us directly.`;

  if (!resendKey) {
    console.log(`[email] Lead confirmation for ${data.email}: ref ${refNumber}`);
    return;
  }

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: fromEmail,
        to: data.email,
        subject: `${data.firmName} - Intake Confirmation (${refNumber})`,
        html,
        text,
      }),
    });
  } catch (err) {
    console.error("[email] Failed to send lead confirmation:", err);
  }
}
