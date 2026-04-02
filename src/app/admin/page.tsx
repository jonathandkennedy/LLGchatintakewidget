import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getBreachedLeads, formatDuration } from "@/lib/monitoring/sla";

export const dynamic = "force-dynamic";

async function getDashboardStats() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalLeads },
    { count: todayLeads },
    { count: weekLeads },
    { count: pendingCallbacks },
    { count: connectedCalls },
    { count: totalClients },
    { data: recentLeads },
    { count: widgetOpensWeek },
  ] = await Promise.all([
    supabaseAdmin.from("leads").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("leads").select("*", { count: "exact", head: true }).gte("created_at", todayStart),
    supabaseAdmin.from("leads").select("*", { count: "exact", head: true }).gte("created_at", weekAgo),
    supabaseAdmin.from("leads").select("*", { count: "exact", head: true }).eq("status", "callback_pending"),
    supabaseAdmin.from("leads").select("*", { count: "exact", head: true }).eq("status", "call_connected"),
    supabaseAdmin.from("clients").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("leads").select("id, created_at, status, matter_type, first_name, last_name, phone_e164").order("created_at", { ascending: false }).limit(5),
    supabaseAdmin.from("widget_events").select("*", { count: "exact", head: true }).eq("event_name", "widget_opened").gte("created_at", weekAgo),
  ]);

  return {
    totalLeads: totalLeads ?? 0,
    todayLeads: todayLeads ?? 0,
    weekLeads: weekLeads ?? 0,
    pendingCallbacks: pendingCallbacks ?? 0,
    connectedCalls: connectedCalls ?? 0,
    totalClients: totalClients ?? 0,
    recentLeads: recentLeads ?? [],
    widgetOpensWeek: widgetOpensWeek ?? 0,
  };
}

async function getDailyTrend() {
  const days = 14;
  const result: Array<{ date: string; label: string; count: number }> = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayStart = dateStr + "T00:00:00";
    const dayEnd = dateStr + "T23:59:59";

    const { count } = await supabaseAdmin
      .from("leads")
      .select("*", { count: "exact", head: true })
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd);

    result.push({
      date: dateStr,
      label: d.toLocaleDateString("en", { month: "short", day: "numeric" }),
      count: count ?? 0,
    });
  }
  return result;
}

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();
  const trend = await getDailyTrend();
  const trendMax = Math.max(...trend.map((d) => d.count), 1);

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <h1>Dashboard</h1>
        <p className="muted">Overview of your intake performance.</p>
      </div>

      <div className="kpi-grid-4">
        <div className="kpi-card">
          <div className="kpi-label">Today&apos;s Leads</div>
          <div className="kpi-value">{stats.todayLeads}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">This Week</div>
          <div className="kpi-value">{stats.weekLeads}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Pending Callbacks</div>
          <div className="kpi-value accent">{stats.pendingCallbacks}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Calls Connected</div>
          <div className="kpi-value success">{stats.connectedCalls}</div>
        </div>
      </div>

      <div className="kpi-grid-3">
        <div className="kpi-card">
          <div className="kpi-label">Total Leads</div>
          <div className="kpi-value">{stats.totalLeads}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Active Clients</div>
          <div className="kpi-value">{stats.totalClients}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Widget Opens (7d)</div>
          <div className="kpi-value">{stats.widgetOpensWeek}</div>
        </div>
      </div>

      {/* Daily Lead Trend */}
      <section className="admin-card" style={{ marginTop: 24 }}>
        <h2>Leads (Last 14 Days)</h2>
        <div className="trend-chart" style={{ marginTop: 16 }}>
          {trend.map((day) => (
            <div key={day.date} className="trend-bar-col">
              <div className="trend-bar-value">{day.count > 0 ? day.count : ""}</div>
              <div className="trend-bar-track">
                <div className="trend-bar-fill" style={{ height: `${(day.count / trendMax) * 100}%` }} />
              </div>
              <div className="trend-bar-label">{day.label}</div>
            </div>
          ))}
        </div>
      </section>

      <SLAAlerts />

      <section className="admin-card" style={{ marginTop: 24 }}>
        <div className="admin-card-header">
          <h2>Recent Leads</h2>
          <Link href="/admin/leads" className="admin-link">View all →</Link>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Matter</th>
              <th>Status</th>
              <th>Phone</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {stats.recentLeads.length === 0 && (
              <tr><td colSpan={5} className="muted" style={{ textAlign: "center", padding: 32 }}>No leads yet. Once visitors complete the widget intake, leads will appear here.</td></tr>
            )}
            {stats.recentLeads.map((lead) => {
              const name = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Unknown";
              return (
                <tr key={lead.id}>
                  <td><Link href={`/admin/leads/${lead.id}`}>{name}</Link></td>
                  <td>{lead.matter_type ?? "—"}</td>
                  <td><span className="status-chip">{lead.status}</span></td>
                  <td>{lead.phone_e164 ?? "—"}</td>
                  <td>{new Date(lead.created_at).toLocaleDateString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

async function SLAAlerts() {
  const breached = await getBreachedLeads();
  if (breached.length === 0) return null;

  return (
    <section className="admin-card sla-alert-card" style={{ marginTop: 24 }}>
      <div className="admin-card-header">
        <h2 style={{ color: "var(--error)" }}>SLA Breaches ({breached.length})</h2>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Lead</th>
            <th>Score</th>
            <th>Matter</th>
            <th>Assigned To</th>
            <th>Waiting</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {breached.map((lead) => {
            const name = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Unknown";
            return (
              <tr key={lead.id}>
                <td><Link href={`/admin/leads/${lead.id}`}>{name}</Link></td>
                <td>{lead.lead_score != null ? <span className={`score-badge score-${lead.lead_score_tier ?? "cold"}`}>{lead.lead_score}</span> : "\u2014"}</td>
                <td>{lead.matter_type ?? "\u2014"}</td>
                <td>{lead.assigned_to_name ?? <span className="muted">Unassigned</span>}</td>
                <td><span style={{ color: "var(--error)", fontWeight: 700 }}>{formatDuration(lead.minutes_since_created)}</span></td>
                <td><span className="status-chip">{lead.status}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
