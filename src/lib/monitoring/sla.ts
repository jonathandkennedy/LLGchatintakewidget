import { supabaseAdmin } from "@/lib/supabase/admin";

type SLABreachLead = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  matter_type: string | null;
  status: string;
  created_at: string;
  lead_score: number | null;
  lead_score_tier: string | null;
  assigned_to_name: string | null;
  minutes_since_created: number;
};

/**
 * Get leads that haven't been contacted within the SLA window.
 * Default SLA: 15 minutes for hot leads, 60 minutes for others.
 */
export async function getBreachedLeads(clientId?: string): Promise<SLABreachLead[]> {
  const hotSlaMinutes = parseInt(process.env.SLA_HOT_MINUTES ?? "15", 10);
  const defaultSlaMinutes = parseInt(process.env.SLA_DEFAULT_MINUTES ?? "60", 10);

  // Get leads that are still in intake_completed or callback_pending (not yet contacted)
  let builder = supabaseAdmin
    .from("leads")
    .select("id, first_name, last_name, matter_type, status, created_at, lead_score, lead_score_tier, assigned_to_name")
    .in("status", ["intake_completed", "callback_pending"])
    .order("created_at", { ascending: true })
    .limit(100);

  if (clientId) builder = builder.eq("client_id", clientId);

  const { data: leads } = await builder;
  if (!leads) return [];

  const now = Date.now();
  const breached: SLABreachLead[] = [];

  for (const lead of leads) {
    const createdMs = new Date(lead.created_at).getTime();
    const minutesSince = Math.floor((now - createdMs) / 60000);

    const isHot = lead.lead_score_tier === "hot" || lead.lead_score_tier === "warm";
    const slaMinutes = isHot ? hotSlaMinutes : defaultSlaMinutes;

    if (minutesSince > slaMinutes) {
      breached.push({
        ...lead,
        minutes_since_created: minutesSince,
      });
    }
  }

  return breached;
}

/**
 * Format minutes into a human-readable string.
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}
