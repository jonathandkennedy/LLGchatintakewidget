import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type SearchParams = { clientId?: string };

async function getClients() {
  const { data } = await supabaseAdmin.from("clients").select("id, name").order("name");
  return data ?? [];
}

async function getTemplates(clientId: string) {
  const { data } = await supabaseAdmin
    .from("email_templates")
    .select("*")
    .eq("client_id", clientId)
    .order("template_key");
  return data ?? [];
}

async function saveTemplate(formData: FormData) {
  "use server";
  const { revalidatePath } = await import("next/cache");
  const clientId = String(formData.get("clientId") ?? "");
  const templateKey = String(formData.get("templateKey") ?? "");
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!clientId || !templateKey || !subject) return;

  await supabaseAdmin.from("email_templates").upsert({
    client_id: clientId,
    template_key: templateKey,
    subject,
    body_html: body,
    updated_at: new Date().toISOString(),
  }, { onConflict: "client_id,template_key" });

  revalidatePath("/admin/email-templates");
}

const TEMPLATE_TYPES = [
  { key: "lead_notification", label: "New Lead Notification", desc: "Sent to the firm when a new lead comes in.", variables: ["{{name}}", "{{phone}}", "{{email}}", "{{matter_type}}", "{{summary}}", "{{lead_url}}"] },
  { key: "lead_followup", label: "Lead Follow-up SMS/Email", desc: "Sent to the lead after intake.", variables: ["{{name}}", "{{matter_type}}", "{{firm_name}}", "{{firm_phone}}"] },
  { key: "callback_confirmation", label: "Callback Confirmation", desc: "Sent when a callback is requested.", variables: ["{{name}}", "{{firm_name}}", "{{firm_phone}}"] },
];

export default async function EmailTemplatesPage({ searchParams }: { searchParams: SearchParams }) {
  const clients = await getClients();
  const clientId = searchParams.clientId ?? clients[0]?.id;
  const templates = clientId ? await getTemplates(clientId) : [];
  const templateMap = new Map(templates.map((t) => [t.template_key, t]));

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <h1>Email Templates</h1>
        <p className="muted">Customize notification emails per client. Use variables like {"{{name}}"} for dynamic content.</p>
      </div>

      <form className="filter-row" action="" style={{ marginBottom: 20, display: "flex", gap: 12, alignItems: "center" }}>
        <select className="text-input" name="clientId" defaultValue={clientId ?? ""} style={{ maxWidth: 320 }}>
          <option value="">Select a client</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="primary-button" type="submit" style={{ width: "auto" }}>Load</button>
      </form>

      {clientId && TEMPLATE_TYPES.map((tmpl) => {
        const saved = templateMap.get(tmpl.key);
        return (
          <section key={tmpl.key} className="admin-card" style={{ marginBottom: 20 }}>
            <h2>{tmpl.label}</h2>
            <p className="muted text-sm">{tmpl.desc}</p>
            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
              {tmpl.variables.map((v) => <code key={v} className="status-chip" style={{ fontSize: 10 }}>{v}</code>)}
            </div>
            <form action={saveTemplate} className="admin-form" style={{ marginTop: 12 }}>
              <input type="hidden" name="clientId" value={clientId} />
              <input type="hidden" name="templateKey" value={tmpl.key} />
              <label className="admin-label">
                Subject Line
                <input className="text-input" name="subject" defaultValue={saved?.subject ?? ""} placeholder="New lead: {{name}} - {{matter_type}}" />
              </label>
              <label className="admin-label">
                Body (HTML)
                <textarea className="text-input text-area" name="body" defaultValue={saved?.body_html ?? ""} rows={6} placeholder="<p>Hi, a new lead has been submitted...</p>" style={{ fontFamily: "monospace", fontSize: 13 }} />
              </label>
              <button className="primary-button" type="submit" style={{ width: "auto" }}>Save Template</button>
            </form>
          </section>
        );
      })}
    </div>
  );
}
