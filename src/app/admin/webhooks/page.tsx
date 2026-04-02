import { supabaseAdmin } from "@/lib/supabase/admin";
import { createWebhookAction, deleteWebhookAction, toggleWebhookAction } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = { clientId?: string };

async function getClients() {
  const { data } = await supabaseAdmin.from("clients").select("id, name").order("name");
  return data ?? [];
}

async function getWebhooks(clientId: string) {
  const { data: webhooks } = await supabaseAdmin
    .from("client_webhooks")
    .select("id, url, secret, events, is_active, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  // Get recent deliveries
  const webhookIds = (webhooks ?? []).map((w) => w.id);
  const { data: deliveries } = webhookIds.length > 0
    ? await supabaseAdmin
        .from("webhook_deliveries")
        .select("webhook_id, status, status_code, created_at")
        .in("webhook_id", webhookIds)
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [] };

  return { webhooks: webhooks ?? [], deliveries: deliveries ?? [] };
}

const EVENTS = [
  { key: "lead.created", label: "Lead Created" },
  { key: "lead.status_changed", label: "Lead Status Changed" },
  { key: "lead.call_connected", label: "Call Connected" },
];

export default async function WebhooksPage({ searchParams }: { searchParams: SearchParams }) {
  const clients = await getClients();
  const clientId = searchParams.clientId ?? clients[0]?.id;
  const { webhooks, deliveries } = clientId ? await getWebhooks(clientId) : { webhooks: [], deliveries: [] };

  const deliveryMap = new Map<string, typeof deliveries>();
  for (const d of deliveries) {
    const list = deliveryMap.get(d.webhook_id) ?? [];
    list.push(d);
    deliveryMap.set(d.webhook_id, list);
  }

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <h1>Webhooks</h1>
        <p className="muted">Send lead data to external services (Zapier, CRM, etc.)</p>
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
          {/* Add webhook */}
          <section className="admin-card" style={{ marginBottom: 24 }}>
            <h2>Add Webhook</h2>
            <form action={createWebhookAction} className="admin-form" style={{ marginTop: 12 }}>
              <input type="hidden" name="clientId" value={clientId} />
              <label className="admin-label">
                URL
                <input className="text-input" name="url" placeholder="https://hooks.zapier.com/..." required />
              </label>
              <label className="admin-label">
                Signing Secret (optional)
                <input className="text-input" name="secret" placeholder="For HMAC verification" />
              </label>
              <div>
                <div className="muted text-sm" style={{ fontWeight: 600, marginBottom: 6 }}>Events (leave unchecked for all)</div>
                {EVENTS.map((ev) => (
                  <label key={ev.key} className="checkbox-label" style={{ marginBottom: 4 }}>
                    <input type="checkbox" name="events" value={ev.key} /> {ev.label}
                  </label>
                ))}
              </div>
              <button className="primary-button" type="submit" style={{ width: "auto" }}>Add Webhook</button>
            </form>
          </section>

          {/* Existing webhooks */}
          {webhooks.length === 0 ? (
            <section className="admin-card"><p className="muted">No webhooks configured.</p></section>
          ) : (
            webhooks.map((wh) => {
              const whDeliveries = deliveryMap.get(wh.id) ?? [];
              const successCount = whDeliveries.filter((d) => d.status === "delivered").length;
              const failCount = whDeliveries.filter((d) => d.status === "failed").length;

              return (
                <section key={wh.id} className="admin-card" style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <code style={{ fontSize: 13, wordBreak: "break-all" }}>{wh.url}</code>
                      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                        <span className={`score-badge score-${wh.is_active ? "warm" : "cold"}`}>{wh.is_active ? "Active" : "Paused"}</span>
                        {wh.secret && <span className="score-badge score-cool">Signed</span>}
                        {(wh.events as string[] | null)?.map((e) => <span key={e} className="status-chip" style={{ fontSize: 10 }}>{e}</span>)}
                        {!(wh.events as string[] | null)?.length && <span className="status-chip" style={{ fontSize: 10 }}>All events</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <form action={toggleWebhookAction}>
                        <input type="hidden" name="webhookId" value={wh.id} />
                        <input type="hidden" name="isActive" value={String(wh.is_active)} />
                        <button type="submit" className="secondary-button" style={{ width: "auto", padding: "6px 12px", fontSize: 12 }}>
                          {wh.is_active ? "Pause" : "Resume"}
                        </button>
                      </form>
                      <form action={deleteWebhookAction}>
                        <input type="hidden" name="webhookId" value={wh.id} />
                        <button type="submit" className="secondary-button" style={{ width: "auto", padding: "6px 12px", fontSize: 12, color: "var(--error)", borderColor: "#fecaca" }}>Delete</button>
                      </form>
                    </div>
                  </div>
                  {whDeliveries.length > 0 && (
                    <div style={{ marginTop: 12, fontSize: 13, color: "var(--muted)" }}>
                      Recent: <span style={{ color: "var(--success)", fontWeight: 600 }}>{successCount} delivered</span>
                      {failCount > 0 && <span style={{ color: "var(--error)", fontWeight: 600, marginLeft: 8 }}>{failCount} failed</span>}
                    </div>
                  )}
                </section>
              );
            })
          )}
        </>
      )}
    </div>
  );
}
