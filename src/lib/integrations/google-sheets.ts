/**
 * Google Sheets integration.
 * Syncs lead data to a Google Sheet via the Sheets API.
 * Requires GOOGLE_SHEETS_API_KEY and a sheet ID.
 *
 * Alternative: Uses a simple append-via-webhook approach
 * that works with Google Apps Script web apps.
 */

type LeadRow = {
  name: string;
  phone: string;
  email: string;
  matterType: string;
  status: string;
  score: number | null;
  state: string;
  city: string;
  createdAt: string;
};

/**
 * Append a lead row to a Google Sheet via Apps Script webhook.
 *
 * Setup: Create a Google Apps Script web app that accepts POST:
 * 1. Go to script.google.com
 * 2. Create a function doPost(e) that appends to your sheet
 * 3. Deploy as web app and set GOOGLE_SHEETS_WEBHOOK_URL
 */
export async function appendToGoogleSheet(lead: LeadRow): Promise<void> {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        values: [
          lead.createdAt,
          lead.name,
          lead.phone,
          lead.email,
          lead.matterType,
          lead.status,
          lead.score ?? "",
          lead.state,
          lead.city,
        ],
      }),
    });
  } catch (err) {
    console.error("[sheets] Failed to sync:", err);
  }
}

/**
 * Bulk export leads to Google Sheet format (tab-separated for paste).
 */
export function leadsToTSV(leads: LeadRow[]): string {
  const headers = ["Date", "Name", "Phone", "Email", "Matter Type", "Status", "Score", "State", "City"];
  const rows = leads.map((l) => [
    l.createdAt,
    l.name,
    l.phone,
    l.email,
    l.matterType,
    l.status,
    String(l.score ?? ""),
    l.state,
    l.city,
  ].join("\t"));

  return [headers.join("\t"), ...rows].join("\n");
}
