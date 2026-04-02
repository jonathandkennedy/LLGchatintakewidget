import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyTelnyxWebhook } from "@/lib/telnyx/verify";
import type { TelnyxMessagingWebhookPayload } from "@/types/telnyx";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const isValid = await verifyTelnyxWebhook({
    headers: request.headers,
    rawBody,
    channel: "messaging",
  });

  const payload = JSON.parse(rawBody || "{}") as TelnyxMessagingWebhookPayload;
  const eventType = payload.data?.event_type ?? "unknown";

  await supabaseAdmin.from("provider_webhook_logs").insert({
    provider: "telnyx",
    event_type: eventType,
    signature_valid: isValid,
    headers_json: Object.fromEntries(request.headers.entries()),
    payload_json: payload,
    processed: false,
  });

  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const messageId = typeof payload.data?.payload?.id === "string" ? payload.data.payload.id : null;
  if (messageId) {
    await supabaseAdmin
      .from("sms_messages")
      .update({ status: eventType, webhook_payload: payload })
      .eq("provider_message_id", messageId);
  }

  return NextResponse.json({ ok: true });
}
