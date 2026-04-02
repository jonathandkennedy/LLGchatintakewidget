import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { updateLeadStatusAction } from "./statusAction";
import { scoreLeadData, getScoreLabel } from "@/lib/scoring/lead-score";
import { estimateLeadValue, formatCurrency } from "@/lib/scoring/lead-value";
import { LeadNotes } from "@/components/admin/LeadNotes";
import { LeadTimeline } from "@/components/admin/LeadTimeline";
import { SessionReplay } from "@/components/admin/SessionReplay";
import { LeadTags } from "@/components/admin/LeadTags";

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
        <div style={{ marginTop: 8 }}>
          <LeadTags leadId={lead.id} />
        </div>

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

      <LeadScoreCard lead={lead} />
      <LeadValueCard lead={lead} />

      {lead.sentiment_urgency != null && (
        <section className="panel">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2>Sentiment Analysis</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className={`score-badge score-lg score-${(lead.sentiment_urgency ?? 0) >= 7 ? "hot" : (lead.sentiment_urgency ?? 0) >= 4 ? "warm" : "cool"}`}>{lead.sentiment_urgency}/10</span>
              <span className="muted" style={{ fontWeight: 600 }}>{lead.sentiment_tone}</span>
            </div>
          </div>
          {lead.sentiment_signals && (lead.sentiment_signals as string[]).length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
              {(lead.sentiment_signals as string[]).map((s: string, i: number) => <span key={i} className="status-chip">{s}</span>)}
            </div>
          )}
        </section>
      )}

      {lead.ai_summary && (
        <section className="panel">
          <h2>AI Analysis</h2>
          <div className="kpi-grid" style={{ marginTop: 12 }}>
            <div className="kpi-card">
              <div className="muted text-sm">Severity</div>
              <strong><span className={`score-badge score-${lead.ai_severity === "critical" ? "hot" : lead.ai_severity === "high" ? "warm" : lead.ai_severity === "medium" ? "medium" : "cool"}`}>{lead.ai_severity}</span></strong>
            </div>
            <div className="kpi-card">
              <div className="muted text-sm">Urgency</div>
              <strong>{lead.ai_urgency}</strong>
            </div>
            <div className="kpi-card">
              <div className="muted text-sm">AI Summary</div>
              <strong style={{ fontSize: 13, fontWeight: 500 }}>{lead.ai_summary}</strong>
            </div>
          </div>
          {lead.ai_key_facts && lead.ai_key_facts.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div className="muted text-sm" style={{ marginBottom: 6, fontWeight: 600 }}>Key Facts</div>
              <ul style={{ margin: 0, paddingLeft: 18, color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.7 }}>
                {(lead.ai_key_facts as string[]).map((f: string, i: number) => <li key={i}>{f}</li>)}
              </ul>
            </div>
          )}
          {lead.ai_liability_indicators && lead.ai_liability_indicators.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div className="muted text-sm" style={{ marginBottom: 6, fontWeight: 600 }}>Liability Indicators</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(lead.ai_liability_indicators as string[]).map((ind: string, i: number) => <span key={i} className="status-chip">{ind}</span>)}
              </div>
            </div>
          )}
        </section>
      )}

      <section className="panel">
        <h2>Session Replay</h2>
        <div style={{ marginTop: 12 }}>
          <SessionReplay answers={answers} sessionStarted={lead.created_at} />
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

      <section className="panel">
        <h2>Timeline</h2>
        <div style={{ marginTop: 12 }}>
          <LeadTimeline lead={lead} answers={answers} calls={calls} sms={sms} />
        </div>
      </section>

      <section className="panel">
        <h2>Internal Notes</h2>
        <div style={{ marginTop: 12 }}>
          <LeadNotes leadId={lead.id} />
        </div>
      </section>
    </main>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function LeadScoreCard({ lead }: { lead: Record<string, any> }) {
  const score = scoreLeadData({
    matter_type: lead.matter_type,
    injury_status: lead.injury_status,
    injury_areas: lead.injury_areas,
    medical_treatment_status: lead.medical_treatment_status,
    incident_state: lead.incident_state,
    incident_date_range: lead.incident_date_range,
    phone_e164: lead.phone_e164,
    email: lead.email,
  });

  return (
    <section className="panel">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2>Lead Score</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className={`score-badge score-lg score-${score.tier}`}>{score.total}</span>
          <span className={`score-tier-label score-${score.tier}`}>{getScoreLabel(score.tier)}</span>
        </div>
      </div>
      <div className="score-factors">
        {score.factors.map((f) => (
          <div key={f.label} className="score-factor-row">
            <span className="score-factor-label">{f.label}</span>
            <div className="score-factor-bar-track">
              <div
                className={`score-factor-bar-fill score-${score.tier}`}
                style={{ width: `${f.maxPoints > 0 ? (f.points / f.maxPoints) * 100 : 0}%` }}
              />
            </div>
            <span className="score-factor-value">{f.points}/{f.maxPoints}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function LeadValueCard({ lead }: { lead: Record<string, any> }) {
  const value = estimateLeadValue({
    matterType: lead.matter_type,
    injuryStatus: lead.injury_status,
    injuryAreas: lead.injury_areas,
    medicalTreatment: lead.medical_treatment_status,
    incidentState: lead.incident_state,
  });

  return (
    <section className="panel">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h2>Estimated Case Value</h2>
        <span className={`score-badge score-lg score-${value.confidence === "high" ? "warm" : value.confidence === "medium" ? "medium" : "cool"}`}>
          {value.confidence}
        </span>
      </div>
      <div className="kpi-grid" style={{ marginTop: 0 }}>
        <div className="kpi-card">
          <div className="muted text-sm">Low</div>
          <strong>{formatCurrency(value.lowEstimate)}</strong>
        </div>
        <div className="kpi-card" style={{ borderColor: "var(--primary)", background: "var(--primary-weak)" }}>
          <div className="muted text-sm">Mid Estimate</div>
          <strong style={{ fontSize: 20, color: "var(--primary)" }}>{formatCurrency(value.midEstimate)}</strong>
        </div>
        <div className="kpi-card">
          <div className="muted text-sm">High</div>
          <strong>{formatCurrency(value.highEstimate)}</strong>
        </div>
      </div>
      {value.factors.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
          {value.factors.map((f, i) => <span key={i} className="status-chip" style={{ fontSize: 11 }}>{f}</span>)}
        </div>
      )}
    </section>
  );
}
