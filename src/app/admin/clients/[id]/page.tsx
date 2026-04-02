import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { updateClientAction } from "../actions";

export const dynamic = "force-dynamic";

async function getClient(id: string) {
  const { data } = await supabaseAdmin.from("clients").select("*").eq("id", id).single();
  return data;
}

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const client = await getClient(params.id);

  if (!client) {
    return (
      <div className="admin-content">
        <section className="admin-card"><h1>Client not found</h1><Link href="/admin/clients">← Back</Link></section>
      </div>
    );
  }

  const embedSnippet = `<script src="${process.env.NEXT_PUBLIC_WIDGET_CDN_URL ?? "https://your-domain.com/embed/widget.js"}" data-client-slug="${client.slug}" data-api-base="${process.env.NEXT_PUBLIC_APP_URL ?? "https://your-domain.com"}" defer></script>`;

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <h1>{client.name}</h1>
        <Link href="/admin/clients" className="admin-link">← Back to clients</Link>
      </div>

      <section className="admin-card" style={{ maxWidth: 560 }}>
        <h2>Client Details</h2>
        <form action={updateClientAction} className="admin-form">
          <input type="hidden" name="clientId" value={client.id} />
          <label className="admin-label">
            Firm Name
            <input className="text-input" name="name" defaultValue={client.name} required />
          </label>
          <label className="admin-label">
            Slug (read-only)
            <input className="text-input" value={client.slug} disabled />
          </label>
          <label className="admin-label">
            Status
            <select className="text-input" name="status" defaultValue={client.status}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <button className="primary-button" type="submit">Save Changes</button>
        </form>
      </section>

      <section className="admin-card" style={{ maxWidth: 560, marginTop: 20 }}>
        <h2>Embed Script</h2>
        <p className="muted">Paste this on the client&apos;s website, just before the closing &lt;/body&gt; tag.</p>
        <pre className="code-block">{embedSnippet}</pre>
      </section>

      <div className="kpi-grid-3" style={{ marginTop: 20 }}>
        <Link href={`/admin/branding?clientId=${client.id}`} className="kpi-card clickable">
          <div className="kpi-label">🎨 Branding</div>
          <div className="muted">Colors, logo, text</div>
        </Link>
        <Link href={`/admin/routing?clientId=${client.id}`} className="kpi-card clickable">
          <div className="kpi-label">📞 Routing</div>
          <div className="muted">Phone numbers, schedules</div>
        </Link>
        <Link href={`/admin/flow-editor?clientId=${client.id}`} className="kpi-card clickable">
          <div className="kpi-label">🔀 Flow Editor</div>
          <div className="muted">Edit intake questions</div>
        </Link>
      </div>
    </div>
  );
}
