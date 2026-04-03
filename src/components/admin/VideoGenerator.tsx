"use client";

import { useState } from "react";

type Props = {
  clientId: string;
  videoType: "welcome" | "connecting";
  currentUrl: string | null;
};

type Tab = "upload" | "generate";

const DEFAULT_SCRIPTS = {
  welcome: "Welcome! I'm here to help you with your case. Answer a few quick questions and we'll connect you with our legal team as fast as possible.",
  connecting: "Thank you for sharing your information. An intake specialist is reviewing your case now and will be connecting with you shortly.",
};

export function VideoGenerator({ clientId, videoType, currentUrl }: Props) {
  const [tab, setTab] = useState<Tab>("upload");
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [script, setScript] = useState(DEFAULT_SCRIPTS[videoType]);
  const [useFast, setUseFast] = useState(false);
  const [progress, setProgress] = useState("");

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("clientId", clientId);
    formData.set("videoType", videoType);
    formData.set("mode", "upload");

    setUploading(true);
    setError("");
    setResult("");
    try {
      const res = await fetch("/api/admin/video", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      setResult(`Video uploaded! URL: ${json.videoUrl}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleGenerate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("clientId", clientId);
    formData.set("videoType", videoType);
    formData.set("mode", "generate");
    formData.set("script", script);
    formData.set("useFast", String(useFast));

    setGenerating(true);
    setError("");
    setResult("");
    setProgress("Generating video... This may take 1-3 minutes.");

    try {
      const res = await fetch("/api/admin/video", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Generation failed");
      setResult(`Video generated! Credits used: ${json.creditsUsed ?? "N/A"}. Duration: ${json.duration ?? "N/A"}s`);
      setProgress("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
      setProgress("");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="video-generator">
      <h3 style={{ marginBottom: 8 }}>{videoType === "welcome" ? "Welcome Video" : "Connecting Video"}</h3>

      {currentUrl && (
        <div style={{ marginBottom: 12 }}>
          <video src={currentUrl} controls style={{ width: "100%", maxHeight: 200, borderRadius: 12, background: "#000" }} />
        </div>
      )}

      {/* Tabs */}
      <div className="login-tabs" style={{ marginBottom: 0 }}>
        <button className={`login-tab ${tab === "upload" ? "active" : ""}`} onClick={() => setTab("upload")}>Upload Video</button>
        <button className={`login-tab ${tab === "generate" ? "active" : ""}`} onClick={() => setTab("generate")}>Generate with AI</button>
      </div>

      {error && <div className="error-banner" style={{ marginTop: 12 }}>{error}</div>}
      {result && <div className="success-banner" style={{ marginTop: 12 }}>{result}</div>}
      {progress && <div style={{ marginTop: 12, padding: 12, background: "var(--primary-weak)", borderRadius: 10, fontSize: 14, fontWeight: 500, color: "var(--primary)" }}>{progress}</div>}

      {/* Upload tab */}
      {tab === "upload" && (
        <form onSubmit={handleUpload} style={{ marginTop: 12 }}>
          <label className="admin-label">
            Video File (MP4, WebM, MOV)
            <input className="text-input" type="file" name="video" accept="video/*" required />
          </label>
          <button className="primary-button" type="submit" disabled={uploading} style={{ width: "auto" }}>
            {uploading ? "Uploading..." : "Upload Video"}
          </button>
        </form>
      )}

      {/* Generate tab */}
      {tab === "generate" && (
        <form onSubmit={handleGenerate} style={{ marginTop: 12 }}>
          <label className="admin-label">
            Lawyer Photo (JPG, PNG, WebP)
            <input className="text-input" type="file" name="image" accept="image/jpeg,image/png,image/webp" required />
          </label>

          <div style={{ marginBottom: 12, padding: 12, background: "var(--border-light)", borderRadius: 10 }}>
            <div className="muted text-sm" style={{ fontWeight: 600, marginBottom: 6 }}>Audio Source</div>
            <label className="admin-label">
              Upload audio clip (optional - if not provided, script below will be used for TTS)
              <input className="text-input" type="file" name="audio" accept="audio/mp3,audio/wav,audio/mpeg" />
            </label>
            <label className="admin-label">
              Or enter a script (will be converted to speech)
              <textarea className="text-input" value={script} onChange={(e) => setScript(e.target.value)} rows={3} style={{ minHeight: 80 }} />
            </label>
          </div>

          <label className="checkbox-label" style={{ marginBottom: 12 }}>
            <input type="checkbox" checked={useFast} onChange={(e) => setUseFast(e.target.checked)} />
            Fast mode (10 credits/15s instead of 20 - lower quality)
          </label>

          <button className="primary-button" type="submit" disabled={generating} style={{ width: "auto" }}>
            {generating ? "Generating..." : "Generate Video with Creatify AI"}
          </button>
          <p className="muted text-sm" style={{ marginTop: 8 }}>Costs ~20 credits per 15 seconds of video. Generation takes 1-3 minutes.</p>
        </form>
      )}
    </div>
  );
}
