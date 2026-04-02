import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizeUsPhone } from "@/lib/utils/phone";
import { sendLeadNotificationEmail } from "@/lib/notifications/email";
import { sendLeadFollowUpSms } from "@/lib/notifications/sms";
import { scoreLeadData } from "@/lib/scoring/lead-score";
import { getActiveTest, selectVariant, recordVariantAssignment, recordVariantConversion } from "@/lib/ab-testing/engine";
import { fireLeadCreatedWebhook } from "@/lib/integrations/webhooks";
import { sendSlackLeadNotification } from "@/lib/integrations/slack";
import { autoAssignLead } from "@/lib/routing/lead-assignment";
import { checkDuplicate, flagDuplicate } from "@/lib/monitoring/duplicates";
import { classifyAndStoreLead } from "@/lib/ai/classify";
import { analyzeSentiment } from "@/lib/ai/sentiment";
import { scheduleFollowUps } from "@/lib/scheduling/followup";

type CreateLeadSessionInput = {
  clientId: string;
  flowId?: string;
  landingPageUrl?: string;
  referrerUrl?: string;
  utm?: Record<string, string | undefined>;
  deviceType?: string;
};

type AnswerRow = {
  field_key: string;
  value_text: string | null;
  value_json: unknown;
};

export async function createLeadSession(input: CreateLeadSessionInput) {
  const { data, error } = await supabaseAdmin
    .from("lead_sessions")
    .insert({
      client_id: input.clientId,
      flow_id: input.flowId ?? null,
      status: "opened",
      landing_page_url: input.landingPageUrl ?? null,
      referrer_url: input.referrerUrl ?? null,
      utm_source: input.utm?.source ?? null,
      utm_medium: input.utm?.medium ?? null,
      utm_campaign: input.utm?.campaign ?? null,
      utm_term: input.utm?.term ?? null,
      utm_content: input.utm?.content ?? null,
      device_type: input.deviceType ?? null,
    })
    .select("*")
    .single();

  if (error || !data) throw error ?? new Error("Failed to create session");

  // A/B test: assign variant if an active test exists
  try {
    const test = await getActiveTest(input.clientId);
    if (test && test.variants.length > 0) {
      const variant = selectVariant(test.variants);
      await recordVariantAssignment(test.id, variant.id, data.id);
      // If variant has a different flow, update the session
      if (variant.flowId) {
        await supabaseAdmin.from("lead_sessions").update({ flow_id: variant.flowId }).eq("id", data.id);
        data.flow_id = variant.flowId;
      }
    }
  } catch (err) {
    console.error("[ab-test] Failed to assign variant:", err);
  }

  return data;
}

