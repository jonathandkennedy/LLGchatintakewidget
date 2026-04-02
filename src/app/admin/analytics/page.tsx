import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type SearchParams = { clientId?: string; days?: string };

async function getAnalytics(clientId?: string, days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const eventFilter = (eventName: string) => {
    let q = supabaseAdmin
      .from("widget_events")
      .select("*", { count: "exact", head: true })
      .eq("event_name", eventName)
      .gte("created_at", since);
    if (clientId) q = q.eq("client_id", clientId);
    return q;
  };

  const leadFilter = (status?: string) => {
    let q = supabaseAdmin.from("leads").select("*", { count: "exact", head: true }).gte("created_at", since);
    if (clientId) q = q.eq("client_id", clientId);
    if (status) q = q.eq("status", status);
    return q;
  };

  const [
    { count: widgetOpened },
    { count: chatStarted },
    { count: flowCompleted },
    { count: callCtaClicked },
    { count: callInitiated },
    { count: callConnected },
    { count: totalLeads },
    { count: callbackPending },
    { data: topPages },
    { data: topSources },
  ] = await Promise.all([
    eventFilter("widget_opened"),
    eventFilter("chat_started"),
    eventFilter("flow_completed"),
    eventFilter("call_cta_clicked"),
    eventFilter("call_initiated"),
    eventFilter("call_connected"),
    leadFilter(),
    leadFilter("callback_pending"),
    supabaseAdmin.rpc("get_top_pages_stub").then(() => ({ data: [] as Array<{ page: string; count: number }> })).catch(() => ({ data: [] as Array<{ page: string; count: number }> })),
    supabaseAdmin.rpc("get_top_sources_stub").then(() => ({ data: [] as Array<{ source: string; count: number }> })).catch(() => ({ data: [] as Array<{ source: string; count: number }> })),
  ]);

  // Compute top pages from lead_sessions
  let pageQuery = supabaseAdmin
    .from("lead_sessions")
    .select("landing_page_url")
    .gte("started_at", since)
    .not("landing_page_url", "is", null)
    .limit(500);
  if (clientId) pageQuery = pageQuery.eq("client_id", clientId);
  const { data: pageSessions } = await pageQuery;

  const pageCounts = new Map<string, number>();
  for (const s of pageSessions ?? []) {
    if (s.landing_page_url) {
      try {
        const path = new URL(s.landing_page_url).pathname;
        pageCounts.set(path, (pageCounts.get(path) ?? 0) + 1);
      } catch {
        pageCounts.set(s.landing_page_url, (pageCounts.get(s.landing_page_url) ?? 0) + 1);
      }
    }
  }

  let sourceQuery = supabaseAdmin
    .from("lead_sessions")
    .select("utm_source")
    .gte("started_at", since)
    .not("utm_source", "is", null)
    .limit(500);
  if (clientId) sourceQuery = sourceQuery.eq("client_id", clientId);
  const { data: sourceSessions } = await sourceQuery;

  const sourceCounts = new Map<string, number>();
  for (const s of sourceSessions ?? []) {
    if (s.utm_source) {
      sourceCounts.set(s.utm_source, (sourceCounts.get(s.utm_source) ?? 0) + 1);
    }
  }

  return {
    widgetOpened: widgetOpened ?? 0,
    chatStarted: chatStarted ?? 0,
    flowCompleted: flowCompleted ?? 0,
    callCtaClicked: callCtaClicked ?? 0,
    callInitiated: callInitiated ?? 0,
    callConnected: callConnected ?? 0,
    totalLeads: totalLeads ?? 0,
    callbackPending: callbackPending ?? 0,
    topPages: [...pageCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([page, count]) => ({ page, count })),
    topSources: [...sourceCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([source, count]) => ({ source, count })),
  };
}

async function getClients() {
  const { data } = await supabaseAdmin.from("clients").select("id, name").order("name");
  return data ?? [];
}

export default async function AnalyticsPage({ searchParams }: { searchParams: SearchParams }) {
  const days = Number(searchParams.days) || 7;
  const clients = await getClients();
  const stats = await getAnalytics(searchParams.clientId, days);

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <h1>Analytics</h1>
      </div>

      <form className="filter-grid" action="" style={{ maxWidth: 480 }}>
        <select className="text-input" name="clientId" defaultValue={searchParams.clientId ?? ""}>
          <option value="">All clients</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="text-input" name="days" defaultValue={String(days)}>
          <option value="1">Today</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
        <button className="primary-button" type="submit">Apply</button>
      </form>

      <h2 style={{ marginTop: 24, marginBottom: 12 }}>Funnel</h2>
      <div className="kpi-grid-4">
        <div className="kpi-card"><div className="kpi-label">Widget Opens</div><div className="kpi-value">{stats.widgetOpened}</div></div>
        <div className="kpi-card"><div className="kpi-label">Chats Started</div><div className="kpi-value">{stats.chatStarted}</div></div>
        <div className="kpi-card"><div className="kpi-label">Flows Completed</div><div className="kpi-value">{stats.flowCompleted}</div></div>
        <div className="kpi-card"><div className="kpi-label">Leads Captured</div><div className="kpi-value">{stats.totalLeads}</div></div>
      </div>

      <h2 style={{ marginTop: 24, marginBottom: 12 }}>Calls</h2>
      <div className="kpi-grid-4">
        <div className="kpi-card"><div className="kpi-label">Call CTA Clicks</div><div className="kpi-value">{stats.callCtaClicked}</div></div>
        <div className="kpi-card"><div className="kpi-label">Calls Initiated</div><div className="kpi-value">{stats.callInitiated}</div></div>
        <div className="kpi-card"><div className="kpi-label">Calls Connected</div><div className="kpi-value success">{stats.callConnected}</div></div>
        <div className="kpi-card"><div className="kpi-label">Callbacks Pending</div><div className="kpi-value accent">{stats.callbackPending}</div></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 24 }}>
        <section className="admin-card">
          <h2>Top Pages</h2>
          {stats.topPages.length === 0 ? <p className="muted">No page data yet.</p> : (
            <table className="table">
              <thead><tr><th>Page</th><th>Sessions</th></tr></thead>
              <tbody>
                {stats.topPages.map((p) => <tr key={p.page}><td>{p.page}</td><td>{p.count}</td></tr>)}
              </tbody>
            </table>
          )}
        </section>

        <section className="admin-card">
          <h2>Top Sources</h2>
          {stats.topSources.length === 0 ? <p className="muted">No source data yet.</p> : (
            <table className="table">
              <thead><tr><th>Source</th><th>Sessions</th></tr></thead>
              <tbody>
                {stats.topSources.map((s) => <tr key={s.source}><td>{s.source}</td><td>{s.count}</td></tr>)}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
