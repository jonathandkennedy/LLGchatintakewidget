import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createDefaultFlowAction, updateStepAction, deleteStepAction, moveStepAction, addStepAction, updateOptionAction } from "./actions";

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

  const [{ data: steps }, { data: branches }, { data: options }] = await Promise.all([
    supabaseAdmin.from("widget_steps").select("id, step_key, step_type, title, description, field_key, is_required, sort_order, config_json").eq("flow_id", flow.id).order("sort_order"),
    supabaseAdmin.from("widget_branches").select("from_step_key, to_step_key, condition_json, priority").eq("flow_id", flow.id),
    supabaseAdmin.from("widget_step_options").select("id, step_id, option_key, label, label_es, sort_order").eq("flow_id", flow.id).order("sort_order"),
  ]);

  return { flow, steps: steps ?? [], branches: branches ?? [], options: options ?? [] };
}

const STEP_TYPE_LABELS: Record<string, string> = {
  welcome: "Welcome", single_select: "Single Select", multi_select: "Multi Select",
  short_text: "Short Text", long_text: "Long Text", name: "Name",
  phone: "Phone", email: "Email", dropdown: "Dropdown",
  date_range: "Date Range", textarea_optional: "Optional Text",
  transfer_ready: "Transfer", connecting: "Connecting",
  connected: "Connected", fallback: "Fallback", callback_confirmation: "Callback",
};

const STEP_TYPES = [
  "welcome", "single_select", "multi_select", "short_text", "long_text",
  "name", "phone", "email", "dropdown", "date_range", "textarea_optional",
  "transfer_ready",
];

