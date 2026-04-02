import { supabaseAdmin } from "@/lib/supabase/admin";

type LeadForAssignment = {
  id: string;
  client_id: string;
  matter_type?: string | null;
  incident_state?: string | null;
  lead_score?: number | null;
};

type AssignmentRule = {
  id: string;
  team_member_id: string;
  team_member_name: string;
  team_member_email: string;
  matter_types: string[] | null;
  states: string[] | null;
  min_score: number | null;
  max_active_leads: number | null;
  priority: number;
};

/**
 * Auto-assign a lead to a team member based on routing rules.
 * Rules are checked in priority order. First matching rule wins.
 * Falls back to round-robin if no rules match.
 */
export async function autoAssignLead(lead: LeadForAssignment): Promise<void> {
  // Get assignment rules for this client
  const { data: rules } = await supabaseAdmin
    .from("assignment_rules")
    .select("id, team_member_id, team_member_name, team_member_email, matter_types, states, min_score, max_active_leads, priority")
    .eq("client_id", lead.client_id)
    .eq("is_active", true)
    .order("priority");

  if (!rules || rules.length === 0) return;

  for (const rule of rules as AssignmentRule[]) {
    // Check matter type filter
    if (rule.matter_types && rule.matter_types.length > 0) {
      if (!lead.matter_type || !rule.matter_types.includes(lead.matter_type)) continue;
    }

    // Check state filter
    if (rule.states && rule.states.length > 0) {
      if (!lead.incident_state || !rule.states.some((s) => s.toLowerCase() === (lead.incident_state ?? "").toLowerCase())) continue;
    }

    // Check minimum score
    if (rule.min_score != null && (lead.lead_score ?? 0) < rule.min_score) continue;

    // Check max active leads capacity
    if (rule.max_active_leads != null) {
      const { count } = await supabaseAdmin
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("assigned_to", rule.team_member_id)
        .in("status", ["intake_completed", "transfer_attempted", "callback_pending"]);

      if ((count ?? 0) >= rule.max_active_leads) continue;
    }

    // All checks passed - assign the lead
    await supabaseAdmin.from("leads").update({
      assigned_to: rule.team_member_id,
      assigned_to_name: rule.team_member_name,
      assigned_at: new Date().toISOString(),
    }).eq("id", lead.id);

    return;
  }

  // No rule matched - round robin among all active team members for this client
  const allMembers = rules.map((r) => ({
    id: r.team_member_id,
    name: r.team_member_name,
  }));

  if (allMembers.length === 0) return;

  // Count current assignments per member
  const counts = new Map<string, number>();
  for (const member of allMembers) {
    const { count } = await supabaseAdmin
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("assigned_to", member.id)
      .in("status", ["intake_completed", "transfer_attempted", "callback_pending"]);
    counts.set(member.id, count ?? 0);
  }

  // Pick the member with fewest active leads
  const sorted = allMembers.sort((a, b) => (counts.get(a.id) ?? 0) - (counts.get(b.id) ?? 0));
  const winner = sorted[0];

  await supabaseAdmin.from("leads").update({
    assigned_to: winner.id,
    assigned_to_name: winner.name,
    assigned_at: new Date().toISOString(),
  }).eq("id", lead.id);
}
