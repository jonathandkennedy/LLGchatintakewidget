"use client";

import { useEffect, useMemo, useState } from "react";
import { US_STATES } from "@/lib/constants/us-states";

type WidgetBranding = {
  logoUrl?: string;
  avatarUrl?: string;
  primaryColor: string;
  accentColor?: string;
  widgetTitle: string;
  welcomeHeadline: string;
  welcomeBody: string;
  privacyUrl?: string;
  termsUrl?: string;
};

type StepOption = { key: string; label: string };

type BranchCondition = {
  fieldKey: string;
  operator: string;
  value?: string | string[] | boolean;
};

type BranchRule = {
  conditions: BranchCondition[];
  nextStepKey: string;
  priority?: number;
};

type WidgetStep = {
  key: string;
  type: string;
  title: string;
  description?: string;
  fieldKey?: string;
  required?: boolean;
  placeholder?: string;
  helperText?: string;
  options?: StepOption[];
  next?: string;
  branches?: BranchRule[];
};

type WidgetFlow = {
  id: string;
  version: number;
  name: string;
  steps: WidgetStep[];
};

type WidgetPublicConfig = {
  clientId: string;
  clientName: string;
  branding: WidgetBranding;
  flow: WidgetFlow;
  features: {
    callNowEnabled: boolean;
    smsFallbackEnabled: boolean;
    resumeEnabled: boolean;
  };
};

type Props = {
  clientSlug: string;
};

type StepResponse = {
  ok?: boolean;
  nextStepKey?: string | null;
  error?: string;
  fieldErrors?: Array<{ fieldKey: string; message: string }>;
};

type CompleteResponse = {
  ok: boolean;
  leadId: string;
  status: string;
};

type ConnectResponse = {
  ok: boolean;
  status: string;
  reason?: string;
};

