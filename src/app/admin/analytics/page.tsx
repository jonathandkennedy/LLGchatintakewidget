import { supabaseAdmin } from "@/lib/supabase/admin";
import { getResponseTimeStats, formatMinutes } from "@/lib/monitoring/response-time";
import { getROIMetrics } from "@/lib/scoring/roi";
import { formatCurrency } from "@/lib/scoring/lead-value";
import { getLeadsByState, getStateAbbrev } from "@/lib/admin/geo-data";

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
  ] = await Promise.all([
    eventFilter("widget_opened"),
    eventFilter("chat_started"),
    eventFilter("flow_completed"),
    eventFilter("call_cta_clicked"),
    eventFilter("call_initiated"),
    eventFilter("call_connected"),
    leadFilter(),
    leadFilter("callback_pending"),
  ]);

  // Per-step answer counts for drop-off analysis
  let stepQuery = supabaseAdmin
    .from("lead_session_answers")
    .select("step_key")
    .gte("created_at", since);
  if (clientId) {
    // Join through sessions to filter by client
    stepQuery = stepQuery;
  }
  const { data: stepAnswers } = await stepQuery.limit(5000);

  const stepCounts = new Map<string, number>();
  for (const a of stepAnswers ?? []) {
    if (a.step_key) {
      stepCounts.set(a.step_key, (stepCounts.get(a.step_key) ?? 0) + 1);
    }
  }

  // Top pages
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

  // Top sources
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

  // Matter type breakdown
  let matterQuery = supabaseAdmin
    .from("leads")
    .select("matter_type")
    .gte("created_at", since)
    .not("matter_type", "is", null);
  if (clientId) matterQuery = matterQuery.eq("client_id", clientId);
  const { data: matterLeads } = await matterQuery.limit(500);

  const matterCounts = new Map<string, number>();
  for (const l of matterLeads ?? []) {
    if (l.matter_type) {
      matterCounts.set(l.matter_type, (matterCounts.get(l.matter_type) ?? 0) + 1);
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
    stepCounts: Object.fromEntries(stepCounts),
    topPages: [...pageCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([page, count]) => ({ page, count })),
    topSources: [...sourceCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([source, count]) => ({ source, count })),
    matterTypes: [...matterCounts.entries()].sort((a, b) => b[1] - a[1]).map(([type, count]) => ({ type, count })),
  };
}

async function getClients() {
  const { data } = await supabaseAdmin.from("clients").select("id, name").order("name");
  return data ?? [];
}

// Funnel step config
const FUNNEL_STEPS = [
  { key: "widgetOpened", label: "Widget Opened" },
  { key: "chatStarted", label: "Chat Started" },
  { key: "flowCompleted", label: "Flow Completed" },
  { key: "totalLeads", label: "Leads Captured" },
  { key: "callCtaClicked", label: "Call CTA Clicked" },
  { key: "callConnected", label: "Calls Connected" },
] as const;

// Intake step order for drop-off chart
const INTAKE_STEPS = [
  { key: "matter_type", label: "Matter Type" },
  { key: "incident_summary", label: "Incident Summary" },
  { key: "injury_status", label: "Injury Status" },
  { key: "injury_areas", label: "Injury Areas" },
  { key: "medical_treatment_status", label: "Medical Treatment" },
  { key: "incident_state", label: "State" },
  { key: "incident_city", label: "City" },
  { key: "incident_date_range", label: "Date Range" },
  { key: "full_name", label: "Full Name" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "additional_notes", label: "Notes" },
];

function pct(value: number, total: number): string {
  if (total === 0) return "0%";
  return Math.round((value / total) * 100) + "%";
}

function barWidth(value: number, max: number): string {
  if (max === 0) return "0%";
  return Math.max((value / max) * 100, 1) + "%";
}

