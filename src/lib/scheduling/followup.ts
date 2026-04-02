import { supabaseAdmin } from "@/lib/supabase/admin";

type FollowUpRule = {
  id: string;
  client_id: string;
  delay_minutes: number;
  channel: "sms" | "email";
  template: string;
  is_active: boolean;
};

/**
 * Schedule a follow-up for a lead based on client's follow-up rules.
 * Creates entries in the `scheduled_followups` table.
 */
export async function scheduleFollowUps(leadId: string, clientId: string): Promise<void> {
  const { data: rules } = await supabaseAdmin
    .from("followup_rules")
    .select("*")
    .eq("client_id", clientId)
    .eq("is_active", true)
    .order("delay_minutes");

  if (!rules || rules.length === 0) return;

  const now = Date.now();
  const inserts = (rules as FollowUpRule[]).map((rule) => ({
    lead_id: leadId,
    client_id: clientId,
    rule_id: rule.id,
    channel: rule.channel,
    template: rule.template,
    scheduled_at: new Date(now + rule.delay_minutes * 60000).toISOString(),
    status: "pending",
  }));

  await supabaseAdmin.from("scheduled_followups").insert(inserts);
}

/**
 * Get pending follow-ups that are due.
 * Called by a cron job or scheduled function.
 */
export async function getDueFollowUps() {
  const { data } = await supabaseAdmin
    .from("scheduled_followups")
    .select("id, lead_id, client_id, channel, template, scheduled_at")
    .eq("status", "pending")
    .lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at")
    .limit(50);

  return data ?? [];
}

/**
 * Mark a follow-up as sent.
 */
export async function markFollowUpSent(followUpId: string): Promise<void> {
  await supabaseAdmin
    .from("scheduled_followups")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", followUpId);
}

/**
 * Get follow-up history for a lead.
 */
export async function getLeadFollowUps(leadId: string) {
  const { data } = await supabaseAdmin
    .from("scheduled_followups")
    .select("id, channel, template, scheduled_at, status, sent_at")
    .eq("lead_id", leadId)
    .order("scheduled_at");

  return data ?? [];
}
