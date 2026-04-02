import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function getPriorityLeads() {
  // Get uncontacted leads, sorted by composite priority:
  // score DESC, recency DESC (newer = higher priority)
  const { data } = await supabaseAdmin
    .from("leads")
    .select("id, first_name, last_name, matter_type, status, lead_score, lead_score_tier, created_at, assigned_to_name, phone_e164, sentiment_urgency, ai_severity")
    .in("status", ["intake_completed", "callback_pending"])
    .order("lead_score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  return data ?? [];
}

function timeAgo(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default async function PriorityQueuePage() {
  const leads = await getPriorityLeads();

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <h1>Priority Queue</h1>
        <p className="muted">Leads awaiting contact, sorted by score and recency. Work from the top.</p>
      </div>

      <section className="admin-card">
        {leads.length === 0 ? (
          <p className="muted" style={{ textAlign: "center", padding: 32 }}>No leads waiting. All caught up!</p>
        ) : (
          <div className="priority-list">
            {leads.map((lead, idx) => {
              const name = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Unknown";
              const waitMins = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / 60000);
              const isUrgent = waitMins > 30 || (lead.lead_score ?? 0) >= 70;

              return (
                <div key={lead.id} className={`priority-item ${isUrgent ? "urgent" : ""}`}>
                  <div className="priority-rank">{idx + 1}</div>
                  <div className="priority-info">
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Link href={`/admin/leads/${lead.id}`} style={{ fontWeight: 700, fontSize: 15 }}>{name}</Link>
                      {lead.lead_score != null && <span className={`score-badge score-${lead.lead_score_tier ?? "cold"}`}>{lead.lead_score}</span>}
                      {lead.ai_severity === "critical" && <span className="score-badge score-hot">CRITICAL</span>}
                      {(lead.sentiment_urgency ?? 0) >= 7 && <span className="score-badge score-hot">URGENT</span>}
                    </div>
                    <div className="priority-meta">
                      <span>{lead.matter_type?.replace(/_/g, " ") ?? "Unknown"}</span>
                      <span>{lead.phone_e164 ?? "No phone"}</span>
                      <span>{lead.assigned_to_name ?? "Unassigned"}</span>
                      <span style={{ color: waitMins > 60 ? "var(--error)" : waitMins > 30 ? "var(--warning)" : "var(--muted)" }}>
                        Waiting {timeAgo(lead.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="priority-actions">
                    <Link href={`/admin/leads/${lead.id}`} className="primary-button" style={{ width: "auto", padding: "8px 16px", fontSize: 13 }}>View</Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
