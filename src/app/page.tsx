import Link from "next/link";

export default function HomePage() {
  const scriptTag = `<script src="${process.env.NEXT_PUBLIC_WIDGET_CDN_URL ?? "http://localhost:3000/embed/widget.js"}" data-client-slug="${process.env.NEXT_PUBLIC_DEMO_CLIENT_SLUG ?? "demo-law-firm"}" data-api-base="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}" defer></script>`;

  return (
    <main className="page-shell">
      <div className="hero">
        <section className="panel">
          <div className="eyebrow">Initialized starter</div>
          <h1>IntakeLLG compile-safe Next.js repo</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            This starter includes widget APIs, Supabase persistence scaffolding, Telnyx webhook handlers,
            routing logic, and a demo widget screen flow.
          </p>

          <div className="kpi-grid">
            <div className="kpi-card">
              <strong>Widget</strong>
              <div className="muted text-sm">Guided intake flow</div>
            </div>
            <div className="kpi-card">
              <strong>Telephony</strong>
              <div className="muted text-sm">Telnyx voice + SMS</div>
            </div>
            <div className="kpi-card">
              <strong>Admin</strong>
              <div className="muted text-sm">Lead list starter</div>
            </div>
          </div>

          <h3 style={{ marginTop: 28 }}>Embed script</h3>
          <pre className="code-block" style={{ marginTop: 12 }}>{scriptTag}</pre>

          <p style={{ marginTop: 20 }}>
            <Link href="/widget-demo">Open widget demo</Link>
            <span className="muted" style={{ margin: "0 8px" }}>&middot;</span>
            <Link href="/admin/leads">Open admin lead view</Link>
          </p>
        </section>

        <section>
          <div className="widget-card" style={{ maxWidth: 390, padding: 28 }}>
            <div className="eyebrow">Build status</div>
            <h2 style={{ marginTop: 8, marginBottom: 12 }}>Ready for Claude Code</h2>
            <p className="muted text-sm" style={{ marginBottom: 16 }}>Core file structure is initialized so your dev workflow can patch instead of scaffolding.</p>
            <ul className="bullet-list">
              <li>App Router routes created</li>
              <li>Supabase admin client added</li>
              <li>Flow engine + validation included</li>
              <li>Telnyx service layer scaffolded</li>
              <li>Demo widget UI included</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
