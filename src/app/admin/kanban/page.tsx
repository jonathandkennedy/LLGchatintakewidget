import { supabaseAdmin } from "@/lib/supabase/admin";
import { KanbanBoard } from "@/components/admin/KanbanBoard";

export const dynamic = "force-dynamic";

async function getLeads() {
  const { data } = await supabaseAdmin
    .from("leads")
    .select("id, first_name, last_name, matter_type, status, lead_score, lead_score_tier, created_at, assigned_to_name")
    .in("status", ["intake_completed", "callback_pending", "transfer_attempted", "call_connected", "closed_contacted"])
    .order("created_at", { ascending: false })
    .limit(200);
  return data ?? [];
}

export default async function KanbanPage() {
  const leads = await getLeads();

  return (
    <div className="admin-content" style={{ maxWidth: "none" }}>
      <div className="admin-page-header">
        <h1>Kanban Board</h1>
        <p className="muted">Drag leads between columns to update their status.</p>
      </div>
      <KanbanBoard leads={leads} />
    </div>
  );
}
