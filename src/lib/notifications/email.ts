type LeadEmailData = {
  leadId: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  matterType: string | null;
  incidentSummary: string | null;
  injuryStatus: string | null;
  injuryAreas: unknown;
  medicalTreatment: string | null;
  state: string | null;
  city: string | null;
  dateRange: string | null;
  additionalNotes: string | null;
  createdAt: string;
};

const MATTER_LABELS: Record<string, string> = {
  car_accident: "Car Accident",
  truck_accident: "Truck Accident",
  motorcycle_accident: "Motorcycle Accident",
  slip_fall: "Slip & Fall",
  wrongful_death: "Wrongful Death",
  other_injury: "Other Injury",
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

function buildEmailHtml(data: LeadEmailData): string {
  const name = [data.firstName, data.lastName].filter(Boolean).join(" ") || "Unknown";
  const matter = MATTER_LABELS[data.matterType ?? ""] ?? data.matterType ?? "Unknown";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
      <!-- Header -->
      <div style="background:#0f172a;padding:24px 28px;">
        <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">New Lead Received</h1>
        <p style="margin:6px 0 0;color:#94a3b8;font-size:14px;">${matter} — ${new Date(data.createdAt).toLocaleString()}</p>
      </div>

      <!-- Contact Info -->
      <div style="padding:24px 28px;border-bottom:1px solid #f1f5f9;">
        <h2 style="margin:0 0 12px;font-size:16px;color:#0f172a;">Contact Information</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;color:#64748b;font-size:13px;width:120px;">Name</td>
            <td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;">${name}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#64748b;font-size:13px;">Phone</td>
            <td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;">${formatValue(data.phone)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#64748b;font-size:13px;">Email</td>
            <td style="padding:6px 0;color:#0f172a;font-size:14px;">${formatValue(data.email)}</td>
          </tr>
        </table>
      </div>

      <!-- Case Details -->
      <div style="padding:24px 28px;border-bottom:1px solid #f1f5f9;">
        <h2 style="margin:0 0 12px;font-size:16px;color:#0f172a;">Case Details</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;color:#64748b;font-size:13px;width:120px;">Matter Type</td>
            <td style="padding:6px 0;color:#0f172a;font-size:14px;">${matter}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#64748b;font-size:13px;">Injury Status</td>
            <td style="padding:6px 0;color:#0f172a;font-size:14px;">${formatValue(data.injuryStatus)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#64748b;font-size:13px;">Injury Areas</td>
            <td style="padding:6px 0;color:#0f172a;font-size:14px;">${formatValue(data.injuryAreas)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#64748b;font-size:13px;">Treatment</td>
            <td style="padding:6px 0;color:#0f172a;font-size:14px;">${formatValue(data.medicalTreatment)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#64748b;font-size:13px;">Location</td>
            <td style="padding:6px 0;color:#0f172a;font-size:14px;">${[data.city, data.state].filter(Boolean).join(", ") || "—"}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#64748b;font-size:13px;">When</td>
            <td style="padding:6px 0;color:#0f172a;font-size:14px;">${formatValue(data.dateRange)}</td>
          </tr>
        </table>
      </div>

      <!-- Summary -->
      ${data.incidentSummary ? `
      <div style="padding:24px 28px;border-bottom:1px solid #f1f5f9;">
        <h2 style="margin:0 0 8px;font-size:16px;color:#0f172a;">Incident Summary</h2>
        <p style="margin:0;color:#334155;font-size:14px;line-height:1.6;">${data.incidentSummary}</p>
      </div>
      ` : ""}

      ${data.additionalNotes ? `
      <div style="padding:24px 28px;border-bottom:1px solid #f1f5f9;">
        <h2 style="margin:0 0 8px;font-size:16px;color:#0f172a;">Additional Notes</h2>
        <p style="margin:0;color:#334155;font-size:14px;line-height:1.6;">${data.additionalNotes}</p>
      </div>
      ` : ""}

      <!-- CTA -->
      <div style="padding:24px 28px;text-align:center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? ""}/admin/leads/${data.leadId}"
           style="display:inline-block;padding:12px 28px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">
          View Lead Details
        </a>
      </div>
    </div>

    <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:16px;">
      Sent by IntakeLLG Widget
    </p>
  </div>
</body>
</html>`;
}

function buildEmailText(data: LeadEmailData): string {
  const name = [data.firstName, data.lastName].filter(Boolean).join(" ") || "Unknown";
  const matter = MATTER_LABELS[data.matterType ?? ""] ?? data.matterType ?? "Unknown";

  return [
    `NEW LEAD: ${name}`,
    `Matter: ${matter}`,
    `Phone: ${formatValue(data.phone)}`,
    `Email: ${formatValue(data.email)}`,
    `Location: ${[data.city, data.state].filter(Boolean).join(", ") || "—"}`,
    `Injury: ${formatValue(data.injuryStatus)}`,
    `Areas: ${formatValue(data.injuryAreas)}`,
    `Treatment: ${formatValue(data.medicalTreatment)}`,
    `When: ${formatValue(data.dateRange)}`,
    data.incidentSummary ? `\nSummary:\n${data.incidentSummary}` : "",
    data.additionalNotes ? `\nNotes:\n${data.additionalNotes}` : "",
    `\nView: ${process.env.NEXT_PUBLIC_APP_URL ?? ""}/admin/leads/${data.leadId}`,
  ].filter(Boolean).join("\n");
}

/**
 * Send a lead notification email.
 * Supports Resend (RESEND_API_KEY) or falls back to logging.
 */
export async function sendLeadNotificationEmail(data: LeadEmailData): Promise<void> {
  const toEmail = process.env.LEAD_NOTIFICATION_EMAIL;
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.LEAD_NOTIFICATION_FROM ?? "IntakeLLG <notifications@intakellg.com>";

  if (!toEmail) {
    console.log("[email] LEAD_NOTIFICATION_EMAIL not set, skipping email notification");
    return;
  }

  const name = [data.firstName, data.lastName].filter(Boolean).join(" ") || "New Lead";
  const matter = MATTER_LABELS[data.matterType ?? ""] ?? data.matterType ?? "Intake";
  const subject = `New Lead: ${name} — ${matter}`;

  if (resendKey) {
    // Send via Resend API
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: toEmail.split(",").map((e) => e.trim()),
        subject,
        html: buildEmailHtml(data),
        text: buildEmailText(data),
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[email] Resend API error:", err);
    }
    return;
  }

  // No email provider configured - log the email
  console.log("[email] No email provider configured. Would have sent:");
  console.log("[email] To:", toEmail);
  console.log("[email] Subject:", subject);
  console.log("[email] Body:", buildEmailText(data));
}
