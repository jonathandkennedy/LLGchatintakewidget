"use client";

import { useState } from "react";

type BrandingValues = {
  primaryColor: string;
  accentColor: string;
  widgetTitle: string;
  welcomeHeadline: string;
  welcomeBody: string;
  logoUrl: string;
  avatarUrl: string;
  welcomeVideoUrl: string;
  privacyUrl: string;
  termsUrl: string;
};

type Props = {
  clientId: string;
  initial: BrandingValues;
};

export function BrandingEditor({ clientId, initial }: Props) {
  const [values, setValues] = useState<BrandingValues>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function update(key: keyof BrandingValues, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const formData = new FormData();
      formData.set("clientId", clientId);
      formData.set("primaryColor", values.primaryColor);
      formData.set("accentColor", values.accentColor);
      formData.set("widgetTitle", values.widgetTitle);
      formData.set("welcomeHeadline", values.welcomeHeadline);
      formData.set("welcomeBody", values.welcomeBody);
      formData.set("logoUrl", values.logoUrl);
      formData.set("avatarUrl", values.avatarUrl);
      formData.set("welcomeVideoUrl", values.welcomeVideoUrl);
      formData.set("privacyUrl", values.privacyUrl);
      formData.set("termsUrl", values.termsUrl);

      await fetch("/api/admin/branding", {
        method: "POST",
        body: formData,
      });
      setSaved(true);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  const avatarSrc = values.avatarUrl || values.logoUrl || "";

  return (
    <div className="branding-layout">
      {/* Editor Panel */}
      <div className="admin-card branding-form">
        <h2>Colors</h2>
        <div className="branding-grid-2">
          <label className="admin-label">
            Primary Color
            <div className="branding-color-row">
              <input type="color" value={values.primaryColor} onChange={(e) => update("primaryColor", e.target.value)} className="branding-color-picker" />
              <input className="text-input" value={values.primaryColor} onChange={(e) => update("primaryColor", e.target.value)} />
            </div>
          </label>
          <label className="admin-label">
            Accent Color
            <div className="branding-color-row">
              <input type="color" value={values.accentColor} onChange={(e) => update("accentColor", e.target.value)} className="branding-color-picker" />
              <input className="text-input" value={values.accentColor} onChange={(e) => update("accentColor", e.target.value)} />
            </div>
          </label>
        </div>

        <h2 style={{ marginTop: 24 }}>Text</h2>
        <label className="admin-label">
          Widget Title
          <input className="text-input" value={values.widgetTitle} onChange={(e) => update("widgetTitle", e.target.value)} />
        </label>
        <label className="admin-label">
          Welcome Headline
          <input className="text-input" value={values.welcomeHeadline} onChange={(e) => update("welcomeHeadline", e.target.value)} />
        </label>
        <label className="admin-label">
          Welcome Body
          <textarea className="text-input text-area" value={values.welcomeBody} onChange={(e) => update("welcomeBody", e.target.value)} rows={3} style={{ minHeight: 80 }} />
        </label>

        <h2 style={{ marginTop: 24 }}>Media</h2>
        <label className="admin-label">
          Logo URL
          <input className="text-input" value={values.logoUrl} onChange={(e) => update("logoUrl", e.target.value)} placeholder="https://..." />
        </label>
        <label className="admin-label">
          Avatar URL
          <input className="text-input" value={values.avatarUrl} onChange={(e) => update("avatarUrl", e.target.value)} placeholder="https://..." />
        </label>
        <label className="admin-label">
          Welcome Video URL
          <input className="text-input" value={values.welcomeVideoUrl} onChange={(e) => update("welcomeVideoUrl", e.target.value)} placeholder="https://...mp4" />
        </label>

        <h2 style={{ marginTop: 24 }}>Legal Links</h2>
        <label className="admin-label">
          Privacy Policy URL
          <input className="text-input" value={values.privacyUrl} onChange={(e) => update("privacyUrl", e.target.value)} placeholder="https://..." />
        </label>
        <label className="admin-label">
          Terms of Service URL
          <input className="text-input" value={values.termsUrl} onChange={(e) => update("termsUrl", e.target.value)} placeholder="https://..." />
        </label>

        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 20 }}>
          <button className="primary-button" style={{ width: "auto" }} disabled={saving} onClick={handleSave}>
            {saving ? "Saving..." : "Save Branding"}
          </button>
          {saved && <span style={{ color: "var(--success)", fontWeight: 600, fontSize: 14 }}>Saved</span>}
        </div>
      </div>

      {/* Live Preview */}
      <div className="branding-preview-col">
        <div className="branding-preview-label">Live Preview</div>
        <div className="widget-card" style={{ maxWidth: 360, minHeight: 520, maxHeight: 600 }}>
          {/* Video Header */}
          <div className="chat-video-header" style={{ minHeight: 120 }}>
            {values.welcomeVideoUrl ? (
              <video className="chat-header-video" src={values.welcomeVideoUrl} autoPlay muted loop playsInline />
            ) : avatarSrc ? (
              <img src={avatarSrc} alt="" className="chat-header-image" />
            ) : (
              <div className="chat-video-placeholder"><div className="chat-video-avatar-lg" /></div>
            )}
            <div className="chat-toolbar-overlay">
              <span className="chat-toolbar-btn chat-lang-btn">Espanol</span>
              <span className="chat-toolbar-btn">&#8634;</span>
              <span className="chat-toolbar-btn">&times;</span>
            </div>
          </div>

          {/* Chat Preview */}
          <div className="chat-thread" style={{ flex: 1, padding: "16px 14px" }}>
            {/* Bot welcome message */}
            <div className="chat-msg chat-msg-bot">
              <div className="chat-bubble chat-bubble-bot" style={{ fontSize: 15 }}>
                {values.welcomeHeadline}
                {values.welcomeBody && <><br />{values.welcomeBody}</>}
              </div>
              <div className="chat-avatar-row">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="" className="chat-avatar" />
                ) : (
                  <div className="chat-avatar" />
                )}
                <span className="chat-timestamp">a few seconds ago</span>
              </div>
            </div>

            {/* Sample user response */}
            <div className="chat-msg chat-msg-user">
              <div className="chat-bubble chat-bubble-user">Car Accident</div>
              <div className="chat-timestamp-right">a few seconds ago</div>
            </div>

            {/* Sample bot follow-up */}
            <div className="chat-msg chat-msg-bot">
              <div className="chat-bubble chat-bubble-bot" style={{ fontSize: 15 }}>
                Could you briefly explain what happened?
              </div>
              <div className="chat-avatar-row">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="" className="chat-avatar" />
                ) : (
                  <div className="chat-avatar" />
                )}
                <span className="chat-timestamp">a few seconds ago</span>
              </div>
            </div>

            {/* Sample pills */}
            <div className="chat-msg chat-msg-bot" style={{ marginTop: 4 }}>
              <div className="chat-options">
                <button className="chat-pill" style={{ borderColor: values.primaryColor, background: values.primaryColor + "18" }} disabled>Car Accident</button>
                <button className="chat-pill" style={{ borderColor: values.primaryColor, background: values.primaryColor + "18" }} disabled>Truck Accident</button>
                <button className="chat-pill" style={{ borderColor: values.primaryColor, background: values.primaryColor + "18" }} disabled>Slip &amp; Fall</button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="widget-footer">
            {values.privacyUrl && <a href={values.privacyUrl} target="_blank" rel="noreferrer">Privacy</a>}
            {values.termsUrl && <a href={values.termsUrl} target="_blank" rel="noreferrer">Terms</a>}
            <span style={{ marginLeft: "auto" }}>Powered by <strong>IntakeLLG</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
