export default function ApiDocsPage() {
  const endpoints = [
    {
      category: "Widget",
      routes: [
        { method: "GET", path: "/api/widget/config", desc: "Get widget configuration for a client", params: "clientSlug (query)", auth: false, rateLimit: "30/min" },
        { method: "POST", path: "/api/widget/session/start", desc: "Create a new intake session", params: "clientId, flowId, landingPageUrl, deviceType", auth: false, rateLimit: "10/min" },
        { method: "POST", path: "/api/widget/session/answer", desc: "Submit an answer for a step", params: "sessionId, stepKey, fieldKey, value", auth: false, rateLimit: "60/min" },
        { method: "POST", path: "/api/widget/session/complete", desc: "Finalize session and create lead", params: "sessionId", auth: false, rateLimit: "5/min" },
        { method: "POST", path: "/api/widget/session/revert", desc: "Undo answers from a step forward", params: "sessionId, toStepKey", auth: false, rateLimit: "10/min" },
        { method: "POST", path: "/api/widget/call/connect", desc: "Initiate a call connection", params: "sessionId, leadId", auth: false, rateLimit: "3/min" },
        { method: "POST", path: "/api/widget/callback/request", desc: "Request a callback", params: "leadId", auth: false, rateLimit: "3/min" },
        { method: "POST", path: "/api/widget/event", desc: "Track a widget analytics event", params: "clientId, sessionId, eventName, eventProperties", auth: false, rateLimit: "60/min" },
        { method: "POST", path: "/api/widget/upload", desc: "Upload a file (photo/document)", params: "file, sessionId, fieldKey (FormData)", auth: false, rateLimit: "10/min" },
      ],
    },
    {
      category: "Admin - Leads",
      routes: [
        { method: "GET", path: "/api/admin/leads", desc: "List leads with filters", params: "clientId, status, matterType, q", auth: true, rateLimit: null },
        { method: "GET", path: "/api/admin/leads/[id]", desc: "Get lead detail with answers, calls, SMS", params: "id (path)", auth: true, rateLimit: null },
        { method: "PATCH", path: "/api/admin/leads/[id]/status", desc: "Update lead status", params: "status", auth: true, rateLimit: null },
        { method: "GET", path: "/api/admin/leads/export", desc: "Export leads as CSV", params: "status, q", auth: true, rateLimit: null },
        { method: "POST", path: "/api/admin/leads/merge", desc: "Merge two duplicate leads", params: "primaryId, secondaryId", auth: true, rateLimit: null },
        { method: "GET/POST", path: "/api/admin/leads/notes", desc: "Get or add internal notes", params: "leadId, content, author", auth: true, rateLimit: null },
        { method: "GET/POST/DEL", path: "/api/admin/leads/tags", desc: "Manage lead tags", params: "leadId, tag, color, tagId", auth: true, rateLimit: null },
      ],
    },
    {
      category: "Admin - Config",
      routes: [
        { method: "POST", path: "/api/admin/auth", desc: "Login/logout (password, magic link, OTP)", params: "action, password, email, code, token", auth: false, rateLimit: null },
        { method: "POST", path: "/api/admin/branding", desc: "Update client branding", params: "clientId + branding fields (FormData)", auth: true, rateLimit: null },
        { method: "POST", path: "/api/admin/onboarding", desc: "Client setup wizard actions", params: "action, name, slug, clientId", auth: true, rateLimit: null },
      ],
    },
    {
      category: "System",
      routes: [
        { method: "GET", path: "/api/health", desc: "Health check (DB, services)", params: "none", auth: false, rateLimit: null },
      ],
    },
    {
      category: "Webhooks (Inbound)",
      routes: [
        { method: "POST", path: "/api/providers/telnyx/voice/webhook", desc: "Telnyx voice call events", params: "Telnyx webhook payload", auth: false, rateLimit: null },
        { method: "POST", path: "/api/providers/telnyx/messaging/webhook", desc: "Telnyx SMS events", params: "Telnyx webhook payload", auth: false, rateLimit: null },
      ],
    },
  ];

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <h1>API Documentation</h1>
        <p className="muted">All available API endpoints with parameters, authentication, and rate limits.</p>
      </div>

      {endpoints.map((group) => (
        <section key={group.category} className="admin-card" style={{ marginBottom: 20 }}>
          <h2>{group.category}</h2>
          <table className="table" style={{ marginTop: 12 }}>
            <thead>
              <tr><th>Method</th><th>Endpoint</th><th>Description</th><th>Auth</th><th>Rate Limit</th></tr>
            </thead>
            <tbody>
              {group.routes.map((route) => (
                <tr key={route.path + route.method}>
                  <td>
                    <span className={`score-badge score-${route.method === "GET" ? "cool" : route.method.includes("DEL") ? "hot" : "warm"}`} style={{ fontSize: 10 }}>
                      {route.method}
                    </span>
                  </td>
                  <td><code style={{ fontSize: 12, wordBreak: "break-all" }}>{route.path}</code></td>
                  <td>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{route.desc}</div>
                    <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{route.params}</div>
                  </td>
                  <td>{route.auth ? <span className="score-badge score-warm" style={{ fontSize: 10 }}>Auth</span> : <span className="muted text-sm">Public</span>}</td>
                  <td>{route.rateLimit ? <span className="muted text-sm">{route.rateLimit}</span> : "\u2014"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
