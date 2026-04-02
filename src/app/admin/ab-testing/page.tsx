import { supabaseAdmin } from "@/lib/supabase/admin";
import { getTestResults } from "@/lib/ab-testing/engine";
import { createTestAction, updateTestStatusAction, updateVariantAction, addVariantAction, deleteVariantAction } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = { clientId?: string };

async function getClients() {
  const { data } = await supabaseAdmin.from("clients").select("id, name").order("name");
  return data ?? [];
}

async function getFlows(clientId: string) {
  const { data } = await supabaseAdmin.from("widget_flows").select("id, name").eq("client_id", clientId);
  return data ?? [];
}

async function getTests(clientId: string) {
  const { data: tests } = await supabaseAdmin
    .from("ab_tests")
    .select("id, name, status, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (!tests) return [];

  const result = [];
  for (const test of tests) {
    const { data: variants } = await supabaseAdmin
      .from("ab_variants")
      .select("id, name, flow_id, weight")
      .eq("test_id", test.id)
      .order("created_at");

    const testResults = await getTestResults(test.id);

    result.push({ ...test, variants: variants ?? [], results: testResults });
  }
  return result;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "cool",
  running: "hot",
  paused: "medium",
  completed: "cold",
};

export default async function ABTestingPage({ searchParams }: { searchParams: SearchParams }) {
  const clients = await getClients();
  const clientId = searchParams.clientId ?? clients[0]?.id;
  const tests = clientId ? await getTests(clientId) : [];
  const flows = clientId ? await getFlows(clientId) : [];

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <h1>A/B Testing</h1>
        <p className="muted">Test different flows against each other and track conversion rates.</p>
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
          {/* Create new test */}
          <section className="admin-card" style={{ marginBottom: 24 }}>
            <h2>Create New Test</h2>
            <form action={createTestAction} style={{ display: "flex", gap: 12, marginTop: 12, alignItems: "flex-end" }}>
              <input type="hidden" name="clientId" value={clientId} />
              <label className="admin-label" style={{ flex: 1, marginBottom: 0 }}>
                Test Name
                <input className="text-input" name="name" placeholder="e.g. Short vs Long Flow" required />
              </label>
              <button className="primary-button" type="submit" style={{ width: "auto", height: 48 }}>Create Test</button>
            </form>
            <p className="muted text-sm" style={{ marginTop: 8 }}>Creates a test with Control (A) and Variant B at 50/50 split.</p>
          </section>

          {/* Existing tests */}
          {tests.length === 0 ? (
            <section className="admin-card"><p className="muted">No A/B tests yet for this client.</p></section>
          ) : (
            tests.map((test) => {
              const resultsMap = new Map(test.results?.variants.map((v) => [v.id, v]) ?? []);

              return (
                <section key={test.id} className="admin-card" style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <div>
                      <h2>{test.name}</h2>
                      <span className={`score-badge score-${STATUS_COLORS[test.status] ?? "cold"}`} style={{ marginTop: 4 }}>{test.status}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {test.status === "draft" && (
                        <form action={updateTestStatusAction}>
                          <input type="hidden" name="testId" value={test.id} />
                          <input type="hidden" name="status" value="running" />
                          <button className="primary-button" type="submit" style={{ width: "auto" }}>Start Test</button>
                        </form>
                      )}
                      {test.status === "running" && (
                        <form action={updateTestStatusAction}>
                          <input type="hidden" name="testId" value={test.id} />
                          <input type="hidden" name="status" value="paused" />
                          <button className="secondary-button" type="submit" style={{ width: "auto" }}>Pause</button>
                        </form>
                      )}
                      {test.status === "paused" && (
                        <>
                          <form action={updateTestStatusAction}>
                            <input type="hidden" name="testId" value={test.id} />
                            <input type="hidden" name="status" value="running" />
                            <button className="primary-button" type="submit" style={{ width: "auto" }}>Resume</button>
                          </form>
                          <form action={updateTestStatusAction}>
                            <input type="hidden" name="testId" value={test.id} />
                            <input type="hidden" name="status" value="completed" />
                            <button className="secondary-button" type="submit" style={{ width: "auto" }}>End Test</button>
                          </form>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Results table */}
                  <table className="table" style={{ marginBottom: 16 }}>
                    <thead>
                      <tr>
                        <th>Variant</th>
                        <th>Flow</th>
                        <th>Weight</th>
                        <th>Sessions</th>
                        <th>Conversions</th>
                        <th>Rate</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {test.variants.map((variant) => {
                        const r = resultsMap.get(variant.id);
                        return (
                          <tr key={variant.id}>
                            <td>
                              <form action={updateVariantAction} style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                <input type="hidden" name="variantId" value={variant.id} />
                                <input className="text-input" name="name" defaultValue={variant.name} style={{ width: 140, padding: "6px 8px", fontSize: 13 }} />
                                <input type="hidden" name="flowId" value={variant.flow_id ?? ""} />
                                <input type="hidden" name="weight" value={String(variant.weight)} />
                                <button type="submit" className="move-btn" style={{ width: 24, height: 24, fontSize: 12 }}>&#10003;</button>
                              </form>
                            </td>
                            <td>
                              <form action={updateVariantAction}>
                                <input type="hidden" name="variantId" value={variant.id} />
                                <input type="hidden" name="name" value={variant.name} />
                                <input type="hidden" name="weight" value={String(variant.weight)} />
                                <select className="text-input" name="flowId" defaultValue={variant.flow_id ?? ""} style={{ padding: "6px 8px", fontSize: 13 }} onChange={(e) => (e.target as HTMLSelectElement).form?.requestSubmit()}>
                                  <option value="">Default flow</option>
                                  {flows.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                                </select>
                              </form>
                            </td>
                            <td>
                              <form action={updateVariantAction} style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                <input type="hidden" name="variantId" value={variant.id} />
                                <input type="hidden" name="name" value={variant.name} />
                                <input type="hidden" name="flowId" value={variant.flow_id ?? ""} />
                                <input className="text-input" name="weight" type="number" defaultValue={variant.weight} min={0} max={100} style={{ width: 60, padding: "6px 8px", fontSize: 13 }} />
                                <span className="muted" style={{ fontSize: 12 }}>%</span>
                                <button type="submit" className="move-btn" style={{ width: 24, height: 24, fontSize: 12 }}>&#10003;</button>
                              </form>
                            </td>
                            <td><strong>{r?.sessions ?? 0}</strong></td>
                            <td><strong>{r?.completions ?? 0}</strong></td>
                            <td>
                              <span className={`score-badge score-${(r?.conversionRate ?? 0) > 10 ? "warm" : "cool"}`}>
                                {r?.conversionRate ?? 0}%
                              </span>
                            </td>
                            <td>
                              {test.variants.length > 1 && (
                                <form action={deleteVariantAction}>
                                  <input type="hidden" name="variantId" value={variant.id} />
                                  <button type="submit" className="move-btn" style={{ width: 24, height: 24, fontSize: 12, color: "var(--error)" }}>&times;</button>
                                </form>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Add variant */}
                  <form action={addVariantAction} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="hidden" name="testId" value={test.id} />
                    <input className="text-input" name="name" placeholder="New variant name" style={{ maxWidth: 200, padding: "6px 10px", fontSize: 13 }} required />
                    <button className="secondary-button" type="submit" style={{ width: "auto", padding: "6px 12px", fontSize: 13 }}>+ Add Variant</button>
                  </form>
                </section>
              );
            })
          )}
        </>
      )}
    </div>
  );
}
