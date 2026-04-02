"use client";

import { useState } from "react";

type Client = { id: string; name: string; slug: string };

type Props = {
  clients: Client[];
  appUrl: string;
  widgetUrl: string;
};

export function InstallPreview({ clients, appUrl, widgetUrl }: Props) {
  const [selectedSlug, setSelectedSlug] = useState(clients[0]?.slug ?? "");
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const selectedClient = clients.find((c) => c.slug === selectedSlug);
  const snippet = `<script src="${widgetUrl}" data-client-slug="${selectedSlug}" data-api-base="${appUrl}" defer></script>`;
  const widgetIframeUrl = `${appUrl}/widget/${selectedSlug}`;

  function handleCopy() {
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{ marginTop: 20 }}>
      {/* Client selector */}
      <div className="admin-card" style={{ marginBottom: 20 }}>
        <label className="admin-label">
          Select Client
          <select className="text-input" value={selectedSlug} onChange={(e) => { setSelectedSlug(e.target.value); setShowPreview(false); }} style={{ maxWidth: 320 }}>
            {clients.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
          </select>
        </label>
      </div>

      {/* Embed code + preview side by side */}
      <div className="install-layout">
        <div className="admin-card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h2>{selectedClient?.name ?? "Widget"} Embed Code</h2>
            <button className="export-btn" onClick={handleCopy}>
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          <pre className="code-block" style={{ fontSize: 12, wordBreak: "break-all", whiteSpace: "pre-wrap" }}>{snippet}</pre>

          <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center" }}>
            <button className="primary-button" style={{ width: "auto" }} onClick={() => setShowPreview(!showPreview)}>
              {showPreview ? "Hide Preview" : "Show Live Preview"}
            </button>
            <a href={`/widget/${selectedSlug}`} target="_blank" rel="noreferrer" className="admin-link">
              Open in new tab &rarr;
            </a>
          </div>
        </div>

        {/* Live preview */}
        {showPreview && (
          <div className="install-preview-panel">
            <div className="install-preview-label">Live Preview</div>
            <div className="install-preview-browser">
              <div className="install-preview-toolbar">
                <div className="install-preview-dots">
                  <span className="dot red" />
                  <span className="dot yellow" />
                  <span className="dot green" />
                </div>
                <div className="install-preview-url">{selectedClient?.name ?? "Client"} Website</div>
              </div>
              <div className="install-preview-content">
                <div className="install-preview-site">
                  <div style={{ padding: "40px 24px", color: "var(--muted)" }}>
                    <div style={{ width: 180, height: 20, background: "var(--border-light)", borderRadius: 4, marginBottom: 16 }} />
                    <div style={{ width: "90%", height: 12, background: "var(--border-light)", borderRadius: 4, marginBottom: 8 }} />
                    <div style={{ width: "75%", height: 12, background: "var(--border-light)", borderRadius: 4, marginBottom: 8 }} />
                    <div style={{ width: "60%", height: 12, background: "var(--border-light)", borderRadius: 4, marginBottom: 24 }} />
                    <div style={{ width: "85%", height: 12, background: "var(--border-light)", borderRadius: 4, marginBottom: 8 }} />
                    <div style={{ width: "70%", height: 12, background: "var(--border-light)", borderRadius: 4 }} />
                  </div>
                </div>
                <iframe
                  src={widgetIframeUrl}
                  title="Widget preview"
                  className="install-preview-iframe"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