export default async function FlowEditorPage({ searchParams }: { searchParams: SearchParams }) {
  const clients = await getClients();
  const clientId = searchParams.clientId ?? clients[0]?.id;
  const flowData = clientId ? await getFlow(clientId) : null;

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <h1>Flow Editor</h1>
        <p className="muted">Edit intake steps, add translations, and manage the question flow.</p>
      </div>

      <form className="filter-row" action="" style={{ marginBottom: 20, display: "flex", gap: 12, alignItems: "center" }}>
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
        </section>
      ) : (
        <>
          <div className="admin-card" style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2>{flowData.flow.name}</h2>
                <p className="muted text-sm">{flowData.steps.length} steps &middot; Version {flowData.flow.version} &middot; {flowData.flow.status}</p>
              </div>
            </div>
          </div>

          {flowData.branches.length > 0 && (
            <section className="admin-card" style={{ marginBottom: 20 }}>
              <h3>Branch Rules</h3>
              <table className="table" style={{ marginTop: 12 }}>
                <thead><tr><th>From</th><th>To</th><th>Condition</th><th>Priority</th></tr></thead>
                <tbody>
                  {flowData.branches.map((b, i) => (
                    <tr key={i}>
                      <td>{b.from_step_key}</td>
                      <td>{b.to_step_key}</td>
                      <td><code style={{ fontSize: 11 }}>{JSON.stringify(b.condition_json)}</code></td>
                      <td>{b.priority}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          <div className="flow-step-list">
            {flowData.steps.map((step, idx) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const config = (step.config_json as Record<string, any>) ?? {};
              const stepOptions = flowData.options.filter((o) => o.step_id === step.id);

              return (
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
                        <button type="submit" disabled={idx === 0} title="Move up" className="move-btn">&#8593;</button>
                      </form>
                      <form action={moveStepAction} style={{ display: "inline" }}>
                        <input type="hidden" name="stepId" value={step.id} />
                        <input type="hidden" name="flowId" value={flowData.flow.id} />
                        <input type="hidden" name="direction" value="down" />
                        <button type="submit" disabled={idx === flowData.steps.length - 1} title="Move down" className="move-btn">&#8595;</button>
                      </form>
                    </div>
                  </div>

                  <details>
                    <summary style={{ cursor: "pointer", fontWeight: 600, marginTop: 8 }}>{step.title}</summary>
                    <form action={updateStepAction} className="admin-form" style={{ marginTop: 12 }}>
                      <input type="hidden" name="stepId" value={step.id} />

                      {/* English */}
                      <div className="flow-lang-section">
                        <div className="flow-lang-tag">English</div>
                        <label className="admin-label">
                          Title
                          <input className="text-input" name="title" defaultValue={step.title} required />
                        </label>
                        <label className="admin-label">
                          Description
                          <textarea className="text-input" name="description" defaultValue={step.description ?? ""} rows={2} />
                        </label>
                        {(step.step_type === "short_text" || step.step_type === "long_text" || step.step_type === "textarea_optional") && (
                          <label className="admin-label">
                            Placeholder
                            <input className="text-input" name="placeholder" defaultValue={config.placeholder ?? ""} />
                          </label>
                        )}
                      </div>

                      {/* Spanish */}
                      <div className="flow-lang-section">
                        <div className="flow-lang-tag es">Espa&ntilde;ol</div>
                        <label className="admin-label">
                          Title (Spanish)
                          <input className="text-input" name="title_es" defaultValue={config.title_es ?? ""} placeholder="Spanish translation..." />
                        </label>
                        <label className="admin-label">
                          Description (Spanish)
                          <textarea className="text-input" name="description_es" defaultValue={config.description_es ?? ""} rows={2} placeholder="Spanish translation..." />
                        </label>
                        {(step.step_type === "short_text" || step.step_type === "long_text" || step.step_type === "textarea_optional") && (
                          <label className="admin-label">
                            Placeholder (Spanish)
                            <input className="text-input" name="placeholder_es" defaultValue={config.placeholder_es ?? ""} placeholder="Spanish translation..." />
                          </label>
                        )}
                      </div>

                      <label className="checkbox-label">
                        <input type="checkbox" name="isRequired" defaultChecked={step.is_required} /> Required
                      </label>

                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="primary-button" type="submit" style={{ width: "auto" }}>Save Step</button>
                        <form action={deleteStepAction} style={{ display: "inline" }}>
                          <input type="hidden" name="stepId" value={step.id} />
                          <button type="submit" className="secondary-button" style={{ width: "auto", color: "#dc2626", borderColor: "#fecaca" }}>Delete</button>
                        </form>
                      </div>
                    </form>

                    {/* Options with translations */}
                    {stepOptions.length > 0 && (
                      <div style={{ marginTop: 16 }}>
                        <h4 style={{ marginBottom: 8 }}>Options</h4>
                        <div className="flow-options-grid">
                          {stepOptions.map((opt) => (
                            <form key={opt.id} action={updateOptionAction} className="flow-option-row">
                              <input type="hidden" name="optionId" value={opt.id} />
                              <input className="text-input" name="label" defaultValue={opt.label} placeholder="English" style={{ fontSize: 13 }} />
                              <input className="text-input" name="label_es" defaultValue={opt.label_es ?? ""} placeholder="Spanish" style={{ fontSize: 13 }} />
                              <button className="move-btn" type="submit" title="Save">&#10003;</button>
                            </form>
                          ))}
                        </div>
                      </div>
                    )}
                  </details>
                </section>
              );
            })}

            {/* Add step form */}
            <section className="admin-card flow-step-card" style={{ borderStyle: "dashed" }}>
              <h3>Add Step</h3>
              <form action={addStepAction} className="admin-form" style={{ marginTop: 8 }}>
                <input type="hidden" name="flowId" value={flowData.flow.id} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <label className="admin-label">
                    Step Key
                    <input className="text-input" name="stepKey" placeholder="e.g. insurance_status" required />
                  </label>
                  <label className="admin-label">
                    Type
                    <select className="text-input" name="stepType">
                      {STEP_TYPES.map((t) => <option key={t} value={t}>{STEP_TYPE_LABELS[t] ?? t}</option>)}
                    </select>
                  </label>
                </div>
                <label className="admin-label">
                  Title
                  <input className="text-input" name="title" placeholder="Question text..." required />
                </label>
                <label className="admin-label">
                  Field Key (for data storage)
                  <input className="text-input" name="fieldKey" placeholder="e.g. insurance_status" />
                </label>
                <label className="admin-label">
                  Insert After Step
                  <select className="text-input" name="afterStepId">
                    <option value="">End of flow</option>
                    {flowData.steps.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                  </select>
                </label>
                <button className="primary-button" type="submit" style={{ width: "auto" }}>Add Step</button>
              </form>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
