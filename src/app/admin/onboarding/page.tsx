"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Step = "client" | "branding" | "flow" | "install" | "done";

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>("client");
  const [clientName, setClientName] = useState("");
  const [clientSlug, setClientSlug] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  const [headline, setHeadline] = useState("Injured in an accident?");
  const [body, setBody] = useState("Answer a few quick questions so we can connect you with our team.");
  const [saving, setSaving] = useState(false);
  const [clientId, setClientId] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function createClient() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/intakeapp/api/admin/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_client", name: clientName, slug: clientSlug }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setClientId(json.clientId);
      setStep("branding");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function saveBranding() {
    setSaving(true);
    try {
      await fetch("/intakeapp/api/admin/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_branding", clientId, primaryColor, headline, body }),
      });
      setStep("flow");
    } catch { /* continue */ }
    finally { setSaving(false); }
  }

  async function createFlow() {
    setSaving(true);
    try {
      await fetch("/intakeapp/api/admin/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_flow", clientId }),
      });
      setStep("install");
    } catch { /* continue */ }
    finally { setSaving(false); }
  }

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";
  const snippet = `<script src="${appUrl}/intakeapp/embed/widget.js" data-client-slug="${clientSlug}" data-api-base="${appUrl}" defer></script>`;

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <h1>Client Setup Wizard</h1>
        <p className="muted">Set up a new client in 4 steps.</p>
      </div>

      {/* Progress */}
      <div className="onboarding-progress">
        {(["client", "branding", "flow", "install"] as Step[]).map((s, i) => (
          <div key={s} className={`onboarding-step-indicator ${step === s ? "active" : ""} ${["client", "branding", "flow", "install"].indexOf(step) > i ? "done" : ""}`}>
            <div className="onboarding-step-num">{i + 1}</div>
            <span>{s === "client" ? "Client" : s === "branding" ? "Branding" : s === "flow" ? "Flow" : "Install"}</span>
          </div>
        ))}
      </div>

      {/* Step 1: Client */}
      {step === "client" && (
        <section className="admin-card" style={{ maxWidth: 500 }}>
          <h2>Create Client</h2>
          {error && <div className="error-banner">{error}</div>}
          <div className="admin-form" style={{ marginTop: 12 }}>
            <label className="admin-label">
              Client Name
              <input className="text-input" value={clientName} onChange={(e) => { setClientName(e.target.value); setClientSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "")); }} placeholder="Bernard Law Group" />
            </label>
            <label className="admin-label">
              URL Slug
              <input className="text-input" value={clientSlug} onChange={(e) => setClientSlug(e.target.value)} placeholder="bernard-law-group" />
            </label>
            <button className="primary-button" disabled={saving || !clientName || !clientSlug} onClick={createClient} style={{ width: "auto" }}>
              {saving ? "Creating..." : "Create Client"}
            </button>
          </div>
        </section>
      )}

      {/* Step 2: Branding */}
      {step === "branding" && (
        <section className="admin-card" style={{ maxWidth: 500 }}>
          <h2>Set Branding</h2>
          <div className="admin-form" style={{ marginTop: 12 }}>
            <label className="admin-label">
              Primary Color
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="branding-color-picker" />
                <input className="text-input" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
              </div>
            </label>
            <label className="admin-label">
              Welcome Headline
              <input className="text-input" value={headline} onChange={(e) => setHeadline(e.target.value)} />
            </label>
            <label className="admin-label">
              Welcome Body
              <textarea className="text-input" value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
            </label>
            <button className="primary-button" disabled={saving} onClick={saveBranding} style={{ width: "auto" }}>
              {saving ? "Saving..." : "Save & Continue"}
            </button>
          </div>
        </section>
      )}

      {/* Step 3: Flow */}
      {step === "flow" && (
        <section className="admin-card" style={{ maxWidth: 500 }}>
          <h2>Create Intake Flow</h2>
          <p className="muted">This creates a complete personal injury intake flow with all default questions, options, and branch logic.</p>
          <button className="primary-button" disabled={saving} onClick={createFlow} style={{ width: "auto", marginTop: 12 }}>
            {saving ? "Creating..." : "Create Default Flow"}
          </button>
        </section>
      )}

      {/* Step 4: Install */}
      {step === "install" && (
        <section className="admin-card" style={{ maxWidth: 600 }}>
          <h2>Install the Widget</h2>
          <p className="muted">Copy this code and paste it on the client&apos;s website before {"</body>"}.</p>
          <pre className="code-block" style={{ marginTop: 12, fontSize: 12, wordBreak: "break-all", whiteSpace: "pre-wrap" }}>{snippet}</pre>
          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            <button className="primary-button" style={{ width: "auto" }} onClick={() => { navigator.clipboard.writeText(snippet); }}>Copy Code</button>
            <button className="secondary-button" style={{ width: "auto" }} onClick={() => setStep("done")}>Done</button>
          </div>
        </section>
      )}

      {/* Done */}
      {step === "done" && (
        <section className="admin-card" style={{ maxWidth: 500, textAlign: "center", padding: 40 }}>
          <h2 style={{ color: "var(--success)" }}>All Set!</h2>
          <p className="muted" style={{ marginTop: 8 }}>Client is configured and ready to receive leads.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 20 }}>
            <button className="primary-button" style={{ width: "auto" }} onClick={() => router.push("/admin")}>Go to Dashboard</button>
            <button className="secondary-button" style={{ width: "auto" }} onClick={() => { setStep("client"); setClientName(""); setClientSlug(""); setClientId(""); }}>Add Another</button>
          </div>
        </section>
      )}
    </div>
  );
}
