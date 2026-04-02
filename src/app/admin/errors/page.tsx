import { getRecentErrors, getErrorCounts } from "@/lib/monitoring/error-tracker";

export const dynamic = "force-dynamic";

const SOURCE_COLORS: Record<string, string> = {
  widget: "cool",
  api: "warm",
  admin: "medium",
  webhook: "hot",
  integration: "medium",
};

function timeAgo(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default async function ErrorsPage() {
  const [errors, counts] = await Promise.all([
    getRecentErrors(100),
    getErrorCounts(24),
  ]);

  const totalErrors = Object.values(counts).reduce((s, c) => s + c, 0);

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <h1>Error Tracking</h1>
        <p className="muted">Monitor widget and API errors across the platform.</p>
      </div>

      <div className="kpi-grid-4" style={{ marginBottom: 24 }}>
        <div className="kpi-card">
          <div className="kpi-label">Errors (24h)</div>
          <div className="kpi-value" style={{ color: totalErrors > 0 ? "var(--error)" : "var(--success)" }}>{totalErrors}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Widget</div>
          <div className="kpi-value">{counts.widget ?? 0}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">API</div>
          <div className="kpi-value">{counts.api ?? 0}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Integrations</div>
          <div className="kpi-value">{(counts.webhook ?? 0) + (counts.integration ?? 0)}</div>
        </div>
      </div>

      <section className="admin-card">
        {errors.length === 0 ? (
          <p className="muted" style={{ textAlign: "center", padding: 32 }}>No errors recorded. Everything is running smoothly.</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Source</th><th>Message</th><th>When</th></tr>
            </thead>
            <tbody>
              {errors.map((err) => (
                <tr key={err.id}>
                  <td><span className={`score-badge score-${SOURCE_COLORS[err.source] ?? "cold"}`}>{err.source}</span></td>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{err.message}</div>
                    {err.stack && <details style={{ marginTop: 4 }}><summary className="muted text-sm" style={{ cursor: "pointer" }}>Stack trace</summary><pre style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "pre-wrap", marginTop: 4 }}>{err.stack}</pre></details>}
                  </td>
                  <td><span className="muted text-sm">{timeAgo(err.created_at)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