export async function finalizeLeadFromSession(sessionId: string) {
  const { data: session, error: sessionError } = await supabaseAdmin
    .from("lead_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) throw sessionError ?? new Error("Session not found");

  const { data: answers, error: answersError } = await supabaseAdmin
    .from("lead_session_answers")
    .select("field_key, value_text, value_json")
    .eq("session_id", sessionId);

  if (answersError) throw answersError;

  const map = new Map<string, unknown>();
  for (const answer of (answers ?? []) as AnswerRow[]) {
    map.set(answer.field_key, answer.value_json ?? answer.value_text);
  }

  const firstName = String(map.get("first_name") ?? "").trim();
  const lastName = String(map.get("last_name") ?? "").trim();
  const normalizedPhone = normalizeUsPhone(String(map.get("phone") ?? ""));

  // Compute lead score
  const scoreResult = scoreLeadData({
    matter_type: map.get("matter_type") as string | null,
    injury_status: map.get("injury_status") as string | null,
    injury_areas: map.get("injury_areas") as string[] | null,
    medical_treatment_status: map.get("medical_treatment_status") as string | null,
    incident_state: map.get("incident_state") as string | null,
    incident_date_range: map.get("incident_date_range") as string | null,
    phone_e164: normalizedPhone,
    email: map.get("email") as string | null,
  });

  const payload = {
    session_id: sessionId,
    client_id: session.client_id,
    status: "intake_completed",
    matter_type: map.get("matter_type") ?? null,
    incident_summary: map.get("incident_summary") ?? null,
    injury_status: map.get("injury_status") ?? null,
    injury_areas: map.get("injury_areas") ?? null,
    medical_treatment_status: map.get("medical_treatment_status") ?? null,
    incident_state: map.get("incident_state") ?? null,
    incident_city: map.get("incident_city") ?? null,
    incident_date_range: map.get("incident_date_range") ?? null,
    first_name: firstName || null,
    last_name: lastName || null,
    phone_e164: normalizedPhone,
    email: map.get("email") ?? null,
    additional_notes: map.get("additional_notes") ?? null,
    lead_score: scoreResult.total,
    lead_score_tier: scoreResult.tier,
  };

  const { data: lead, error: leadError } = await supabaseAdmin
    .from("leads")
    .upsert(payload, { onConflict: "session_id" })
    .select("*")
    .single();

  if (leadError || !lead) throw leadError ?? new Error("Failed to finalize lead");

  const { error: sessionUpdateError } = await supabaseAdmin
    .from("lead_sessions")
    .update({ status: "completed", completed_at: new Date().toISOString(), last_activity_at: new Date().toISOString() })
    .eq("id", sessionId);

  if (sessionUpdateError) throw sessionUpdateError;

  // Check for duplicates (fire and forget)
  checkDuplicate({
    phone: lead.phone_e164,
    email: lead.email,
    firstName: lead.first_name,
    lastName: lead.last_name,
  }).then((dup) => {
    if (dup.isDuplicate && dup.matchedLeadId && dup.matchType) {
      flagDuplicate(lead.id, dup.matchedLeadId, dup.matchType);
    }
  }).catch((err) => console.error("[duplicate] Check failed:", err));

  // Sentiment analysis (synchronous - fast, no API call)
  if (lead.incident_summary) {
    const sentiment = analyzeSentiment(lead.incident_summary + " " + (lead.additional_notes ?? ""));
    void supabaseAdmin.from("leads").update({
      sentiment_urgency: sentiment.urgencyScore,
      sentiment_tone: sentiment.emotionalTone,
      sentiment_signals: sentiment.urgencySignals,
    }).eq("id", lead.id);
  }

  // AI classification (fire and forget)
  if (lead.incident_summary) {
    classifyAndStoreLead(lead.id, lead.incident_summary, lead.matter_type)
      .catch((err) => console.error("[ai] Classification failed:", err));
  }

  // Auto-assign lead to team member (fire and forget)
  autoAssignLead({
    id: lead.id,
    client_id: lead.client_id,
    matter_type: lead.matter_type,
    incident_state: lead.incident_state,
    lead_score: scoreResult.total,
  }).catch((err) => console.error("[assignment] Failed:", err));

  // Slack notification (fire and forget)
  sendSlackLeadNotification({
    name: [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "New Lead",
    phone: lead.phone_e164,
    email: lead.email,
    matterType: lead.matter_type,
    score: scoreResult.total,
    scoreTier: scoreResult.tier,
    leadUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/intakeapp/admin/leads/${lead.id}`,
  }).catch((err) => console.error("[slack] Failed:", err));

  // Fire webhooks (fire and forget)
  fireLeadCreatedWebhook(lead).catch((err) => console.error("[webhook] Failed:", err));

  // Track A/B test conversion
  recordVariantConversion(sessionId).catch((err) => console.error("[ab-test] Failed to record conversion:", err));

  // Send email notification (fire and forget - don't block the response)
  sendLeadNotificationEmail({
    leadId: lead.id,
    firstName: lead.first_name,
    lastName: lead.last_name,
    phone: lead.phone_e164,
    email: lead.email,
    matterType: lead.matter_type,
    incidentSummary: lead.incident_summary,
    injuryStatus: lead.injury_status,
    injuryAreas: lead.injury_areas,
    medicalTreatment: lead.medical_treatment_status,
    state: lead.incident_state,
    city: lead.incident_city,
    dateRange: lead.incident_date_range,
    additionalNotes: lead.additional_notes,
    createdAt: lead.created_at,
  }).catch((err) => console.error("[email] Failed to send lead notification:", err));

  // Schedule follow-ups (fire and forget)
  scheduleFollowUps(lead.id, lead.client_id).catch((err) => console.error("[followup] Failed:", err));

  // Send SMS follow-up (fire and forget)
  sendLeadFollowUpSms({
    leadId: lead.id,
    clientId: lead.client_id,
    firstName: lead.first_name,
    phone: lead.phone_e164,
    matterType: lead.matter_type,
  }).catch((err) => console.error("[sms] Failed to send follow-up:", err));

  return lead;
}

export async function markLeadCallbackPending(leadId: string) {
  const { error } = await supabaseAdmin
    .from("leads")
    .update({ status: "callback_pending" })
    .eq("id", leadId);

  if (error) throw error;
}
