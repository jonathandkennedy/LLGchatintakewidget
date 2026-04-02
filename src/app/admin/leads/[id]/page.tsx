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
      <main className="page-shell">
        <section className="panel">
          <h1>Lead not found</h1>
          <Link href="/admin/leads">Back to leads</Link>
        </section>
      </main>
    );
  }

  const { lead, answers, calls, sms } = bundle;
  const name = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Unknown lead";

  return (
    <main className="page-shell detail-grid">
      <section className="panel">
        <div className="eyebrow">Lead detail</div>
        <h1>{name}</h1>
        <p className="muted text-sm" style={{ marginTop: 4 }}>{lead.matter_type ?? "Unknown matter type"} &middot; {lead.phone_e164 ?? "No phone"}</p>

        <form action={updateLeadStatusAction} className="stack" style={{ marginTop: 20 }}>
          <input type="hidden" name="leadId" value={lead.id} />
          <label className="muted text-sm" style={{ fontWeight: 500 }}>Lead status</label>
          <select className="text-input" name="status" defaultValue={lead.status}>
            <option value="started">started</option>
            <option value="intake_completed">intake_completed</option>
            <option value="transfer_attempted">transfer_attempted</option>
            <option value="call_connected">call_connected</option>
            <option value="callback_pending">callback_pending</option>
            <option value="closed_contacted">closed_contacted</option>
            <option value="closed_uncontacted">closed_uncontacted</option>
          </select>
          <button className="primary-button" type="submit">Update status</button>
        </form>

        <div className="kpi-grid">
          <div className="kpi-card"><div className="muted text-sm">Created</div><strong>{new Date(lead.created_at).toLocaleString()}</strong></div>
          <div className="kpi-card"><div className="muted text-sm">Current status</div><strong>{lead.status}</strong></div>
          <div className="kpi-card"><div className="muted text-sm">Email</div><strong>{lead.email ?? "\u2014"}</strong></div>
        </div>
      </section>

      <section className="panel">
        <h2>Intake answers</h2>
        <table className="table" style={{ marginTop: 16 }}>
          <thead><tr><th>Field</th><th>Value</th></tr></thead>
          <tbody>
            {answers.map((answer) => (
              <tr key={answer.id}>
                <td>{answer.field_key}</td>
                <td>{answer.value_text ?? JSON.stringify(answer.value_json)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2>Call attempts</h2>
        <table className="table" style={{ marginTop: 16 }}>
          <thead><tr><th>Status</th><th>Destination</th><th>Started</th><th>Reason</th></tr></thead>
          <tbody>
            {calls.map((call) => (
              <tr key={call.id}>
                <td>{call.status}</td>
                <td>{call.destination_number_e164}</td>
                <td>{new Date(call.started_at).toLocaleString()}</td>
                <td>{call.failure_reason ?? "\u2014"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2>SMS messages</h2>
        <table className="table" style={{ marginTop: 16 }}>
          <thead><tr><th>Direction</th><th>Status</th><th>To</th><th>Message</th></tr></thead>
          <tbody>
            {sms.map((message) => (
              <tr key={message.id}>
                <td>{message.direction}</td>
                <td>{message.status}</td>
                <td>{message.to_number_e164}</td>
                <td>{message.message_body}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 20 }}><Link href="/admin/leads">Back to leads</Link></div>
      </section>
    </main>
  );
}
