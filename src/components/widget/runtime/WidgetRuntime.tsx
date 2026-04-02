"use client";

import { useEffect, useMemo, useState } from "react";
import type { WidgetPublicConfig, WidgetStep } from "@/types/widget";

type Props = {
  clientSlug: string;
};

type StepResponse = {
  ok?: boolean;
  nextStepKey?: string | null;
  error?: string;
  fieldErrors?: Array<{ fieldKey: string; message: string }>;
};

type CompleteResponse = { ok: boolean; leadId: string; status: string };

type ConnectResponse = { ok: boolean; status: string; reason?: string };

const STATE_OPTIONS = ["Arizona", "California", "Nevada", "Washington"];

export function WidgetRuntime({ clientSlug }: Props) {
  const [config, setConfig] = useState<WidgetPublicConfig | null>(null);
  const [currentKey, setCurrentKey] = useState<string>("welcome");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [inputValue, setInputValue] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [selectedMulti, setSelectedMulti] = useState<string[]>([]);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function boot() {
      const response = await fetch(`/api/widget/config?clientSlug=${encodeURIComponent(clientSlug)}`, { cache: "no-store" });
      const nextConfig = await response.json();
      setConfig(nextConfig);
      setCurrentKey(nextConfig.flow.steps[0]?.key ?? "welcome");
      setLoading(false);
    }
    boot().catch((bootError) => {
      setError(bootError instanceof Error ? bootError.message : "Failed to load widget");
      setLoading(false);
    });
  }, [clientSlug]);

  const step = useMemo(() => config?.flow.steps.find((item) => item.key === currentKey), [config, currentKey]);

  useEffect(() => {
    setInputValue("");
    setSelectedMulti([]);
    setError("");
  }, [currentKey]);

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
    const activeSessionId = await ensureSession();

    const response = await fetch("/api/widget/session/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: activeSessionId, stepKey, fieldKey, value }),
    });

    const json = (await response.json()) as StepResponse;
    if (!response.ok || json.ok === false) {
      const fieldError = json.fieldErrors?.[0]?.message;
      throw new Error(fieldError ?? json.error ?? "Failed to save answer");
    }

    if (fieldKey) {
      setAnswers((current) => ({ ...current, [fieldKey]: value }));
    }

    return json;
  }

  async function handleContinue() {
    if (!step) return;
    setSubmitting(true);
    setError("");

    try {
      if (step.type === "welcome") {
        const activeSessionId = await ensureSession();
        setSessionId(activeSessionId);
        setCurrentKey(step.next ?? "matter_type");
        return;
      }

      if (step.type === "single_select" || step.type === "date_range") return;

      if (step.type === "long_text" || step.type === "short_text" || step.type === "phone" || step.type === "email" || step.type === "textarea_optional" || step.type === "dropdown") {
        const json = await submitField(String(step.fieldKey), inputValue);
        if (json.nextStepKey) setCurrentKey(json.nextStepKey);
        return;
      }

      if (step.type === "multi_select") {
        const json = await submitField(String(step.fieldKey), selectedMulti);
        if (json.nextStepKey) setCurrentKey(json.nextStepKey);
        return;
      }

      if (step.type === "name") {
        const activeSessionId = await ensureSession();
        await Promise.all([
          submitField("first_name", firstName, step.key),
          submitField("last_name", lastName, step.key),
        ]);
        setAnswers((current) => ({ ...current, first_name: firstName, last_name: lastName }));
        setSessionId(activeSessionId);
        setCurrentKey(step.next ?? "phone");
        return;
      }

      if (step.type === "transfer_ready") {
        const activeSessionId = await ensureSession();
        const completeResponse = await fetch("/api/widget/session/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: activeSessionId }),
        });
        const completeJson = (await completeResponse.json()) as CompleteResponse;
        if (!completeResponse.ok || !completeJson.ok) throw new Error("Failed to complete intake");
        setLeadId(completeJson.leadId);
        setCurrentKey("connecting");

        const connectResponse = await fetch("/api/widget/call/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: activeSessionId, leadId: completeJson.leadId }),
        });
        const connectJson = (await connectResponse.json()) as ConnectResponse;
        if (!connectResponse.ok) throw new Error(connectJson.reason ?? "Failed to connect call");
        setCurrentKey(connectJson.status === "initiated" ? "connected" : "transfer_fallback");
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleOptionSelect(optionKey: string) {
    if (!step?.fieldKey) return;
    setSubmitting(true);
    setError("");
    try {
      const json = await submitField(step.fieldKey, optionKey);
      if (json.nextStepKey) setCurrentKey(json.nextStepKey);
    } catch (selectError) {
      setError(selectError instanceof Error ? selectError.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="widget-card"><div className="widget-body">Loading widget…</div></div>;
  if (!config || !step) return <div className="widget-card"><div className="widget-body">Widget unavailable.</div></div>;

  return (
    <div className="widget-card widget-runtime" style={{ ["--widget-primary" as string]: config.branding.primaryColor }}>
      <div className="widget-header">
        <div className="eyebrow">{config.branding.widgetTitle}</div>
        <h2>{step.type === "welcome" ? config.branding.welcomeHeadline : step.title}</h2>
        <p>{step.type === "welcome" ? config.branding.welcomeBody : (step.description ?? step.helperText ?? "")}</p>
      </div>

      <div className="widget-body">
        {error ? <div className="error-banner">{error}</div> : null}

        {step.type === "welcome" && (
          <div className="stack">
            <ul className="bullet-list">
              <li>Free case review</li>
              <li>Takes about 1 minute</li>
              <li>Private and no obligation</li>
            </ul>
            <button className="primary-button" disabled={submitting} onClick={handleContinue}>Start intake</button>
          </div>
        )}

        {(step.type === "single_select" || step.type === "date_range") && (
          <div className="stack">
            {step.options?.map((option) => (
              <button key={option.key} className="option-card" disabled={submitting} onClick={() => handleOptionSelect(option.key)}>
                {option.label}
              </button>
            ))}
          </div>
        )}

        {step.type === "multi_select" && (
          <div className="stack">
            {step.options?.map((option) => (
              <button
                key={option.key}
                className={`option-card ${selectedMulti.includes(option.key) ? "selected" : ""}`}
                disabled={submitting}
                onClick={() => setSelectedMulti((current) => current.includes(option.key) ? current.filter((item) => item !== option.key) : [...current, option.key])}
              >
                {option.label}
              </button>
            ))}
            <button className="primary-button" disabled={submitting} onClick={handleContinue}>Continue</button>
          </div>
        )}

        {(step.type === "long_text" || step.type === "textarea_optional") && (
          <div className="stack">
            <textarea className="text-input text-area" value={inputValue} placeholder={step.placeholder} onChange={(event) => setInputValue(event.target.value)} />
            <button className="primary-button" disabled={submitting} onClick={handleContinue}>Continue</button>
          </div>
        )}

        {(step.type === "short_text" || step.type === "phone" || step.type === "email") && (
          <div className="stack">
            <input className="text-input" type={step.type === "email" ? "email" : step.type === "phone" ? "tel" : "text"} value={inputValue} placeholder={step.placeholder ?? (step.type === "phone" ? "(555) 555-5555" : "Type here") } onChange={(event) => setInputValue(event.target.value)} />
            <button className="primary-button" disabled={submitting} onClick={handleContinue}>Continue</button>
          </div>
        )}

        {step.type === "dropdown" && (
          <div className="stack">
            <select className="text-input" value={inputValue} onChange={(event) => setInputValue(event.target.value)}>
              <option value="">Select a state</option>
              {STATE_OPTIONS.map((state) => <option key={state} value={state}>{state}</option>)}
            </select>
            <button className="primary-button" disabled={submitting} onClick={handleContinue}>Continue</button>
          </div>
        )}

        {step.type === "name" && (
          <div className="stack">
            <div className="name-grid">
              <input className="text-input" placeholder="First name" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
              <input className="text-input" placeholder="Last name" value={lastName} onChange={(event) => setLastName(event.target.value)} />
            </div>
            <button className="primary-button" disabled={submitting} onClick={handleContinue}>Continue</button>
          </div>
        )}

        {step.type === "transfer_ready" && (
          <div className="stack">
            <button className="primary-button" disabled={submitting} onClick={handleContinue}>Connect me now</button>
          </div>
        )}

        {step.type === "connecting" && <div className="status-pill">Connecting your call…</div>}

        {(step.type === "connected" || step.type === "fallback" || step.type === "callback_confirmation") && (
          <div className="stack">
            <div className="answer-preview">Lead: {leadId ?? "pending"}\nStatus: {step.type}</div>
            <button className="primary-button" onClick={() => window.location.reload()}>Restart</button>
          </div>
        )}
      </div>

      <div className="widget-footer">
        {config.branding.privacyUrl ? <a href={config.branding.privacyUrl} target="_blank" rel="noreferrer">Privacy</a> : null}
        {config.branding.termsUrl ? <a href={config.branding.termsUrl} target="_blank" rel="noreferrer">Terms</a> : null}
      </div>
    </div>
  );
}
