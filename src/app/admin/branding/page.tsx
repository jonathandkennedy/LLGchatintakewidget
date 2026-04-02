import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { updateBrandingAction } from "../actions";

export const dynamic = "force-dynamic";

type SearchParams = { clientId?: string };

async function getClients() {
  const { data } = await supabaseAdmin.from("clients").select("id, name").order("name");
  return data ?? [];
}

async function getBranding(clientId: string) {
  const { data } = await supabaseAdmin.from("client_branding").select("*").eq("client_id", clientId).single();
  return data;
}

export default async function BrandingPage({ searchParams }: { searchParams: SearchParams }) {
  const clients = await getClients();
  const clientId = searchParams.clientId ?? clients[0]?.id;
  const branding = clientId ? await getBranding(clientId) : null;

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <h1>Branding</h1>
        <p className="muted">Customize how the widget looks for each client.</p>
      </div>

      <form className="filter-row" action="" style={{ marginBottom: 20 }}>
        <select className="text-input" name="clientId" defaultValue={clientId ?? ""} style={{ maxWidth: 320 }}>
          <option value="">Select a client</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="primary-button" type="submit" style={{ width: "auto" }}>Load</button>
      </form>

      {!clientId ? (
        <section className="admin-card"><p className="muted">Select a client above, or <Link href="/admin/clients/new">create one first</Link>.</p></section>
      ) : (
        <section className="admin-card" style={{ maxWidth: 640 }}>
          <form action={updateBrandingAction} className="admin-form">
            <input type="hidden" name="clientId" value={clientId} />

            <h2>Colors</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label className="admin-label">
                Primary Color
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="color" name="primaryColor" defaultValue={branding?.primary_color ?? "#2563eb"} style={{ width: 48, height: 40, border: "none", cursor: "pointer" }} />
                  <input className="text-input" defaultValue={branding?.primary_color ?? "#2563eb"} readOnly style={{ flex: 1 }} />
                </div>
              </label>
              <label className="admin-label">
                Accent Color
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="color" name="accentColor" defaultValue={branding?.accent_color ?? "#7dd3fc"} style={{ width: 48, height: 40, border: "none", cursor: "pointer" }} />
                  <input className="text-input" defaultValue={branding?.accent_color ?? "#7dd3fc"} readOnly style={{ flex: 1 }} />
                </div>
              </label>
            </div>

            <h2 style={{ marginTop: 24 }}>Text</h2>
            <label className="admin-label">
              Widget Title
              <input className="text-input" name="widgetTitle" defaultValue={branding?.widget_title ?? "Free Case Review"} />
            </label>
            <label className="admin-label">
              Welcome Headline
              <input className="text-input" name="welcomeHeadline" defaultValue={branding?.welcome_headline ?? ""} />
            </label>
            <label className="admin-label">
              Welcome Body
              <textarea className="text-input text-area" name="welcomeBody" defaultValue={branding?.welcome_body ?? ""} rows={3} />
            </label>

            <h2 style={{ marginTop: 24 }}>Media</h2>
            <label className="admin-label">
              Logo URL
              <input className="text-input" name="logoUrl" defaultValue={branding?.logo_url ?? ""} placeholder="https://..." />
            </label>
            <label className="admin-label">
              Avatar URL
              <input className="text-input" name="avatarUrl" defaultValue={branding?.avatar_url ?? ""} placeholder="https://..." />
            </label>
            <label className="admin-label">
              Welcome Video URL
              <input className="text-input" name="welcomeVideoUrl" defaultValue={branding?.welcome_video_url ?? ""} placeholder="https://..." />
            </label>

            <h2 style={{ marginTop: 24 }}>Legal Links</h2>
            <label className="admin-label">
              Privacy Policy URL
              <input className="text-input" name="privacyUrl" defaultValue={branding?.privacy_url ?? ""} placeholder="https://..." />
            </label>
            <label className="admin-label">
              Terms of Service URL
              <input className="text-input" name="termsUrl" defaultValue={branding?.terms_url ?? ""} placeholder="https://..." />
            </label>

            <button className="primary-button" type="submit" style={{ marginTop: 16 }}>Save Branding</button>
          </form>
        </section>
      )}
    </div>
  );
}
