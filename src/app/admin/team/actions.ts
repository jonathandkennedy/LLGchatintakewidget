"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/monitoring/audit";

export async function createAssignmentRuleAction(formData: FormData) {
  const clientId = String(formData.get("clientId") ?? "");
  const memberId = String(formData.get("memberId") ?? "").trim();
  const memberName = String(formData.get("memberName") ?? "").trim();
  const memberEmail = String(formData.get("memberEmail") ?? "").trim();
  const matterTypes = formData.getAll("matterTypes").map(String).filter(Boolean);
  const states = formData.getAll("states").map(String).filter(Boolean);
  const minScore = parseInt(String(formData.get("minScore") ?? ""), 10);
  const maxLeads = parseInt(String(formData.get("maxLeads") ?? ""), 10);
  const priority = parseInt(String(formData.get("priority") ?? "1"), 10);

  if (!clientId || !memberName) return;

  const id = memberId || crypto.randomUUID();

  await supabaseAdmin.from("assignment_rules").insert({
    client_id: clientId,
    team_member_id: id,
    team_member_name: memberName,
    team_member_email: memberEmail || null,
    matter_types: matterTypes.length > 0 ? matterTypes : null,
    states: states.length > 0 ? states : null,
    min_score: isNaN(minScore) ? null : minScore,
    max_active_leads: isNaN(maxLeads) ? null : maxLeads,
    priority,
    is_active: true,
  });

  logAudit({ action: "lead.assigned", actor: "admin", details: { memberName, matterTypes, states } });
  revalidatePath("/admin/team");
}

export async function deleteRuleAction(formData: FormData) {
  const ruleId = String(formData.get("ruleId") ?? "");
  if (!ruleId) return;
  await supabaseAdmin.from("assignment_rules").delete().eq("id", ruleId);
  revalidatePath("/admin/team");
}

export async function toggleRuleAction(formData: FormData) {
  const ruleId = String(formData.get("ruleId") ?? "");
  const isActive = formData.get("isActive") === "true";
  if (!ruleId) return;
  await supabaseAdmin.from("assignment_rules").update({ is_active: !isActive }).eq("id", ruleId);
  revalidatePath("/admin/team");
}
