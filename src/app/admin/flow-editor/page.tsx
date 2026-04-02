import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createDefaultFlowAction, updateStepAction, deleteStepAction, moveStepAction } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = { clientId?: string };

async function getClients() {
  const { data } = await supabaseAdmin.from("clients").select("id, name").order("name");
  return data ?? [];
}

async function getFlow(clientId: string) {
  const { data: flow } = await supabaseAdmin
    .from("widget_flows")
    .select("id, name, version, status")
    .eq("client_id", clientId)
    .eq("is_default", true)
    .maybeSingle();

  if (!flow) return null;

  const [{ data: steps }, { data: branches }] = await Promise.all([
    supabaseAdmin.from("widget_steps").select("id, step_key, step_type, title, description, field_key, is_required, sort_order, config_json").eq("flow_id", flow.id).order("sort_order"),
    supabaseAdmin.from("widget_branches").select("from_step_key, to_step_key, condition_json, priority").eq("flow_id", flow.id),
  ]);

  return { flow, steps: steps ?? [], branches: branches ?? [] };
}

const STEP_TYPE_LABELS: Record<string, string> = {
  welcome: "Welcome Screen",
  single_select: "Single Select",
  multi_select: "Multi Select",
  short_text: "Short Text",
  long_text: "Long Text",
  name: "Name (first/last)",
  phone: "Phone",
  email: "Email",
  dropdown: "Dropdown",
  date_range: "Date Range",
  textarea_optional: "Optional Textarea",
  transfer_ready: "Transfer Ready",
  connecting: "Connecting",
  connected: "Connected",
  fallback: "Fallback",
  callback_confirmation: "Callback Confirm",
};

export default async function FlowEditorPage({ searchParams }: { searchParams: SearchParams }) {
  const clients = await getClients();
  const clientId = searchParams.clientId ?? clients[0]?.id;
  const flowData = clientId ? await getFlow(clientId) : null;

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <h1>Flow Editor</h1>
        <p className="muted">Edit the intake question flow for each client.</p>
      </div>

      <form className="filter-row" action="" style={{ marginBottom: 20 }}>
        <select className="text-input" name="clientId" defaultValue={clientId ?? ""} style={{ maxWidth: 320 }}>
          <option value="">Select a client</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="primary-button" type="submit" style={{ width: "auto" }}>Load</button>
      </form>

      {!clientId ? (
        <section className="admin-card"><p className="muted">Select a client, or <Link href="/admin/clients/new">create one first</Link>.</p></section>
      ) : !flowData ? (
        <section className="admin-card">
          <p className="muted">No flow exists for this client yet.</p>
          <form action={createDefaultFlowAction} style={{ marginTop: 12 }}>
            <input type="hidden" name="clientId" value={clientId} />
            <button className="primary-button" type="submit" style={{ width: "auto" }}>Create Default Intake Flow</button>
          </form>
          <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>This creates a complete personal injury intake flow with all default questions, options, and branch logic.</p>
        </section>
      ) : (
        <>
          <div className="admin-card" style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2>{flowData.flow.name}</h2>
                <p className="muted">Version {flowData.flow.version} · {flowData.flow.status} · {flowData.steps.length} steps</p>
              </div>
              <Link href={`/widget/${clients.find(c => c.id === clientId)?.name?.toLowerCase().replace(/\s+/g, '-') ?? 'demo'}`} className="admin-link" target="_blank">Preview widget →</Link>
            </div>
          </div>

          {flowData.branches.length > 0 && (
            <section className="admin-card" style={{ marginBottom: 20 }}>
              <h3>Branch Rules</h3>
              <table className="table">
                <thead><tr><th>From Step</th><th>→ To Step</th><th>Condition</th><th>Priority</th></tr></thead>
                <tbody>
                  {flowData.branches.map((b, i) => (
                    <tr key={i}>
                      <td>{b.from_step_key}</td>
                      <td>{b.to_step_key}</td>
                      <td><code style={{ fontSize: 12 }}>{JSON.stringify(b.condition_json)}</code></td>
                      <td>{b.priority}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          <div className="flow-step-list">
            {flowData.steps.map((step, idx) => (
              <section key={step.id} className="admin-card flow-step-card">
                <div className="flow-step-header">
                  <div className="flow-step-number">{idx + 1}</div>
                  <div className="flow-step-meta">
                    <span className="status-chip">{STEP_TYPE_LABELS[step.step_type] ?? step.step_type}</span>
                    {step.field_key && <span className="muted" style={{ fontSize: 12 }}>field: {step.field_key}</span>}
                    {step.is_required && <span style={{ fontSize: 12, color: "#dc2626" }}>required</span>}
                  </div>
                  <div className="flow-step-actions">
                    <form action={moveStepAction} style={{ display: "inline" }}>
                      <input type="hidden" name="stepId" value={step.id} />
                      <input type="hidden" name="flowId" value={flowData.flow.id} />
                      <input type="hidden" name="direction" value="up" />
                      <button type="submit" disabled={idx === 0} title="Move up" className="move-btn">↑</button>
                    </form>
                    <form action={moveStepAction} style={{ display: "inline" }}>
                      <input type="hidden" name="stepId" value={step.id} />
                      <input type="hidden" name="flowId" value={flowData.flow.id} />
                      <input type="hidden" name="direction" value="down" />
                      <button type="submit" disabled={idx === flowData.steps.length - 1} title="Move down" className="move-btn">↓</button>
                    </form>
                  </div>
                </div>
                <details>
                  <summary style={{ cursor: "pointer", fontWeight: 600 }}>{step.title}</summary>
                  <form action={updateStepAction} className="admin-form" style={{ marginTop: 12 }}>
                    <input type="hidden" name="stepId" value={step.id} />
                    <label className="admin-label">
                      Title
                      <input className="text-input" name="title" defaultValue={step.title} required />
                    </label>
                    <label className="admin-label">
                      Description
                      <textarea className="text-input" name="description" defaultValue={step.description ?? ""} rows={2} />
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" name="isRequired" defaultChecked={step.is_required} /> Required
                    </label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="primary-button" type="submit" style={{ width: "auto" }}>Save</button>
                      <form action={deleteStepAction} style={{ display: "inline" }}>
                        <input type="hidden" name="stepId" value={step.id} />
                        <button type="submit" className="secondary-button" style={{ width: "auto", color: "#dc2626", borderColor: "#fecaca" }}>Delete Step</button>
                      </form>
                    </div>
                  </form>
                </details>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