export default async function AnalyticsPage({ searchParams }: { searchParams: SearchParams }) {
  const days = Number(searchParams.days) || 7;
  const clients = await getClients();
  const stats = await getAnalytics(searchParams.clientId, days);

  const funnelValues: Record<string, number> = {
    widgetOpened: stats.widgetOpened,
    chatStarted: stats.chatStarted,
    flowCompleted: stats.flowCompleted,
    totalLeads: stats.totalLeads,
    callCtaClicked: stats.callCtaClicked,
    callConnected: stats.callConnected,
  };
  const funnelMax = Math.max(...FUNNEL_STEPS.map((s) => funnelValues[s.key] ?? 0), 1);
  const conversionRate = stats.widgetOpened > 0 ? ((stats.totalLeads / stats.widgetOpened) * 100).toFixed(1) : "0";
  const callRate = stats.totalLeads > 0 ? ((stats.callConnected / stats.totalLeads) * 100).toFixed(1) : "0";

  // Build drop-off data
  const dropOffData = INTAKE_STEPS.map((s) => ({
    ...s,
    count: stats.stepCounts[s.key] ?? 0,
  }));
  const dropOffMax = Math.max(...dropOffData.map((d) => d.count), 1);

  const matterMax = Math.max(...stats.matterTypes.map((m) => m.count), 1);

  const MATTER_LABELS: Record<string, string> = {
    car_accident: "Car Accident",
    truck_accident: "Truck Accident",
    motorcycle_accident: "Motorcycle Accident",
    slip_fall: "Slip & Fall",
    wrongful_death: "Wrongful Death",
    other_injury: "Other Injury",
  };

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <h1>Analytics</h1>
        <p className="muted text-sm">Conversion funnel, drop-off rates, and intake performance.</p>
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

      {/* Summary KPIs */}
      <div className="kpi-grid-4">
        <div className="kpi-card">
          <div className="kpi-label">Widget Opens</div>
          <div className="kpi-value">{stats.widgetOpened}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Leads Captured</div>
          <div className="kpi-value">{stats.totalLeads}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Conversion Rate</div>
          <div className="kpi-value accent">{conversionRate}%</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Call Connect Rate</div>
          <div className="kpi-value success">{callRate}%</div>
        </div>
      </div>

      {/* Conversion Funnel */}
      <section style={{ marginTop: 32 }}>
        <h2 style={{ marginBottom: 16 }}>Conversion Funnel</h2>
        <div className="funnel-chart">
          {FUNNEL_STEPS.map((funnelStep, i) => {
            const value = funnelValues[funnelStep.key] ?? 0;
            const prevValue = i > 0 ? (funnelValues[FUNNEL_STEPS[i - 1].key] ?? 0) : 0;
            const dropOff = i > 0 && prevValue > 0 ? prevValue - value : 0;
            const dropPct = i > 0 && prevValue > 0 ? Math.round((dropOff / prevValue) * 100) : 0;

            return (
              <div key={funnelStep.key}>
                {i > 0 && dropOff > 0 && (
                  <div className="funnel-drop">
                    <div className="funnel-drop-label">
                      ↓ {dropOff} dropped ({dropPct}%)
                    </div>
                  </div>
                )}
                <div className="funnel-step">
                  <div className="funnel-label">{funnelStep.label}</div>
                  <div className="funnel-bar-track">
                    <div
                      className={`funnel-bar-fill level-${i}`}
                      style={{ width: barWidth(value, funnelMax) }}
                    />
                  </div>
                  <div className="funnel-count">{value}</div>
                  <div className="funnel-pct">{pct(value, funnelMax)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Step Drop-off Chart */}
      <section style={{ marginTop: 32 }}>
        <h2 style={{ marginBottom: 16 }}>Step Completion (Drop-off Analysis)</h2>
        <div className="admin-card">
          <div className="bar-chart">
            {dropOffData.map((d, i) => {
              const prevCount = i > 0 ? dropOffData[i - 1].count : dropOffMax;
              const dropPct = prevCount > 0 && i > 0 ? Math.round(((prevCount - d.count) / prevCount) * 100) : 0;
              return (
                <div key={d.key}>
                  <div className="bar-row">
                    <div className="bar-label">
                      {i + 1}. {d.label}
                      {dropPct > 10 && i > 0 && (
                        <span style={{ color: "var(--error)", fontSize: 11, marginLeft: 6 }}>-{dropPct}%</span>
                      )}
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: barWidth(d.count, dropOffMax) }} />
                    </div>
                    <div className="bar-value">{d.count}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Two-column: Matter Types + Calls */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 32 }}>
        <section className="admin-card">
          <h2 style={{ marginBottom: 16 }}>Matter Types</h2>
          {stats.matterTypes.length === 0 ? (
            <p className="muted text-sm">No matter type data yet.</p>
          ) : (
            <div className="bar-chart">
              {stats.matterTypes.map((m) => (
                <div key={m.type} className="bar-row">
                  <div className="bar-label">{MATTER_LABELS[m.type] ?? m.type}</div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: barWidth(m.count, matterMax) }} />
                  </div>
                  <div className="bar-value">{m.count}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="admin-card">
          <h2 style={{ marginBottom: 16 }}>Call Performance</h2>
          <div className="kpi-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 0 }}>
            <div className="kpi-card">
              <div className="kpi-label">CTA Clicks</div>
              <div className="kpi-value">{stats.callCtaClicked}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Initiated</div>
              <div className="kpi-value">{stats.callInitiated}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Connected</div>
              <div className="kpi-value success">{stats.callConnected}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Callbacks</div>
              <div className="kpi-value accent">{stats.callbackPending}</div>
            </div>
          </div>
        </section>
      </div>

      {/* Two-column: Top Pages + Top Sources */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 20 }}>
        <section className="admin-card">
          <h2 style={{ marginBottom: 16 }}>Top Pages</h2>
          {stats.topPages.length === 0 ? <p className="muted text-sm">No page data yet.</p> : (
            <table className="table">
              <thead><tr><th>Page</th><th>Sessions</th></tr></thead>
              <tbody>
                {stats.topPages.map((p) => <tr key={p.page}><td>{p.page}</td><td>{p.count}</td></tr>)}
              </tbody>
            </table>
          )}
        </section>

        <section className="admin-card">
          <h2 style={{ marginBottom: 16 }}>Top Sources</h2>
          {stats.topSources.length === 0 ? <p className="muted text-sm">No source data yet.</p> : (
            <table className="table">
              <thead><tr><th>Source</th><th>Sessions</th></tr></thead>
              <tbody>
                {stats.topSources.map((s) => <tr key={s.source}><td>{s.source}</td><td>{s.count}</td></tr>)}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {/* Geographic + ROI */}
      <GeoSection clientId={searchParams.clientId} days={days} />
      <ROISection clientId={searchParams.clientId} days={days} />

      {/* Response Time */}
      <ResponseTimeSection clientId={searchParams.clientId} days={days} />
    </div>
  );
}

async function ResponseTimeSection({ clientId, days }: { clientId?: string; days: number }) {
  const stats = await getResponseTimeStats(clientId, days);
  if (stats.length === 0) return null;

  const maxAvg = Math.max(...stats.map((s) => s.avgResponseMinutes), 1);

  return (
    <section style={{ marginTop: 32 }}>
      <h2 style={{ marginBottom: 16 }}>Team Response Times</h2>
      <div className="admin-card">
        <table className="table">
          <thead>
            <tr>
              <th>Team Member</th>
              <th>Leads</th>
              <th>Avg Response</th>
              <th>Median</th>
              <th>SLA Breaches</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.memberName}>
                <td><strong>{s.memberName}</strong></td>
                <td>{s.totalLeads}</td>
                <td>
                  <span className={s.avgResponseMinutes <= 15 ? "text-sm" : ""} style={{ fontWeight: 600, color: s.avgResponseMinutes <= 15 ? "var(--success)" : s.avgResponseMinutes <= 60 ? "var(--warning)" : "var(--error)" }}>
                    {formatMinutes(s.avgResponseMinutes)}
                  </span>
                </td>
                <td>{formatMinutes(s.medianResponseMinutes)}</td>
                <td>{s.slaBreaches > 0 ? <span style={{ color: "var(--error)", fontWeight: 600 }}>{s.slaBreaches}</span> : "0"}</td>
                <td style={{ width: 120 }}>
                  <div className="bar-track" style={{ height: 8 }}>
                    <div className="bar-fill" style={{ width: `${Math.min((s.avgResponseMinutes / maxAvg) * 100, 100)}%`, background: s.avgResponseMinutes <= 15 ? "var(--success)" : s.avgResponseMinutes <= 60 ? "var(--warning)" : "var(--error)" }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

async function GeoSection({ clientId, days }: { clientId?: string; days: number }) {
  const states = await getLeadsByState(clientId, days);
  if (states.length === 0) return null;

  const maxCount = states[0]?.count ?? 1;

  return (
    <section style={{ marginTop: 32 }}>
      <h2 style={{ marginBottom: 16 }}>Leads by State</h2>
      <div className="admin-card">
        <div className="geo-grid">
          {states.map((s) => (
            <div key={s.state} className="geo-bar-item">
              <div className="geo-bar-header">
                <span className="geo-state-abbrev">{getStateAbbrev(s.state)}</span>
                <span className="geo-state-name">{s.state}</span>
                <span className="geo-count">{s.count} ({s.pct}%)</span>
              </div>
              <div className="bar-track" style={{ height: 8 }}>
                <div className="bar-fill" style={{ width: `${(s.count / maxCount) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

async function ROISection({ clientId, days }: { clientId?: string; days: number }) {
  const roi = await getROIMetrics(clientId, days);
  if (roi.totalLeads === 0) return null;

  return (
    <section style={{ marginTop: 32 }}>
      <h2 style={{ marginBottom: 16 }}>ROI Estimation</h2>
      <div className="kpi-grid-4" style={{ marginBottom: 16 }}>
        <div className="kpi-card">
          <div className="kpi-label">Total Leads</div>
          <div className="kpi-value">{roi.totalLeads}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Est. Total Value</div>
          <div className="kpi-value accent">{formatCurrency(roi.totalEstimatedValue)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Avg Lead Value</div>
          <div className="kpi-value">{formatCurrency(roi.avgLeadValue)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Sources</div>
          <div className="kpi-value">{roi.bySource.length}</div>
        </div>
      </div>
      {roi.bySource.length > 0 && (
        <div className="admin-card">
          <h3 style={{ marginBottom: 12 }}>Value by Traffic Source</h3>
          <table className="table">
            <thead>
              <tr><th>Source</th><th>Leads</th><th>Est. Value</th><th>Avg/Lead</th></tr>
            </thead>
            <tbody>
              {roi.bySource.map((s) => (
                <tr key={s.source}>
                  <td><strong>{s.source}</strong></td>
                  <td>{s.leads}</td>
                  <td style={{ color: "var(--success)", fontWeight: 600 }}>{formatCurrency(s.estimatedValue)}</td>
                  <td>{formatCurrency(s.avgValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
