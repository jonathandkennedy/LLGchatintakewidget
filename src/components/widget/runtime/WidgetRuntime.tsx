"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { WidgetPublicConfig, WidgetStep } from "@/types/widget";

type Props = { clientSlug: string };

type StepResponse = {
  ok?: boolean;
  nextStepKey?: string | null;
  error?: string;
  fieldErrors?: Array<{ fieldKey: string; message: string }>;
};

type CompleteResponse = { ok: boolean; leadId: string; status: string };
type ConnectResponse = { ok: boolean; status: string; reason?: string };

type ChatMessage = {
  id: string;
  role: "bot" | "user";
  text: string;
  timestamp: string;
};

const STATE_OPTIONS = ["Arizona", "California", "Nevada", "Washington"];

function timeAgo() { return "a few seconds ago"; }

export function WidgetRuntime({ clientSlug }: Props) {
  const [config, setConfig] = useState<WidgetPublicConfig | null>(null);
  const [currentKey, setCurrentKey] = useState<string>("welcome");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [selectedMulti, setSelectedMulti] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function boot() {
      const response = await fetch(`/api/widget/config?clientSlug=${encodeURIComponent(clientSlug)}`, { cache: "no-store" });
      const nextConfig = await response.json();
      setConfig(nextConfig);
      setCurrentKey(nextConfig.flow.steps[0]?.key ?? "welcome");
      setLoading(false);
    }
    boot().catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to load widget");
      setLoading(false);
    });
  }, [clientSlug]);

  const step = useMemo(() => config?.flow.steps.find((s) => s.key === currentKey), [config, currentKey]);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages, currentKey]);

  useEffect(() => {
    if (!step || loading) return;
    const welcomeText = step.type === "welcome" && config
      ? config.branding.welcomeHeadline + (config.branding.welcomeBody ? "\n" + config.branding.welcomeBody : "")
      : step.title + (step.description ? "\n" + step.description : "");
    addBotMessage(welcomeText);
  }, [currentKey, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setInputValue("");
    setSelectedMulti([]);
    setError("");
  }, [currentKey]);

  function addBotMessage(text: string) {
    setMessages((prev) => [...prev, { id: `bot-${Date.now()}`, role: "bot", text, timestamp: timeAgo() }]);
  }

  function addUserMessage(text: string) {
    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: "user", text, timestamp: timeAgo() }]);
  }

  async function ensureSession() {
    if (!config) throw new Error("Widget config missing");
    if (sessionId) return sessionId;
    const response = await fetch("/api/widget/session/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: config.clientId,
        flowId: config.flow.id,
        landingPageUrl: typeof window !== "undefined" ? window.location.href : undefined,
        referrerUrl: typeof document !== "undefined" ? document.referrer : undefined,
        deviceType: typeof window !== "undefined" && window.innerWidth < 768 ? "mobile" : "desktop",
      }),
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error ?? "Failed to create session");
    setSessionId(json.sessionId);
    return json.sessionId as string;
  }

  async function submitField(fieldKey: string, value: unknown, stepKey = currentKey) {
    const sid = await ensureSession();
    const response = await fetch("/api/widget/session/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: sid, stepKey, fieldKey, value }),
    });
    const json = (await response.json()) as StepResponse;
    if (!response.ok || json.ok === false) {
      throw new Error(json.fieldErrors?.[0]?.message ?? json.error ?? "Failed to save answer");
    }
    if (fieldKey) setAnswers((c) => ({ ...c, [fieldKey]: value }));
    return json;
  }

  async function handleOptionSelect(optionKey: string, label: string) {
    if (!step?.fieldKey) return;
    setSubmitting(true);
    setError("");
    addUserMessage(label);
    try {
      const json = await submitField(step.fieldKey, optionKey);
      if (json.nextStepKey) setCurrentKey(json.nextStepKey);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTextSubmit() {
    if (!step || !inputValue.trim()) return;
    setSubmitting(true);
    setError("");
    addUserMessage(inputValue);
    try {
      const json = await submitField(String(step.fieldKey), inputValue);
      if (json.nextStepKey) setCurrentKey(json.nextStepKey);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleNameSubmit() {
    if (!step || !firstName.trim() || !lastName.trim()) return;
    setSubmitting(true);
    setError("");
    addUserMessage(`${firstName} ${lastName}`);
    try {
      await ensureSession();
      await Promise.all([
        submitField("first_name", firstName, step.key),
        submitField("last_name", lastName, step.key),
      ]);
      setAnswers((c) => ({ ...c, first_name: firstName, last_name: lastName }));
      setCurrentKey(step.next ?? "phone");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMultiSubmit() {
    if (!step) return;
    setSubmitting(true);
    setError("");
    addUserMessage(selectedMulti.join(", "));
    try {
      const json = await submitField(String(step.fieldKey), selectedMulti);
      if (json.nextStepKey) setCurrentKey(json.nextStepKey);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleWelcome() {
    setSubmitting(true);
    addUserMessage("Start intake");
    try {
      const sid = await ensureSession();
      setSessionId(sid);
      setCurrentKey(step?.next ?? "matter_type");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTransfer() {
    if (!step) return;
    setSubmitting(true);
    setError("");
    addUserMessage("Connect me now");
    try {
      const sid = await ensureSession();
      const completeRes = await fetch("/api/widget/session/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid }),
      });
      const completeJson = (await completeRes.json()) as CompleteResponse;
      if (!completeRes.ok || !completeJson.ok) throw new Error("Failed to complete intake");
      setLeadId(completeJson.leadId);
      setCurrentKey("connecting");

      const connectRes = await fetch("/api/widget/call/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid, leadId: completeJson.leadId }),
      });
      const connectJson = (await connectRes.json()) as ConnectResponse;
      if (!connectRes.ok) throw new Error(connectJson.reason ?? "Failed to connect call");
      setCurrentKey(connectJson.status === "initiated" ? "connected" : "transfer_fallback");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="widget-card">
        <div className="chat-thread">
          <div className="loading-skeleton">
            <div className="loading-spinner" />
            <div className="loading-text">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!config || !step) return <div className="widget-card"><div className="chat-thread">Widget unavailable.</div></div>;

  const hasInput = inputValue.trim().length > 0;
  const hasName = firstName.trim().length > 0 && lastName.trim().length > 0;

  return (
    <div className="widget-card widget-runtime">
      {/* Toolbar */}
      <div className="widget-toolbar">
        <button className="widget-toolbar-btn" title="Restart" onClick={() => window.location.reload()}>&#8634;</button>
        <button className="widget-toolbar-btn" title="Close" onClick={() => window.parent?.postMessage?.("widget-close", "*")}>&times;</button>
      </div>

      {/* Chat thread */}
      <div className="chat-thread" ref={threadRef}>
        {error && <div className="error-banner">{error}</div>}

        {messages.map((msg) => (
          <div key={msg.id} className={`chat-msg ${msg.role === "bot" ? "chat-msg-bot" : "chat-msg-user"}`}>
            <div className={`chat-bubble ${msg.role === "bot" ? "chat-bubble-bot" : "chat-bubble-user"}`}>
              {msg.text}
            </div>
            {msg.role === "bot" ? (
              <div className="chat-avatar-row">
                <div className="chat-avatar" />
                <span className="chat-timestamp">{msg.timestamp}</span>
              </div>
            ) : (
              <div className="chat-timestamp-right">{msg.timestamp}</div>
            )}
          </div>
        ))}

        {/* Privacy notice after welcome */}
        {messages.length === 1 && config.branding.privacyUrl && (
          <div className="chat-privacy">
            This transcript will be recorded by {config.branding.widgetTitle} and its affiliates. We respect your privacy.{" "}
            <a href={config.branding.privacyUrl} target="_blank" rel="noreferrer">Privacy Policy</a>
          </div>
        )}

        {/* Interactive options */}
        {step.type === "welcome" && (
          <div className="chat-msg chat-msg-bot" style={{ marginTop: 8 }}>
            <button className="chat-pill" disabled={submitting} onClick={handleWelcome}>Start intake</button>
          </div>
        )}

        {(step.type === "single_select" || step.type === "date_range") && (
          <div className="chat-msg chat-msg-bot" style={{ marginTop: 4 }}>
            <div className="chat-options">
              {step.options?.map((opt) => (
                <button key={opt.key} className="chat-pill" disabled={submitting} onClick={() => handleOptionSelect(opt.key, opt.label)}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step.type === "multi_select" && (
          <div className="chat-msg chat-msg-bot" style={{ marginTop: 4 }}>
            <div className="chat-options">
              {step.options?.map((opt) => (
                <button
                  key={opt.key}
                  className={`chat-pill ${selectedMulti.includes(opt.key) ? "selected" : ""}`}
                  disabled={submitting}
                  onClick={() => setSelectedMulti((c) => c.includes(opt.key) ? c.filter((k) => k !== opt.key) : [...c, opt.key])}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {selectedMulti.length > 0 && (
              <button className="chat-pill selected" style={{ marginTop: 8 }} disabled={submitting} onClick={handleMultiSubmit}>Continue</button>
            )}
          </div>
        )}

        {step.type === "dropdown" && (
          <div className="chat-msg chat-msg-bot" style={{ marginTop: 4 }}>
            <div className="chat-options">
              {STATE_OPTIONS.map((state) => (
                <button key={state} className="chat-pill" disabled={submitting} onClick={() => handleOptionSelect(state, state)}>
                  {state}
                </button>
              ))}
            </div>
          </div>
        )}

        {step.type === "transfer_ready" && (
          <div className="chat-msg chat-msg-bot" style={{ marginTop: 4 }}>
            <div className="chat-options">
              <button className="chat-pill" disabled={submitting} onClick={handleTransfer}>Connect me now</button>
            </div>
          </div>
        )}

        {step.type === "connecting" && (
          <div className="chat-msg chat-msg-bot" style={{ marginTop: 8 }}>
            <div className="status-pill">Connecting your call...</div>
          </div>
        )}

        {(step.type === "connected" || step.type === "fallback" || step.type === "callback_confirmation") && (
          <div className="chat-msg chat-msg-bot" style={{ marginTop: 8 }}>
            <div className="answer-preview">Lead: {leadId ?? "pending"}{"\n"}Status: {step.type}</div>
            <button className="chat-pill" style={{ marginTop: 8 }} onClick={() => window.location.reload()}>Restart</button>
          </div>
        )}
      </div>

      {/* Input bar */}
      {step.type === "name" && (
        <div className="chat-input-bar">
          <div className="chat-name-row">
            <input className="chat-name-input" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <input className="chat-name-input" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <div style={{ marginTop: 8, display: "flex", justifyContent: "center" }}>
            <button className={`chat-submit-btn ${hasName ? "active" : ""}`} disabled={!hasName || submitting} onClick={handleNameSubmit}>&#10003;</button>
          </div>
        </div>
      )}

      {(step.type === "short_text" || step.type === "phone" || step.type === "email") && (
        <div className="chat-input-bar">
          <div className="chat-input-row">
            <input
              className="chat-input-field"
              type={step.type === "email" ? "email" : step.type === "phone" ? "tel" : "text"}
              placeholder={step.placeholder ?? "Type here..."}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTextSubmit()}
            />
            <button className={`chat-submit-btn ${hasInput ? "active" : ""}`} disabled={!hasInput || submitting} onClick={handleTextSubmit}>&#9654;</button>
          </div>
        </div>
      )}

      {(step.type === "long_text" || step.type === "textarea_optional") && (
        <div className="chat-input-bar">
          <div className="chat-input-row">
            <textarea
              className="chat-input-field"
              placeholder={step.placeholder ?? "Type here..."}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              rows={2}
            />
            <button
              className={`chat-submit-btn ${hasInput ? "active" : ""}`}
              disabled={!hasInput && step.type !== "textarea_optional"}
              onClick={handleTextSubmit}
            >&#9654;</button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="widget-footer">
        {config.branding.privacyUrl ? <a href={config.branding.privacyUrl} target="_blank" rel="noreferrer">Privacy</a> : null}
        {config.branding.termsUrl ? <a href={config.branding.termsUrl} target="_blank" rel="noreferrer">Terms</a> : null}
        <span style={{ marginLeft: "auto" }}>Powered by <strong>IntakeLLG</strong></span>
      </div>
    </div>
  );
}
