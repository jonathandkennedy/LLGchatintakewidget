import { supabaseAdmin } from "@/lib/supabase/admin";
import { getErrorCounts } from "@/lib/monitoring/error-tracker";

export const dynamic = "force-dynamic";

type ServiceCheck = {
  name: string;
  status: "ok" | "warning" | "error" | "unconfigured";
  detail: string;
  latency?: number;
};

async function checkServices(): Promise<ServiceCheck[]> {
  const services: ServiceCheck[] = [];

  // Database
  try {
    const start = Date.now();
    const { error } = await supabaseAdmin.from("clients").select("id").limit(1);
    const latency = Date.now() - start;
    services.push({
      name: "Database (Supabase)",
      status: error ? "error" : latency > 2000 ? "warning" : "ok",
      detail: error ? error.message : `Connected (${latency}ms)`,
      latency,
    });
  } catch (e) {
    services.push({ name: "Database (Supabase)", status: "error", detail: e instanceof Error ? e.message : "Connection failed" });
  }

  // Telnyx
  services.push({
    name: "Telnyx (Voice + SMS)",
    status: process.env.TELNYX_API_KEY ? "ok" : "unconfigured",
    detail: process.env.TELNYX_API_KEY ? "API key configured" : "TELNYX_API_KEY not set",
  });

  // Resend
  services.push({
    name: "Resend (Email)",
    status: process.env.RESEND_API_KEY ? "ok" : "unconfigured",
    detail: process.env.RESEND_API_KEY ? "API key configured" : "RESEND_API_KEY not set",
  });

  // Anthropic
  services.push({
    name: "Claude AI (Classification)",
    status: process.env.ANTHROPIC_API_KEY ? "ok" : "unconfigured",
    detail: process.env.ANTHROPIC_API_KEY ? "API key configured" : "ANTHROPIC_API_KEY not set",
  });

  // Slack
  services.push({
    name: "Slack (Notifications)",
    status: process.env.SLACK_WEBHOOK_URL ? "ok" : "unconfigured",
    detail: process.env.SLACK_WEBHOOK_URL ? "Webhook configured" : "SLACK_WEBHOOK_URL not set",
  });

  // Google Sheets
  services.push({
    name: "Google Sheets",
    status: process.env.GOOGLE_SHEETS_WEBHOOK_URL ? "ok" : "unconfigured",
    detail: process.env.GOOGLE_SHEETS_WEBHOOK_URL ? "Webhook configured" : "GOOGLE_SHEETS_WEBHOOK_URL not set",
  });

  return services;
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  ok: { bg: "#d1fae5", color: "#059669", label: "Operational" },
  warning: { bg: "#fef3c7", color: "#d97706", label: "Degraded" },
  error: { bg: "#fee2e2", color: "#dc2626", label: "Down" },
  unconfigured: { bg: "#f1f5f9", color: "#64748b", label: "Not Configured" },
};

export default async function StatusPage() {
  const [services, errorCounts] = await Promise.all([
    checkServices(),
    getErrorCounts(24),
  ]);

  const allOk = services.every((s) => s.status === "ok" || s.status === "unconfigured");
  const totalErrors = Object.values(errorCounts).reduce((s, c) => s + c, 0);

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <h1>System Status</h1>
        <p className="muted">Real-time health of all connected services.</p>
      </div>

      <div className="admin-card" style={{ marginBottom: 24, textAlign: "center", padding: 32 }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%", margin: "0 auto 12px",
          background: allOk ? "#d1fae5" : "#fef3c7",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28,
        }}>
          {allOk ? "\u2713" : "\u26A0"}
        </div>
        <h2 style={{ color: allOk ? "var(--success)" : "var(--warning)" }}>
          {allOk ? "All Systems Operational" : "Some Services Need Attention"}
        </h2>
        {totalErrors > 0 && <p className="muted">{totalErrors} errors in the last 24 hours</p>}
      </div>

      <div className="admin-card">
        <table className="table">
          <thead>
            <tr><th>Service</th><th>Status</th><th>Detail</th></tr>
          </thead>
          <tbody>
            {services.map((s) => {
              const style = STATUS_STYLES[s.status];
              return (
                <tr key={s.name}>
                  <td><strong>{s.name}</strong></td>
                  <td>
                    <span style={{ display: "inline-block", padding: "3px 12px", borderRadius: 999, background: style.bg, color: style.color, fontSize: 12, fontWeight: 700 }}>
                      {style.label}
                    </span>
                  </td>
                  <td className="muted text-sm">{s.detail}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="admin-card" style={{ marginTop: 20 }}>
        <h3>Environment</h3>
        <table className="table" style={{ marginTop: 12 }}>
          <tbody>
            <tr><td><strong>Node.js</strong></td><td className="muted">{process.version}</td></tr>
            <tr><td><strong>Next.js</strong></td><td className="muted">14.2.25</td></tr>
            <tr><td><strong>App URL</strong></td><td className="muted">{process.env.NEXT_PUBLIC_APP_URL ?? "Not set"}</td></tr>
            <tr><td><strong>Region</strong></td><td className="muted">{process.env.VERCEL_REGION ?? process.env.AWS_REGION ?? "Unknown"}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
