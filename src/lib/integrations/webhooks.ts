import { supabaseAdmin } from "@/lib/supabase/admin";

type WebhookPayload = {
  event: "lead.created" | "lead.status_changed" | "lead.call_connected";
  lead: Record<string, unknown>;
  timestamp: string;
  clientId: string;
};

/**
 * Send lead data to configured webhook URLs (Zapier, CRM, etc.)
 * Webhooks are configured per client in the `client_webhooks` table.
 */
export async function fireWebhooks(payload: WebhookPayload): Promise<void> {
  const { data: webhooks } = await supabaseAdmin
    .from("client_webhooks")
    .select("id, url, secret, events")
    .eq("client_id", payload.clientId)
    .eq("is_active", true);

  if (!webhooks || webhooks.length === 0) return;

  for (const webhook of webhooks) {
    // Check if this webhook subscribes to this event
    const events = (webhook.events as string[]) ?? [];
    if (events.length > 0 && !events.includes(payload.event)) continue;

    const body = JSON.stringify({
      event: payload.event,
      data: payload.lead,
      timestamp: payload.timestamp,
    });

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "IntakeLLG-Webhook/1.0",
    };

    // Add HMAC signature if secret is configured
    if (webhook.secret) {
      const crypto = await import("crypto");
      const sig = crypto.createHmac("sha256", webhook.secret).update(body).digest("hex");
      headers["X-Webhook-Signature"] = `sha256=${sig}`;
    }

    try {
      const response = await fetch(webhook.url, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(10000),
      });

      await supabaseAdmin.from("webhook_deliveries").insert({
        webhook_id: webhook.id,
        event: payload.event,
        status: response.ok ? "delivered" : "failed",
        status_code: response.status,
        payload_json: payload,
      });
    } catch (err) {
      await supabaseAdmin.from("webhook_deliveries").insert({
        webhook_id: webhook.id,
        event: payload.event,
        status: "failed",
        status_code: 0,
        error_message: err instanceof Error ? err.message : "Unknown error",
        payload_json: payload,
      });
    }
  }
}

/**
 * Fire webhook for a newly created lead.
 */
export async function fireLeadCreatedWebhook(lead: Record<string, unknown>): Promise<void> {
  await fireWebhooks({
    event: "lead.created",
    lead,
    timestamp: new Date().toISOString(),
    clientId: String(lead.client_id ?? ""),
  });
}
