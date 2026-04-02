import { supabaseAdmin } from "@/lib/supabase/admin";
import { InstallPreview } from "./InstallPreview";

export const dynamic = "force-dynamic";

async function getClients() {
  const { data } = await supabaseAdmin.from("clients").select("id, name, slug").order("name");
  return data ?? [];
}

export default async function InstallPage() {
  const clients = await getClients();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://your-domain.com";
  const widgetUrl = process.env.NEXT_PUBLIC_WIDGET_CDN_URL ?? `${appUrl}/intakeapp/embed/widget.js`;

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <h1>Install Widget</h1>
        <p className="muted">Copy the embed script and preview how it looks on a website.</p>
      </div>

      <section className="admin-card" style={{ maxWidth: 720 }}>
        <h2>How it works</h2>
        <div className="install-steps">
          <div className="install-step">
            <div className="install-step-num">1</div>
            <div>
              <strong>Copy the script below</strong>
              <p className="muted text-sm">Choose the client and copy their embed snippet.</p>
            </div>
          </div>
          <div className="install-step">
            <div className="install-step-num">2</div>
            <div>
              <strong>Paste on the client website</strong>
              <p className="muted text-sm">Add before the closing <code>&lt;/body&gt;</code> tag.</p>
            </div>
          </div>
          <div className="install-step">
            <div className="install-step-num">3</div>
            <div>
              <strong>That&apos;s it</strong>
              <p className="muted text-sm">The widget loads automatically. Leads flow into the dashboard.</p>
            </div>
          </div>
        </div>
      </section>

      {clients.length === 0 ? (
        <section className="admin-card" style={{ marginTop: 20 }}>
          <p className="muted">No clients yet. Create a client first to generate embed code.</p>
        </section>
      ) : (
        <InstallPreview
          clients={clients.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
          appUrl={appUrl}
          widgetUrl={widgetUrl}
        />
      )}

      <section className="admin-card" style={{ marginTop: 20, maxWidth: 720 }}>
        <h2>WordPress</h2>
        <p className="muted text-sm">Paste the embed script in one of these places:</p>
        <ol style={{ color: "var(--muted)", lineHeight: 1.8, paddingLeft: 20, fontSize: 14 }}>
          <li>Theme settings &rarr; Custom code / Footer scripts</li>
          <li>A plugin like &quot;Insert Headers and Footers&quot;</li>
          <li>Directly in <code>footer.php</code> before <code>&lt;/body&gt;</code></li>
        </ol>
      </section>
    </div>
  );
}
