import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function getClients() {
  const { data } = await supabaseAdmin.from("clients").select("id, name, slug").order("name");
  return data ?? [];
}

export default async function InstallPage() {
  const clients = await getClients();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://your-domain.com";
  const widgetUrl = process.env.NEXT_PUBLIC_WIDGET_CDN_URL ?? `${appUrl}/embed/widget.js`;

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <h1>Install Widget</h1>
        <p className="muted">Copy the embed script for any client and paste it on their website.</p>
      </div>

      <section className="admin-card" style={{ maxWidth: 720 }}>
        <h2>How it works</h2>
        <div className="install-steps">
          <div className="install-step">
            <div className="install-step-num">1</div>
            <div>
              <strong>Copy the script below</strong>
              <p className="muted">Choose the client and copy their embed snippet.</p>
            </div>
          </div>
          <div className="install-step">
            <div className="install-step-num">2</div>
            <div>
              <strong>Paste on the client website</strong>
              <p className="muted">Add it just before the closing <code>&lt;/body&gt;</code> tag on every page where the widget should appear.</p>
            </div>
          </div>
          <div className="install-step">
            <div className="install-step-num">3</div>
            <div>
              <strong>That&apos;s it</strong>
              <p className="muted">The widget will load automatically. Leads flow into the dashboard.</p>
            </div>
          </div>
        </div>
      </section>

      {clients.length === 0 ? (
        <section className="admin-card" style={{ marginTop: 20 }}>
          <p className="muted">No clients created yet. Create a client first to generate an embed script.</p>
        </section>
      ) : (
        clients.map((client) => {
          const snippet = `<script src="${widgetUrl}" data-client-slug="${client.slug}" data-api-base="${appUrl}" defer></script>`;
          return (
            <section key={client.id} className="admin-card" style={{ marginTop: 20 }}>
              <h2>{client.name}</h2>
              <p className="muted">Slug: <code>{client.slug}</code></p>
              <pre className="code-block">{snippet}</pre>
              <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
                Test locally: <a href={`/widget/${client.slug}`} target="_blank" rel="noreferrer">/widget/{client.slug}</a>
                {" · "}
                Preview demo: <a href={`/widget-demo`} target="_blank" rel="noreferrer">/widget-demo</a>
              </p>
            </section>
          );
        })
      )}

      <section className="admin-card" style={{ marginTop: 20 }}>
        <h2>WordPress</h2>
        <p className="muted">For WordPress sites, paste the embed script in one of these places:</p>
        <ol style={{ color: "var(--muted)", lineHeight: 1.8, paddingLeft: 20 }}>
          <li>Theme settings → Custom code / Footer scripts area</li>
          <li>A plugin like &quot;Insert Headers and Footers&quot;</li>
          <li>Directly in <code>footer.php</code> before <code>&lt;/body&gt;</code></li>
        </ol>
      </section>
    </div>
  );
}
