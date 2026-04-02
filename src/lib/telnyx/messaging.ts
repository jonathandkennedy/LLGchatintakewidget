import { supabaseAdmin } from "@/lib/supabase/admin";
import { telnyxFetch } from "@/lib/telnyx/client";

type SendSmsInput = {
  clientId: string;
  leadId?: string | null;
  from: string;
  to: string;
  text: string;
};

type SendSmsResponse = {
  data?: {
    id?: string;
  };
};

export async function sendFallbackSms({ clientId, leadId, from, to, text }: SendSmsInput): Promise<SendSmsResponse> {
  const response = await telnyxFetch<SendSmsResponse>("/messages", {
    method: "POST",
    body: JSON.stringify({ from, to, text }),
  });

  await supabaseAdmin.from("sms_messages").insert({
    lead_id: leadId ?? null,
    client_id: clientId,
    direction: "outbound",
    from_number_e164: from,
    to_number_e164: to,
    message_body: text,
    provider_message_id: response.data?.id ?? null,
    status: response.data?.id ? "sent" : "queued",
  });

  return response;
}
