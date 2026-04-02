import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendFallbackSms } from "@/lib/telnyx/messaging";

type LeadSmsData = {
  leadId: string;
  clientId: string;
  firstName: string | null;
  phone: string | null;
  matterType: string | null;
};

const MATTER_LABELS: Record<string, string> = {
  car_accident: "car accident",
  truck_accident: "truck accident",
  motorcycle_accident: "motorcycle accident",
  slip_fall: "slip and fall",
  wrongful_death: "wrongful death",
  other_injury: "injury",
};

/**
 * Send a follow-up SMS to the lead after intake is completed.
 * Uses the client's configured phone number as the sender.
 */
export async function sendLeadFollowUpSms(data: LeadSmsData): Promise<void> {
  if (!data.phone) {
    console.log("[sms] No phone number for lead, skipping SMS follow-up");
    return;
  }

  // Get client's outbound phone number
  const { data: phoneNumbers } = await supabaseAdmin
    .from("client_phone_numbers")
    .select("phone_e164")
    .eq("client_id", data.clientId)
    .eq("is_active", true)
    .limit(1);

  const fromNumber = phoneNumbers?.[0]?.phone_e164 ?? process.env.TELNYX_FROM_NUMBER;
  if (!fromNumber) {
    console.log("[sms] No outbound phone number configured, skipping SMS follow-up");
    return;
  }

  const name = data.firstName ?? "there";
  const matter = MATTER_LABELS[data.matterType ?? ""] ?? "case";

  const message = [
    `Hi ${name}, thank you for reaching out about your ${matter}.`,
    `Our team has received your information and will be in touch shortly.`,
    `If you need immediate assistance, reply to this message or call us directly.`,
  ].join(" ");

  try {
    await sendFallbackSms({
      clientId: data.clientId,
      leadId: data.leadId,
      from: fromNumber,
      to: data.phone,
      text: message,
    });
    console.log(`[sms] Follow-up SMS sent to ${data.phone}`);
  } catch (err) {
    console.error("[sms] Failed to send follow-up SMS:", err);
  }
}
