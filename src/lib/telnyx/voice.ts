import { resolveForwardDestination } from "@/lib/routing/resolveForwardDestination";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { telnyxFetch } from "@/lib/telnyx/client";
import { sendFallbackSms } from "@/lib/telnyx/messaging";

type ConnectLeadCallInput = {
  sessionId: string;
  leadId: string;
};

type TelnyxCallCreateResponse = {
  data?: {
    call_control_id?: string;
    call_leg_id?: string;
  };
};

type CallAttemptRow = {
  id: string;
  lead_id: string;
  client_id: string;
  source_number_e164: string;
  destination_number_e164: string;
};

async function getLeadContext(leadId: string) {
  const { data: lead, error: leadError } = await supabaseAdmin
    .from("leads")
    .select("id, client_id, phone_e164")
    .eq("id", leadId)
    .single();

  if (leadError || !lead) throw leadError ?? new Error("Lead not found");

  const [{ data: clientNumber, error: numberError }, { data: fallbackSettings }] = await Promise.all([
    supabaseAdmin
      .from("client_phone_numbers")
      .select("*")
      .eq("client_id", lead.client_id)
      .eq("is_primary", true)
      .single(),
    supabaseAdmin.from("fallback_settings").select("*").eq("client_id", lead.client_id).maybeSingle(),
  ]);

  if (numberError || !clientNumber) throw numberError ?? new Error("Client number not found");

  return {
    lead,
    clientNumber,
    fallbackSettings,
  };
}

export async function connectLeadCall({ sessionId, leadId }: ConnectLeadCallInput) {
  const { lead, clientNumber, fallbackSettings } = await getLeadContext(leadId);

  const routing = await resolveForwardDestination({ clientId: String(lead.client_id) });
  if (!routing.destinationNumber) {
    await supabaseAdmin.from("leads").update({ status: "callback_pending" }).eq("id", lead.id);
    if (fallbackSettings?.sms_fallback_enabled && lead.phone_e164) {
      await sendFallbackSms({
        clientId: String(lead.client_id),
        leadId: String(lead.id),
        from: String(clientNumber.phone_number_e164),
        to: String(lead.phone_e164),
        text: String(fallbackSettings.sms_fallback_message ?? "We received your request and will call you back as soon as possible."),
      });
    }

    return {
      ok: true,
      sessionId,
      leadId,
      status: "callback_pending",
      reason: "No active forwarding destination found",
    };
  }

  const { data: callAttempt, error: callAttemptError } = await supabaseAdmin
    .from("call_attempts")
    .insert({
      lead_id: lead.id,
      client_id: lead.client_id,
      source_number_e164: clientNumber.phone_number_e164,
      destination_number_e164: routing.destinationNumber,
      provider: "telnyx",
      status: "initiated",
    })
    .select("*")
    .single();

  if (callAttemptError || !callAttempt) throw callAttemptError ?? new Error("Failed to create call attempt");

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) throw new Error("Missing NEXT_PUBLIC_APP_URL");

    const providerResponse = await telnyxFetch<TelnyxCallCreateResponse>("/calls", {
      method: "POST",
      body: JSON.stringify({
        connection_id: process.env.TELNYX_DEFAULT_CONNECTION_ID,
        from: clientNumber.phone_number_e164,
        to: routing.destinationNumber,
        webhook_url: `${appUrl}/api/providers/telnyx/voice/webhook`,
        client_state: Buffer.from(JSON.stringify({
          leadId,
          clientId: lead.client_id,
          sessionId,
          callAttemptId: callAttempt.id,
          callerPhone: lead.phone_e164,
          sourceNumber: clientNumber.phone_number_e164,
        })).toString("base64"),
      }),
    });

    await supabaseAdmin.from("call_attempts").update({
      provider_call_control_id: providerResponse.data?.call_control_id ?? null,
      provider_call_leg_id: providerResponse.data?.call_leg_id ?? null,
    }).eq("id", callAttempt.id);

    await supabaseAdmin.from("leads").update({ status: "transfer_attempted" }).eq("id", lead.id);

    return {
      ok: true,
      sessionId,
      leadId,
      callAttemptId: String(callAttempt.id),
      status: "initiated",
      providerResponse,
    };
  } catch (error) {
    await handleCallFailure({
      callAttempt: callAttempt as unknown as CallAttemptRow,
      leadId: String(lead.id),
      clientId: String(lead.client_id),
      leadPhone: lead.phone_e164 ? String(lead.phone_e164) : null,
      fallbackSettings,
      failureReason: error instanceof Error ? error.message : "Unknown Telnyx error",
    });

    return {
      ok: true,
      sessionId,
      leadId,
      callAttemptId: String(callAttempt.id),
      status: "callback_pending",
      reason: error instanceof Error ? error.message : "Unknown Telnyx error",
    };
  }
}

type FailureInput = {
  callAttempt: CallAttemptRow;
  leadId: string;
  clientId: string;
  leadPhone: string | null;
  fallbackSettings: Record<string, unknown> | null;
  failureReason: string;
};

export async function handleCallFailure(input: FailureInput) {
  await Promise.all([
    supabaseAdmin
      .from("call_attempts")
      .update({ status: "failed", failure_reason: input.failureReason, ended_at: new Date().toISOString() })
      .eq("id", input.callAttempt.id),
    supabaseAdmin
      .from("leads")
      .update({ status: "callback_pending" })
      .eq("id", input.leadId),
  ]);

  if (input.fallbackSettings?.sms_fallback_enabled && input.leadPhone) {
    await sendFallbackSms({
      clientId: input.clientId,
      leadId: input.leadId,
      from: input.callAttempt.source_number_e164,
      to: input.leadPhone,
      text: String(input.fallbackSettings.sms_fallback_message ?? "We got your request and will call you back shortly."),
    });
  }
}

export async function markCallConnected(callControlId: string) {
  const { data: attempt } = await supabaseAdmin
    .from("call_attempts")
    .select("id, lead_id")
    .eq("provider_call_control_id", callControlId)
    .maybeSingle();

  if (!attempt) return;

  await Promise.all([
    supabaseAdmin
      .from("call_attempts")
      .update({ status: "connected", connected_at: new Date().toISOString() })
      .eq("id", attempt.id),
    supabaseAdmin
      .from("leads")
      .update({ status: "call_connected" })
      .eq("id", attempt.lead_id),
  ]);
}
