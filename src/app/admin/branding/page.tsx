import { supabaseAdmin } from "@/lib/supabase/admin";
import { BrandingEditor } from "./BrandingEditor";

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const branding = clientId ? ((await getBranding(clientId)) as Record<string, any> | null) : null;

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <h1>Branding</h1>
        <p className="muted">Customize how the widget looks for each client. Changes preview in real time.</p>
      </div>

      <form className="filter-row" action="" style={{ marginBottom: 20, display: "flex", gap: 12, alignItems: "center" }}>
        <select className="text-input" name="clientId" defaultValue={clientId ?? ""} style={{ maxWidth: 320 }}>
          <option value="">Select a client</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="primary-button" type="submit" style={{ width: "auto" }}>Load</button>
      </form>

      {!clientId ? (
        <section className="admin-card"><p className="muted">Select a client above to configure branding.</p></section>
      ) : (
        <BrandingEditor
          clientId={clientId}
          initial={{
            primaryColor: branding?.primary_color ?? "#2563eb",
            accentColor: branding?.accent_color ?? "#7dd3fc",
            widgetTitle: branding?.widget_title ?? "Free Case Review",
            welcomeHeadline: branding?.welcome_headline ?? "Injured in an accident?",
            welcomeBody: branding?.welcome_body ?? "Answer a few quick questions so we can connect you with our team.",
            logoUrl: branding?.logo_url ?? "",
            avatarUrl: branding?.avatar_url ?? "",
            welcomeVideoUrl: branding?.welcome_video_url ?? "",
            privacyUrl: branding?.privacy_url ?? "",
            termsUrl: branding?.terms_url ?? "",
          }}
        />
      )}
    </div>
  );
}
