import { supabaseAdmin } from "@/lib/supabase/admin";
import { createAssignmentRuleAction, deleteRuleAction, toggleRuleAction } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = { clientId?: string };

async function getClients() {
  const { data } = await supabaseAdmin.from("clients").select("id, name").order("name");
  return data ?? [];
}

async function getRules(clientId: string) {
  const { data } = await supabaseAdmin
    .from("assignment_rules")
    .select("*")
    .eq("client_id", clientId)
    .order("priority");
  return data ?? [];
}

const MATTER_OPTIONS = [
  { key: "car_accident", label: "Car Accident" },
  { key: "truck_accident", label: "Truck Accident" },
  { key: "motorcycle_accident", label: "Motorcycle Accident" },
  { key: "slip_fall", label: "Slip & Fall" },
  { key: "wrongful_death", label: "Wrongful Death" },
  { key: "other_injury", label: "Other" },
];

const STATE_OPTIONS = ["Arizona", "California", "Nevada", "Washington"];

export default async function TeamPage({ searchParams }: { searchParams: SearchParams }) {
  const clients = await getClients();
  const clientId = searchParams.clientId ?? clients[0]?.id;
  const rules = clientId ? await getRules(clientId) : [];

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <h1>Team &amp; Assignment</h1>
        <p className="muted">Configure team members and auto-assignment rules for incoming leads.</p>
      </div>

      <form className="filter-row" action="" style={{ marginBottom: 20, display: "flex", gap: 12, alignItems: "center" }}>
        <select className="text-input" name="clientId" defaultValue={clientId ?? ""} style={{ maxWidth: 320 }}>
          <option value="">Select a client</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="primary-button" type="submit" style={{ width: "auto" }}>Load</button>
      </form>

      {clientId && (
        <>
          {/* Add team member */}
          <section className="admin-card" style={{ marginBottom: 24 }}>
            <h2>Add Assignment Rule</h2>
            <form action={createAssignmentRuleAction} className="admin-form" style={{ marginTop: 12 }}>
              <input type="hidden" name="clientId" value={clientId} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label className="admin-label">
                  Name
                  <input className="text-input" name="memberName" placeholder="John Smith" required />
                </label>
                <label className="admin-label">
                  Email
                  <input className="text-input" name="memberEmail" placeholder="john@firm.com" type="email" />
                </label>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label className="admin-label">
                  Priority (lower = first)
                  <input className="text-input" name="priority" type="number" defaultValue="1" min="1" />
                </label>
                <label className="admin-label">
                  Max Active Leads
                  <input className="text-input" name="maxLeads" type="number" placeholder="No limit" />
                </label>
              </div>
              <label className="admin-label">
                Min Lead Score
                <input className="text-input" name="minScore" type="number" placeholder="No minimum" min="0" max="100" />
              </label>
              <div>
                <div className="muted text-sm" style={{ fontWeight: 600, marginBottom: 6 }}>Matter Types (leave unchecked for all)</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {MATTER_OPTIONS.map((m) => (
                    <label key={m.key} className="checkbox-label">
                      <input type="checkbox" name="matterTypes" value={m.key} /> {m.label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <div className="muted text-sm" style={{ fontWeight: 600, marginBottom: 6 }}>States (leave unchecked for all)</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {STATE_OPTIONS.map((s) => (
                    <label key={s} className="checkbox-label">
                      <input type="checkbox" name="states" value={s} /> {s}
                    </label>
                  ))}
                </div>
              </div>
              <button className="primary-button" type="submit" style={{ width: "auto" }}>Add Rule</button>
            </form>
          </section>

          {/* Existing rules */}
          {rules.length === 0 ? (
            <section className="admin-card"><p className="muted">No assignment rules. Leads won&apos;t be auto-assigned.</p></section>
          ) : (
            <section className="admin-card">
              <h2>Assignment Rules</h2>
              <p className="muted text-sm" style={{ marginBottom: 16 }}>Rules are evaluated in priority order. First match wins. If no match, round-robin.</p>
              <table className="table">
                <thead>
                  <tr>
                    <th>Priority</th>
                    <th>Team Member</th>
                    <th>Filters</th>
                    <th>Capacity</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule) => (
                    <tr key={rule.id}>
                      <td><strong>{rule.priority}</strong></td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{rule.team_member_name}</div>
                        {rule.team_member_email && <div className="muted text-sm">{rule.team_member_email}</div>}
                      </td>
                      <td>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {(rule.matter_types as string[] | null)?.map((m) => <span key={m} className="status-chip" style={{ fontSize: 10 }}>{m}</span>)}
                          {(rule.states as string[] | null)?.map((s) => <span key={s} className="status-chip" style={{ fontSize: 10 }}>{s}</span>)}
                          {rule.min_score != null && <span className="status-chip" style={{ fontSize: 10 }}>Score &ge;{rule.min_score}</span>}
                          {!(rule.matter_types as string[] | null)?.length && !(rule.states as string[] | null)?.length && rule.min_score == null && <span className="muted text-sm">All leads</span>}
                        </div>
                      </td>
                      <td>{rule.max_active_leads != null ? `${rule.max_active_leads} max` : "Unlimited"}</td>
                      <td>
                        <span className={`score-badge score-${rule.is_active ? "warm" : "cold"}`}>{rule.is_active ? "Active" : "Paused"}</span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 4 }}>
                          <form action={toggleRuleAction}>
                            <input type="hidden" name="ruleId" value={rule.id} />
                            <input type="hidden" name="isActive" value={String(rule.is_active)} />
                            <button type="submit" className="move-btn" style={{ width: 28, height: 28, fontSize: 11 }}>{rule.is_active ? "||" : "\u25B6"}</button>
                          </form>
                          <form action={deleteRuleAction}>
                            <input type="hidden" name="ruleId" value={rule.id} />
                            <button type="submit" className="move-btn" style={{ width: 28, height: 28, fontSize: 12, color: "var(--error)" }}>&times;</button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}
    </div>
  );
}