export function WidgetRuntime(props: Props) {
  const clientSlug = props.clientSlug;
  const [config, setConfig] = useState(null as WidgetPublicConfig | null);
  const [currentKey, setCurrentKey] = useState("welcome");
  const [sessionId, setSessionId] = useState(null as string | null);
  const [leadId, setLeadId] = useState(null as string | null);
  const [answers, setAnswers] = useState({} as Record<string, unknown>);
  const [inputValue, setInputValue] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [selectedMulti, setSelectedMulti] = useState([] as string[]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(function bootWidget() {
    fetch("/api/widget/config?clientSlug=" + encodeURIComponent(clientSlug), { cache: "no-store" })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var c = data as WidgetPublicConfig;
        setConfig(c);
        if (c.flow && c.flow.steps && c.flow.steps[0]) {
          setCurrentKey(c.flow.steps[0].key);
        }
        setLoading(false);
      })
      .catch(function (err) {
        setError(err instanceof Error ? err.message : "Failed to load widget");
        setLoading(false);
      });
  }, [clientSlug]);

  var step = useMemo(function () {
    if (!config) return null;
    return config.flow.steps.find(function (s) { return s.key === currentKey; }) || null;
  }, [config, currentKey]);

  useEffect(function resetOnStepChange() {
    setInputValue("");
    setSelectedMulti([]);
    setError("");
  }, [currentKey]);

  function ensureSession(): Promise<string> {
    if (sessionId) return Promise.resolve(sessionId);
    if (!config) return Promise.reject(new Error("No config"));

    return fetch("/api/widget/session/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: config.clientId,
        flowId: config.flow.id,
        landingPageUrl: typeof window !== "undefined" ? window.location.href : undefined,
        referrerUrl: typeof document !== "undefined" ? document.referrer : undefined,
        deviceType: typeof window !== "undefined" && window.innerWidth < 768 ? "mobile" : "desktop",
      }),
    })
      .then(function (res) { return res.json(); })
      .then(function (json) {
        if (json.error) throw new Error(json.error);
        setSessionId(json.sessionId);
        return json.sessionId as string;
      });
  }

  function submitField(fieldKey: string, value: unknown, stepKey?: string): Promise<StepResponse> {
    return ensureSession().then(function (sid) {
      return fetch("/api/widget/session/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sid,
          stepKey: stepKey || currentKey,
          fieldKey: fieldKey,
          value: value,
        }),
      });
    })
      .then(function (res) { return res.json(); })
      .then(function (json: StepResponse) {
        if (json.ok === false) {
          var msg = (json.fieldErrors && json.fieldErrors[0]) ? json.fieldErrors[0].message : (json.error || "Validation failed");
          throw new Error(msg);
        }
        if (fieldKey) {
          setAnswers(function (prev) {
            var next = Object.assign({}, prev);
            next[fieldKey] = value;
            return next;
          });
        }
        return json;
      });
  }

  function handleOptionSelect(optionKey: string) {
    if (!step || !step.fieldKey) return;
    setSubmitting(true);
    setError("");
    submitField(step.fieldKey, optionKey)
      .then(function (json) {
        if (json.nextStepKey) setCurrentKey(json.nextStepKey);
      })
      .catch(function (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      })
      .finally(function () { setSubmitting(false); });
  }

  function handleContinue() {
    if (!step) return;
    setSubmitting(true);
    setError("");

    var promise = Promise.resolve();

    if (step.type === "welcome") {
      promise = ensureSession().then(function (sid) {
        setSessionId(sid);
        setCurrentKey(step.next || "matter_type");
      });
    } else if (step.type === "single_select" || step.type === "date_range") {
      // handled by handleOptionSelect
      setSubmitting(false);
      return;
    } else if (step.type === "long_text" || step.type === "short_text" || step.type === "phone" || step.type === "email" || step.type === "textarea_optional" || step.type === "dropdown") {
      promise = submitField(String(step.fieldKey || ""), inputValue).then(function (json) {
        if (json.nextStepKey) setCurrentKey(json.nextStepKey);
      });
    } else if (step.type === "multi_select") {
      promise = submitField(String(step.fieldKey || ""), selectedMulti).then(function (json) {
        if (json.nextStepKey) setCurrentKey(json.nextStepKey);
      });
    } else if (step.type === "name") {
      promise = ensureSession().then(function (sid) {
        return Promise.all([
          submitField("first_name", firstName, step.key),
          submitField("last_name", lastName, step.key),
        ]).then(function () {
          setSessionId(sid);
          setCurrentKey(step.next || "phone");
        });
      });
    } else if (step.type === "transfer_ready") {
      promise = ensureSession().then(function (sid) {
        return fetch("/api/widget/session/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sid }),
        });
      })
        .then(function (res) { return res.json(); })
        .then(function (cJson: CompleteResponse) {
          if (!cJson.ok) throw new Error("Failed to complete intake");
          setLeadId(cJson.leadId);
          setCurrentKey("connecting");
          return fetch("/api/widget/call/connect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: sessionId, leadId: cJson.leadId }),
          });
        })
        .then(function (res) { return res.json(); })
        .then(function (connJson: ConnectResponse) {
          if (connJson.status === "initiated") {
            setCurrentKey("connected");
          } else {
            setCurrentKey("transfer_fallback");
          }
        });
    }

    promise
      .catch(function (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      })
      .finally(function () { setSubmitting(false); });
  }

  function toggleMulti(key: string) {
    setSelectedMulti(function (prev) {
      if (prev.indexOf(key) >= 0) {
        return prev.filter(function (k) { return k !== key; });
      }
      return prev.concat([key]);
    });
  }

  if (loading) {
    return (
      <div className="widget-card">
        <div className="widget-body">Loading widget...</div>
      </div>
    );
  }

  if (!config || !step) {
    return (
      <div className="widget-card">
        <div className="widget-body">Widget unavailable.</div>
      </div>
    );
  }

  var headlineText = step.type === "welcome" ? config.branding.welcomeHeadline : step.title;
  var bodyText = step.type === "welcome" ? config.branding.welcomeBody : (step.description || step.helperText || "");

  return (
    <div className="widget-card widget-runtime">
      <div className="widget-header">
        <div className="eyebrow">{config.branding.widgetTitle}</div>
        <h2>{headlineText}</h2>
        <p>{bodyText}</p>
      </div>

      <div className="widget-body">
        {error && <div className="error-banner">{error}</div>}

        {step.type === "welcome" && (
          <div className="stack">
            <ul className="bullet-list">
              <li>Free case review</li>
              <li>Takes about 1 minute</li>
              <li>Private and no obligation</li>
            </ul>
            <button className="primary-button" disabled={submitting} onClick={handleContinue}>
              Start intake
            </button>
          </div>
        )}

        {(step.type === "single_select" || step.type === "date_range") && (
          <div className="stack">
            {(step.options || []).map(function (option) {
              return (
                <button key={option.key} className="option-card" disabled={submitting} onClick={function () { handleOptionSelect(option.key); }}>
                  {option.label}
                </button>
              );
            })}
          </div>
        )}

        {step.type === "multi_select" && (
          <div className="stack">
            {(step.options || []).map(function (option) {
              var isSelected = selectedMulti.indexOf(option.key) >= 0;
              return (
                <button
                  key={option.key}
                  className={"option-card" + (isSelected ? " selected" : "")}
                  disabled={submitting}
                  onClick={function () { toggleMulti(option.key); }}
                >
                  {option.label}
                </button>
              );
            })}
            <button className="primary-button" disabled={submitting} onClick={handleContinue}>Continue</button>
          </div>
        )}

        {(step.type === "long_text" || step.type === "textarea_optional") && (
          <div className="stack">
            <textarea
              className="text-input text-area"
              value={inputValue}
              placeholder={step.placeholder}
              onChange={function (e) { setInputValue(e.target.value); }}
            />
            <button className="primary-button" disabled={submitting} onClick={handleContinue}>Continue</button>
          </div>
        )}

        {(step.type === "short_text" || step.type === "phone" || step.type === "email") && (
          <div className="stack">
            <input
              className="text-input"
              type={step.type === "email" ? "email" : step.type === "phone" ? "tel" : "text"}
              value={inputValue}
              placeholder={step.placeholder || (step.type === "phone" ? "(555) 555-5555" : "Type here")}
              onChange={function (e) { setInputValue(e.target.value); }}
            />
            <button className="primary-button" disabled={submitting} onClick={handleContinue}>Continue</button>
          </div>
        )}

        {step.type === "dropdown" && (
          <div className="stack">
            <select className="text-input" value={inputValue} onChange={function (e) { setInputValue(e.target.value); }}>
              <option value="">Select a state</option>
              {US_STATES.map(function (state) {
                return <option key={state.value} value={state.label}>{state.label}</option>;
              })}
            </select>
            <button className="primary-button" disabled={submitting} onClick={handleContinue}>Continue</button>
          </div>
        )}

        {step.type === "name" && (
          <div className="stack">
            <div className="name-grid">
              <input className="text-input" placeholder="First name" value={firstName} onChange={function (e) { setFirstName(e.target.value); }} />
              <input className="text-input" placeholder="Last name" value={lastName} onChange={function (e) { setLastName(e.target.value); }} />
            </div>
            <button className="primary-button" disabled={submitting} onClick={handleContinue}>Continue</button>
          </div>
        )}

        {step.type === "transfer_ready" && (
          <div className="stack">
            <button className="primary-button" disabled={submitting} onClick={handleContinue}>Connect me now</button>
          </div>
        )}

        {step.type === "connecting" && (
          <div className="status-pill connecting">Connecting your call...</div>
        )}

        {(step.type === "connected" || step.type === "fallback" || step.type === "callback_confirmation") && (
          <div className="stack">
            <div className="answer-preview">{"Lead: " + (leadId || "pending") + "\nStatus: " + step.type}</div>
            <button className="primary-button" onClick={function () { window.location.reload(); }}>Restart</button>
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
