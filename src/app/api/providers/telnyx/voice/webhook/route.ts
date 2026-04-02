import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { handleCallFailure, markCallConnected } from "@/lib/telnyx/voice";
import { verifyTelnyxWebhook } from "@/lib/telnyx/verify";
import type { TelnyxVoiceWebhookPayload } from "@/types/telnyx";

function extractCallControlId(payload: TelnyxVoiceWebhookPayload): string | null {
  const body = payload.data?.payload ?? {};
  const callControlId = body.call_control_id;
  return typeof callControlId === "string" ? callControlId : null;
}

function extractFailureReason(payload: TelnyxVoiceWebhookPayload): string {
  const body = payload.data?.payload ?? {};
  const detail = typeof body.hangup_cause === "string" ? body.hangup_cause : undefined;
  return detail ?? payload.data?.event_type ?? "unknown_failure";
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const isValid = await verifyTelnyxWebhook({
    headers: request.headers,
    rawBody,
    channel: "voice",
  });

  const payload = JSON.parse(rawBody || "{}") as TelnyxVoiceWebhookPayload;
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

  const callControlId = extractCallControlId(payload);

  if (callControlId) {
    if (["call.answered", "call.bridged", "call.initiated", "call.hangup"].includes(eventType)) {
      if (eventType === "call.answered" || eventType === "call.bridged") {
        await markCallConnected(callControlId);
      }

      if (eventType === "call.hangup") {
        const { data: attempt } = await supabaseAdmin
          .from("call_attempts")
          .select("id, lead_id, client_id, source_number_e164")
          .eq("provider_call_control_id", callControlId)
          .maybeSingle();

        const failureReason = extractFailureReason(payload);
        if (attempt && failureReason !== "normal_clearing") {
          const { data: lead } = await supabaseAdmin.from("leads").select("phone_e164").eq("id", attempt.lead_id).maybeSingle();
          const { data: fallbackSettings } = await supabaseAdmin.from("fallback_settings").select("*").eq("client_id", attempt.client_id).maybeSingle();
          await handleCallFailure({
            callAttempt: {
              id: String(attempt.id),
              lead_id: String(attempt.lead_id),
              client_id: String(attempt.client_id),
              source_number_e164: String(attempt.source_number_e164),
              destination_number_e164: "",
            },
            leadId: String(attempt.lead_id),
            clientId: String(attempt.client_id),
            leadPhone: lead?.phone_e164 ? String(lead.phone_e164) : null,
            fallbackSettings: fallbackSettings as Record<string, unknown> | null,
            failureReason,
          });
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
