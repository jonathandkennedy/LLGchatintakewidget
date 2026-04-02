import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { updateLeadStatusAction } from "./statusAction";

export const dynamic = "force-dynamic";

async function getLeadBundle(id: string) {
  const { data: lead } = await supabaseAdmin.from("leads").select("*").eq("id", id).single();
  if (!lead) return null;

  const [{ data: answers }, { data: calls }, { data: sms }] = await Promise.all([
    supabaseAdmin.from("lead_session_answers").select("*").eq("session_id", lead.session_id).order("created_at", { ascending: true }),
    supabaseAdmin.from("call_attempts").select("*").eq("lead_id", id).order("started_at", { ascending: false }),
    supabaseAdmin.from("sms_messages").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
  ]);

  return { lead, answers: answers ?? [], calls: calls ?? [], sms: sms ?? [] };
}

export default async function AdminLeadDetailPage({ params }: { params: { id: string } }) {
  const bundle = await getLeadBundle(params.id);

  if (!bundle) {
    return (
      <div className="admin-content">
        <section className="admin-card">
          <h1>Lead not found</h1>
          <Link href="/admin/leads">← Back to leads</Link>
        </section>
      </div>
    );
  }

  const { lead, answers, calls, sms } = bundle;
  const name = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Unknown lead";

  return (
    <div className="admin-content detail-grid">
      <div className="admin-page-header">
        <div>
          <Link href="/admin/leads" className="admin-link">← Back to leads</Link>
          <h1 style={{ marginTop: 8 }}>{name}</h1>
          <p className="muted">{lead.matter_type ?? "Unknown matter type"} · {lead.phone_e164 ?? "No phone"} · {lead.email ?? "No email"}</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <section className="admin-card">
          <h2>Lead Info</h2>
          <div className="kpi-grid" style={{ marginTop: 12 }}>
            <div className="kpi-card"><div className="kpi-label">Created</div><strong>{new Date(lead.created_at).toLocaleString()}</strong></div>
            <div className="kpi-card"><div className="kpi-label">Status</div><span className="status-chip">{lead.status}</span></div>
            <div className="kpi-card"><div className="kpi-label">Location</div><strong>{[lead.incident_city, lead.incident_state].filter(Boolean).join(", ") || "—"}</strong></div>
          </div>
        </section>

        <section className="admin-card">
          <h2>Update Status</h2>
          <form action={updateLeadStatusAction} className="admin-form">
            <input type="hidden" name="leadId" value={lead.id} />
            <select className="text-input" name="status" defaultValue={lead.status}>
              <option value="opened">opened</option>
              <option value="started">started</option>
              <option value="in_progress">in_progress</option>
              <option value="intake_completed">intake_completed</option>
              <option value="transfer_attempted">transfer_attempted</option>
              <option value="call_connected">call_connected</option>
              <option value="callback_pending">callback_pending</option>
              <option value="closed_contacted">closed_contacted</option>
              <option value="closed_uncontacted">closed_uncontacted</option>
            </select>
            <button className="primary-button" type="submit">Update Status</button>
          </form>
        </section>
      </div>

      <section className="admin-card">
        <h2>Intake Answers</h2>
        {answers.length === 0 ? <p className="muted">No answers recorded.</p> : (
          <table className="table">
            <thead><tr><th>Field</th><th>Value</th></tr></thead>
            <tbody>
              {answers.map((answer) => (
                <tr key={answer.id}>
                  <td><strong>{answer.field_key}</strong></td>
                  <td>{answer.value_text ?? JSON.stringify(answer.value_json)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="admin-card">
        <h2>Call Attempts</h2>
        {calls.length === 0 ? <p className="muted">No call attempts.</p> : (
          <table className="table">
            <thead><tr><th>Status</th><th>Destination</th><th>Started</th><th>Connected</th><th>Failure Reason</th></tr></thead>
            <tbody>
              {calls.map((call) => (
                <tr key={call.id}>
                  <td><span className="status-chip">{call.status}</span></td>
                  <td>{call.destination_number_e164}</td>
                  <td>{new Date(call.started_at).toLocaleString()}</td>
                  <td>{call.connected_at ? new Date(call.connected_at).toLocaleString() : "—"}</td>
                  <td>{call.failure_reason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {sms.length > 0 && (
        <section className="admin-card">
          <h2>SMS Messages</h2>
          <table className="table">
            <thead><tr><th>Direction</th><th>Status</th><th>To</th><th>Message</th><th>Sent</th></tr></thead>
            <tbody>
              {sms.map((message) => (
                <tr key={message.id}>
                  <td>{message.direction}</td>
                  <td><span className="status-chip">{message.status}</span></td>
                  <td>{message.to_number_e164}</td>
                  <td style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis" }}>{message.message_body}</td>
                  <td>{new Date(message.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
