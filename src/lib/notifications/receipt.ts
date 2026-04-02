/**
 * Generate an intake completion receipt/summary.
 * Returns HTML that can be displayed in the widget or emailed to the lead.
 */

type ReceiptData = {
  name: string;
  phone: string | null;
  email: string | null;
  matterType: string | null;
  referenceNumber: string;
  submittedAt: string;
  firmName: string;
};

const MATTER_LABELS: Record<string, string> = {
  car_accident: "Car Accident",
  truck_accident: "Truck Accident",
  motorcycle_accident: "Motorcycle Accident",
  slip_fall: "Slip & Fall",
  wrongful_death: "Wrongful Death",
  other_injury: "Other Injury",
};

/**
 * Generate a plain text receipt.
 */
export function generateTextReceipt(data: ReceiptData): string {
  return [
    "═══════════════════════════════════",
    "     INTAKE CONFIRMATION RECEIPT",
    "═══════════════════════════════════",
    "",
    `Reference: ${data.referenceNumber}`,
    `Date: ${new Date(data.submittedAt).toLocaleString()}`,
    "",
    `Name: ${data.name}`,
    `Phone: ${data.phone ?? "N/A"}`,
    `Email: ${data.email ?? "N/A"}`,
    `Matter: ${MATTER_LABELS[data.matterType ?? ""] ?? data.matterType ?? "N/A"}`,
    "",
    "───────────────────────────────────",
    `Your information has been submitted to ${data.firmName}.`,
    "A member of our team will contact you shortly.",
    "",
    "If you need immediate assistance, call us directly.",
    "───────────────────────────────────",
    `Ref #${data.referenceNumber}`,
  ].join("\n");
}

/**
 * Generate an HTML receipt for email or display.
 */
export function generateHtmlReceipt(data: ReceiptData): string {
  const matter = MATTER_LABELS[data.matterType ?? ""] ?? data.matterType ?? "N/A";

  return `
<div style="max-width:480px;margin:0 auto;padding:24px;font-family:-apple-system,sans-serif;">
  <div style="background:#0f172a;color:#fff;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
    <h2 style="margin:0;font-size:18px;">Intake Confirmation</h2>
    <p style="margin:8px 0 0;color:#94a3b8;font-size:13px;">Reference: ${data.referenceNumber}</p>
  </div>
  <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 12px 12px;">
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Name</td><td style="padding:8px 0;font-weight:600;">${data.name}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Phone</td><td style="padding:8px 0;">${data.phone ?? "N/A"}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Email</td><td style="padding:8px 0;">${data.email ?? "N/A"}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Matter</td><td style="padding:8px 0;">${matter}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;font-size:13px;">Submitted</td><td style="padding:8px 0;">${new Date(data.submittedAt).toLocaleString()}</td></tr>
    </table>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;" />
    <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0;">
      Your information has been submitted to <strong>${data.firmName}</strong>.
      A member of our team will contact you shortly.
    </p>
  </div>
</div>`;
}

/**
 * Generate a short reference number from a lead ID.
 */
export function generateReferenceNumber(leadId: string): string {
  return "LLG-" + leadId.slice(0, 8).toUpperCase();
}
