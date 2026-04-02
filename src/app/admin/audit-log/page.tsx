import { getAuditLog } from "@/lib/monitoring/audit";

export const dynamic = "force-dynamic";

const ACTION_LABELS: Record<string, string> = {
  "lead.status_updated": "Lead status updated",
  "lead.assigned": "Lead assigned",
  "lead.exported": "Leads exported",
  "branding.updated": "Branding updated",
  "flow.step_created": "Flow step created",
  "flow.step_updated": "Flow step updated",
  "flow.step_deleted": "Flow step deleted",
  "flow.step_moved": "Flow step moved",
  "flow.created": "Flow created",
  "ab_test.created": "A/B test created",
  "ab_test.status_changed": "A/B test status changed",
  "webhook.configured": "Webhook configured",
  "admin.login": "Admin logged in",
  "admin.logout": "Admin logged out",
};

const ACTION_COLORS: Record<string, string> = {
  "lead.status_updated": "warm",
  "lead.assigned": "medium",
  "lead.exported": "cool",
  "branding.updated": "medium",
  "flow.step_created": "warm",
  "flow.step_updated": "medium",
  "flow.step_deleted": "hot",
  "admin.login": "cool",
  "admin.logout": "cold",
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default async function AuditLogPage() {
  const entries = await getAuditLog(100);

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <h1>Audit Log</h1>
        <p className="muted">Track all admin actions and system events.</p>
      </div>

      <section className="admin-card">
        {entries.length === 0 ? (
          <p className="muted" style={{ textAlign: "center", padding: 32 }}>No audit entries yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Actor</th>
                <th>Resource</th>
                <th>Details</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <span className={`score-badge score-${ACTION_COLORS[entry.action] ?? "cold"}`}>
                      {ACTION_LABELS[entry.action] ?? entry.action}
                    </span>
                  </td>
                  <td>{entry.actor}</td>
                  <td>
                    {entry.resource_type && entry.resource_id ? (
                      <span className="muted text-sm">{entry.resource_type}:{entry.resource_id.slice(0, 8)}</span>
                    ) : "\u2014"}
                  </td>
                  <td>
                    {entry.details_json ? (
                      <code style={{ fontSize: 11 }}>{JSON.stringify(entry.details_json).slice(0, 80)}</code>
                    ) : "\u2014"}
                  </td>
                  <td><span className="muted text-sm">{timeAgo(entry.created_at)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
