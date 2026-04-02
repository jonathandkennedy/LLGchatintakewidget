import { supabaseAdmin } from "@/lib/supabase/admin";

type TeamResponseStats = {
  memberName: string;
  totalLeads: number;
  avgResponseMinutes: number;
  medianResponseMinutes: number;
  slaBreaches: number;
};

/**
 * Calculate average response time per team member.
 * Response time = time from lead created to first call attempt or status change from intake_completed.
 */
export async function getResponseTimeStats(clientId?: string, days = 30): Promise<TeamResponseStats[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Get leads with assignments
  let builder = supabaseAdmin
    .from("leads")
    .select("id, created_at, assigned_to_name, assigned_at")
    .not("assigned_to_name", "is", null)
    .not("assigned_at", "is", null)
    .gte("created_at", since)
    .limit(500);

  if (clientId) builder = builder.eq("client_id", clientId);

  const { data: leads } = await builder;
  if (!leads || leads.length === 0) return [];

  // Group by team member
  const memberData = new Map<string, number[]>();

  for (const lead of leads) {
    if (!lead.assigned_to_name || !lead.assigned_at) continue;

    const responseMs = new Date(lead.assigned_at).getTime() - new Date(lead.created_at).getTime();
    const responseMinutes = Math.max(0, Math.floor(responseMs / 60000));

    const existing = memberData.get(lead.assigned_to_name) ?? [];
    existing.push(responseMinutes);
    memberData.set(lead.assigned_to_name, existing);
  }

  const results: TeamResponseStats[] = [];

  for (const [memberName, times] of memberData) {
    const sorted = [...times].sort((a, b) => a - b);
    const avg = Math.round(times.reduce((s, t) => s + t, 0) / times.length);
    const median = sorted[Math.floor(sorted.length / 2)];
    const slaBreaches = times.filter((t) => t > 60).length;

    results.push({
      memberName,
      totalLeads: times.length,
      avgResponseMinutes: avg,
      medianResponseMinutes: median,
      slaBreaches,
    });
  }

  return results.sort((a, b) => a.avgResponseMinutes - b.avgResponseMinutes);
}

export function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
