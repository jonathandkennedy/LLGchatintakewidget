"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WidgetPublicConfig, WidgetStep } from "@/types/widget";
import { translations, getStepTitle, getStepDescription, getOptionLabel, getPlaceholder, type Lang } from "@/lib/widget/i18n";
import { saveSession, loadSession, clearSession } from "@/lib/widget/session-store";
import { fetchWithRetry } from "@/lib/utils/fetch-retry";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { trackWidgetOpen, trackIntakeStart, trackStepComplete, trackLeadCaptured, trackCallConnected } from "@/lib/integrations/analytics";

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
  stepKey?: string;
};

const STATE_OPTIONS = ["Arizona", "California", "Nevada", "Washington"];

function findLastIdx<T>(arr: T[], predicate: (item: T) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i])) return i;
  }
  return -1;
}

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
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [restored, setRestored] = useState(false);
  const [typing, setTyping] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") return window.matchMedia("(prefers-color-scheme: dark)").matches;
    return false;
  });
  const [stepHistory, setStepHistory] = useState<string[]>([]);
  const threadRef = useRef<HTMLDivElement>(null);

  const t = translations[lang];
  const widgetId = `runtime_${clientSlug}`;

  // Voice input
  const handleVoiceTranscript = useCallback((text: string) => {
    setInputValue((prev) => (prev + " " + text).trim());
  }, []);
  const speech = useSpeechToText(handleVoiceTranscript, lang === "es" ? "es-US" : "en-US");

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        window.parent?.postMessage?.("widget-close", "*");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    async function boot() {
      const response = await fetchWithRetry(`/api/widget/config?clientSlug=${encodeURIComponent(clientSlug)}`, { cache: "no-store" }, { maxRetries: 2, baseDelay: 500 });
      const nextConfig = await response.json();
      setConfig(nextConfig);

      // Try to restore saved session
      const saved = loadSession(`runtime_${clientSlug}`);
      if (saved && saved.currentKey !== "welcome" && saved.sessionId) {
        setCurrentKey(saved.currentKey);
        setAnswers(saved.answers);
        setMessages(saved.messages);
        setLang(saved.lang);
        setSessionId(saved.sessionId);
        setRestored(true);
      } else {
        setCurrentKey(nextConfig.flow.steps[0]?.key ?? "welcome");
        setRestored(true);
      }
      setLoading(false);
      trackWidgetOpen();
    }
    boot().catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to load widget");
      setLoading(false);
      setRestored(true);
    });
  }, [clientSlug]);

  const step = useMemo(() => config?.flow.steps.find((s) => s.key === currentKey), [config, currentKey]);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages, currentKey, typing]);

  // Auto-save on state changes
  useEffect(() => {
    if (!restored || loading) return;
    const terminalSteps = ["connected", "transfer_fallback", "callback_requested_confirmation"];
    if (terminalSteps.includes(currentKey)) {
      clearSession(widgetId);
      return;
    }
    saveSession(widgetId, { currentKey, answers, messages, lang, sessionId });
  }, [currentKey, answers, messages, lang, restored, loading, sessionId, widgetId]);

  useEffect(() => {
    if (!step || loading || !restored) return;
    const alreadyHasMsg = messages.some((m) => m.role === "bot" && m.stepKey === step.key);
    if (alreadyHasMsg) return;

    setTyping(true);
    const delay = step.key === "welcome" ? 600 : 800 + Math.random() * 400;
    const timer = setTimeout(() => {
      setTyping(false);
      const title = getStepTitle(lang, step.key) ?? step.title;
      const desc = getStepDescription(lang, step.key) ?? step.description;
      const welcomeText = step.type === "welcome" && config
        ? (getStepTitle(lang, "welcome") ?? config.branding.welcomeHeadline) + "\n" + (getStepDescription(lang, "welcome") ?? config.branding.welcomeBody ?? "")
        : title + (desc ? "\n" + desc : "");
      addBotMessage(welcomeText);
    }, delay);
    return () => { clearTimeout(timer); setTyping(false); };
  }, [currentKey, loading, lang, restored]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setInputValue("");
    setSelectedMulti([]);
    setSelectedDate("");
    setSelectedTime("");
    setError("");
  }, [currentKey]);

  function addBotMessage(text: string) {
    setMessages((prev) => [...prev, { id: `bot-${Date.now()}`, role: "bot", text, timestamp: t.timeAgo, stepKey: currentKey }]);
  }

  function addUserMessage(text: string, stepKey?: string) {
    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: "user", text, timestamp: t.timeAgo, stepKey: stepKey ?? currentKey }]);
  }

  async function handleUndo(msg: ChatMessage) {
    if (!msg.stepKey || !sessionId) return;
    const idx = messages.findIndex((m) => m.id === msg.id);
    if (idx < 0) return;

    setSubmitting(true);
    try {
      // Revert server-side answers from this step forward
      const response = await fetchWithRetry("/api/widget/session/revert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, toStepKey: msg.stepKey }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Failed to revert");

      // Revert local state: remove messages from this point forward
      setMessages((prev) => prev.slice(0, idx));

      // Remove local answers for reverted fields
      const revertedMessages = messages.slice(idx);
      const revertedBotSteps = revertedMessages.filter((m) => m.role === "bot").map((m) => m.stepKey).filter(Boolean);
      setAnswers((prev) => {
        const next = { ...prev };
        for (const stepKey of revertedBotSteps) {
          const flowStep = config?.flow.steps.find((s) => s.key === stepKey);
          if (flowStep?.fieldKey) delete next[flowStep.fieldKey];
        }
        return next;
      });

      setCurrentKey(msg.stepKey);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to undo");
    } finally {
      setSubmitting(false);
    }
  }

  async function ensureSession() {
    if (!config) throw new Error("Widget config missing");
    if (sessionId) return sessionId;
    const response = await fetchWithRetry("/api/widget/session/start", {
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
    const response = await fetchWithRetry("/api/widget/session/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: sid, stepKey, fieldKey, value }),
    });
    const json = (await response.json()) as StepResponse;
    if (!response.ok || json.ok === false) {
      throw new Error(json.fieldErrors?.[0]?.message ?? json.error ?? "Failed to save answer");
    }
    if (fieldKey) setAnswers((c) => ({ ...c, [fieldKey]: value }));
    if (config) {
      const stepIdx = config.flow.steps.findIndex((s) => s.key === stepKey);
      trackStepComplete(stepKey, stepIdx + 1);
    }
    return json;
  }

  async function handleBack() {
    if (stepHistory.length === 0 || typing || !sessionId || !config) return;
    const prevKey = stepHistory[stepHistory.length - 1];

    setSubmitting(true);
    try {
      // Revert server-side
      await fetchWithRetry("/api/widget/session/revert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, toStepKey: prevKey }),
      });

      // Remove current bot message and previous user answer from chat
      setMessages((prev) => {
        const filtered = [...prev];
        const botIdx = findLastIdx(filtered, (m) => m.role === "bot" && m.stepKey === currentKey);
        if (botIdx >= 0) filtered.splice(botIdx, 1);
        const userIdx = findLastIdx(filtered, (m) => m.role === "user" && m.stepKey === prevKey);
        if (userIdx >= 0) filtered.splice(userIdx, 1);
        return filtered;
      });

      // Remove answer for the previous step
      const prevStep = config.flow.steps.find((s) => s.key === prevKey);
      if (prevStep?.fieldKey) {
        setAnswers((prev) => { const next = { ...prev }; delete next[prevStep.fieldKey!]; return next; });
      }
      if (prevKey === "full_name") {
        setAnswers((prev) => { const next = { ...prev }; delete next.first_name; delete next.last_name; return next; });
      }

      setStepHistory((prev) => prev.slice(0, -1));
      setCurrentKey(prevKey);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to go back");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleOptionSelect(optionKey: string, label: string) {
    if (!step?.fieldKey) return;
    setSubmitting(true);
    setError("");
    addUserMessage(label);
    try {
      const json = await submitField(step.fieldKey, optionKey);
      if (json.nextStepKey) { setStepHistory((p) => [...p, currentKey]); setCurrentKey(json.nextStepKey); }
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
      if (json.nextStepKey) { setStepHistory((p) => [...p, currentKey]); setCurrentKey(json.nextStepKey); }
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
      setStepHistory((p) => [...p, currentKey]);
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
      if (json.nextStepKey) { setStepHistory((p) => [...p, currentKey]); setCurrentKey(json.nextStepKey); }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleWelcome() {
    setSubmitting(true);
    addUserMessage(t.startIntake);
    try {
      const sid = await ensureSession();
      setSessionId(sid);
      trackIntakeStart();
      setStepHistory((p) => [...p, currentKey]);
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
    addUserMessage(t.connectMeNow);
    try {
      const sid = await ensureSession();
      const completeRes = await fetchWithRetry("/api/widget/session/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid }),
      });
      const completeJson = (await completeRes.json()) as CompleteResponse;
      if (!completeRes.ok || !completeJson.ok) throw new Error("Failed to complete intake");
      setLeadId(completeJson.leadId);
      trackLeadCaptured(answers.matter_type as string | undefined);
      setStepHistory((p) => [...p, currentKey]);
      setCurrentKey("connecting");

      const connectRes = await fetchWithRetry("/api/widget/call/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid, leadId: completeJson.leadId }),
      });
      const connectJson = (await connectRes.json()) as ConnectResponse;
      if (!connectRes.ok) throw new Error(connectJson.reason ?? "Failed to connect call");
      if (connectJson.status === "initiated") trackCallConnected();
      setStepHistory((p) => [...p, currentKey]);
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
            <div className="loading-text">{t.loading}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!config || !step) return <div className="widget-card"><div className="chat-thread">{t.widgetUnavailable}</div></div>;

  const hasInput = inputValue.trim().length > 0;
  const hasName = firstName.trim().length > 0 && lastName.trim().length > 0;

  return (
    <div className={`widget-card widget-runtime ${darkMode ? "dark" : ""}`}>
      {/* Video/Image Header */}
      <div className="chat-video-header">
        {config.branding.welcomeVideoUrl ? (
          <video
            className="chat-header-video"
            src={config.branding.welcomeVideoUrl}
            autoPlay
            muted
            loop
            playsInline
          />
        ) : config.branding.avatarUrl ? (
          <div className="chat-video-placeholder">
            <img src={config.branding.avatarUrl} alt="" className="chat-video-avatar-lg" style={{ objectFit: "cover" }} />
          </div>
        ) : (
          <div className="chat-video-placeholder">
            <div className="chat-video-avatar-lg" />
          </div>
        )}
        {stepHistory.length > 0 && (
          <button className="chat-toolbar-btn chat-back-btn" title="Back" disabled={submitting} onClick={handleBack}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
        )}
        <div className="chat-toolbar-overlay">
          <button className="chat-toolbar-btn chat-lang-btn" onClick={() => setLang(lang === "en" ? "es" : "en")}>
            {lang === "en" ? t.espanol : t.english}
          </button>
          <button className="chat-toolbar-btn" title={darkMode ? "Light mode" : "Dark mode"} onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? "\u2600" : "\u263E"}
          </button>
          <button className="chat-toolbar-btn" title="Restart" onClick={() => { clearSession(widgetId); window.location.reload(); }}>&#8634;</button>
          <button className="chat-toolbar-btn" title="Close" onClick={() => window.parent?.postMessage?.("widget-close", "*")}>&times;</button>
        </div>
      </div>

      {/* Chat thread */}
      <div className="chat-thread" ref={threadRef}>
        {error && <div className="error-banner">{error}</div>}

        {messages.map((msg) => (
          <div key={msg.id} className={`chat-msg ${msg.role === "bot" ? "chat-msg-bot" : "chat-msg-user"}`}>
            {msg.role === "user" && msg.stepKey && (
              <div className="chat-user-actions">
                <button className="chat-action-btn" title="Undo" disabled={submitting} onClick={() => handleUndo(msg)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
                </button>
              </div>
            )}
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

        {/* Typing indicator */}
        {typing && (
          <div className="chat-msg chat-msg-bot">
            <div className="typing-indicator">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
            <div className="chat-avatar-row">
              <div className="chat-avatar" />
            </div>
          </div>
        )}

        {/* Privacy notice after welcome */}
        {messages.length === 1 && config.branding.privacyUrl && (
          <div className="chat-privacy">
            {t.privacyNotice}{" "}
            <a href={config.branding.privacyUrl} target="_blank" rel="noreferrer">{t.privacyPolicy}</a>
          </div>
        )}

        {/* Interactive options */}
        {step.type === "welcome" && (
          <div className="chat-msg chat-msg-bot" style={{ marginTop: 8 }}>
            <button className="chat-pill" disabled={submitting} onClick={handleWelcome}>{t.startIntake}</button>
          </div>
        )}

        {(step.type === "single_select" || step.type === "date_range") && (
          <div className="chat-msg chat-msg-bot" style={{ marginTop: 4 }}>
            <div className="chat-options">
              {step.options?.map((opt) => {
                const label = getOptionLabel(lang, opt.key) ?? opt.label;
                return (
                  <button key={opt.key} className="chat-pill" disabled={submitting} onClick={() => handleOptionSelect(opt.key, label)}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step.type === "multi_select" && (
          <div className="chat-msg chat-msg-bot" style={{ marginTop: 4 }}>
            <div className="chat-options">
              {step.options?.map((opt) => {
                const label = getOptionLabel(lang, opt.key) ?? opt.label;
                return (
                  <button
                    key={opt.key}
                    className={`chat-pill ${selectedMulti.includes(opt.key) ? "selected" : ""}`}
                    disabled={submitting}
                    onClick={() => setSelectedMulti((c) => c.includes(opt.key) ? c.filter((k) => k !== opt.key) : [...c, opt.key])}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {selectedMulti.length > 0 && (
              <button className="chat-pill selected" style={{ marginTop: 8 }} disabled={submitting} onClick={handleMultiSubmit}>{t.continue_}</button>
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

        {step.type === "appointment" && (() => {
          const today = new Date();
          const dates = Array.from({ length: 5 }, (_, i) => {
            const d = new Date(today);
            d.setDate(d.getDate() + i + 1);
            return { key: d.toISOString().slice(0, 10), label: d.toLocaleDateString(lang === "es" ? "es" : "en", { weekday: "short", month: "short", day: "numeric" }) };
          });
          const times = ["9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM"];
          return (
            <div className="chat-msg chat-msg-bot" style={{ marginTop: 4 }}>
              <div className="appointment-picker">
                <div className="appointment-date-row">
                  {dates.map((d) => (
                    <button key={d.key} className={`appointment-date-btn ${selectedDate === d.key ? "selected" : ""}`} disabled={submitting} onClick={() => setSelectedDate(d.key)}>{d.label}</button>
                  ))}
                </div>
                {selectedDate && (
                  <div className="appointment-time-grid">
                    {times.map((tm) => (
                      <button key={tm} className={`appointment-time-btn ${selectedTime === tm ? "selected" : ""}`} disabled={submitting} onClick={() => setSelectedTime(tm)}>{tm}</button>
                    ))}
                  </div>
                )}
                {selectedDate && selectedTime && (
                  <button className="chat-pill selected" disabled={submitting} onClick={async () => {
                    const val = `${selectedDate} ${selectedTime}`;
                    addUserMessage(val);
                    setSubmitting(true);
                    try {
                      const json = await submitField(String(step.fieldKey ?? "appointment"), val);
                      if (json.nextStepKey) { setStepHistory((p) => [...p, currentKey]); setCurrentKey(json.nextStepKey); }
                    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
                    finally { setSubmitting(false); }
                  }}>
                    {lang === "es" ? "Confirmar cita" : "Confirm appointment"}
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        {step.type === "file_upload" && (
          <div className="chat-msg chat-msg-bot" style={{ marginTop: 4 }}>
            <label className="file-upload-area">
              <input type="file" accept="image/*,.pdf" disabled={submitting} onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file || !sessionId) return;
                setSubmitting(true);
                addUserMessage(`Uploading: ${file.name}`);
                try {
                  const fd = new FormData();
                  fd.set("file", file);
                  fd.set("sessionId", sessionId);
                  fd.set("fieldKey", step.fieldKey ?? "file_upload");
                  const res = await fetchWithRetry("/api/widget/upload", { method: "POST", body: fd });
                  const json = await res.json();
                  if (!res.ok) throw new Error(json.error ?? "Upload failed");
                  setAnswers((c) => ({ ...c, [step.fieldKey ?? "file_upload"]: json.filename }));
                  const nextKey = step.next;
                  if (nextKey) { setStepHistory((p) => [...p, currentKey]); setCurrentKey(nextKey); }
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Upload failed");
                } finally {
                  setSubmitting(false);
                }
              }} style={{ display: "none" }} />
              <div className="file-upload-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </div>
              <div className="file-upload-text"><strong>Tap to upload</strong> a photo or document</div>
              <div className="file-upload-hint">JPEG, PNG, WebP, HEIC, PDF up to 10MB</div>
            </label>
            <button className="chat-pill" style={{ marginTop: 8 }} disabled={submitting} onClick={async () => {
              addUserMessage("Skipped upload");
              if (step.next) { setStepHistory((p) => [...p, currentKey]); setCurrentKey(step.next); }
            }}>Skip</button>
          </div>
        )}

        {step.type === "transfer_ready" && (
          <div className="chat-msg chat-msg-bot" style={{ marginTop: 4 }}>
            <div className="chat-options">
              <button className="chat-pill" disabled={submitting} onClick={handleTransfer}>{t.connectMeNow}</button>
            </div>
          </div>
        )}

        {step.type === "connecting" && (
          <div className="chat-msg chat-msg-bot" style={{ marginTop: 8 }}>
            {(config.branding.connectingVideoUrl || config.branding.welcomeVideoUrl) && (
              <div className="chat-inline-video">
                <video
                  src={config.branding.connectingVideoUrl || config.branding.welcomeVideoUrl}
                  autoPlay
                  playsInline
                  className="chat-inline-video-el"
                />
              </div>
            )}
            <div className="chat-bubble chat-bubble-bot" style={{ marginTop: 8, fontWeight: 500 }}>
              {t.connectingVideoMsg}
            </div>
            <div className="status-pill" style={{ marginTop: 8 }}>{t.connecting}</div>
          </div>
        )}

        {(step.type === "connected" || step.type === "fallback" || step.type === "callback_confirmation") && (
          <div className="chat-msg chat-msg-bot" style={{ marginTop: 8 }}>
            <div className="answer-preview">Lead: {leadId ?? "pending"}{"\n"}Status: {step.type}</div>
            <button className="chat-pill" style={{ marginTop: 8 }} onClick={() => { clearSession(widgetId); window.location.reload(); }}>{t.restart}</button>
          </div>
        )}
      </div>

      {/* Input bar */}
      {step.type === "name" && (
        <div className="chat-input-bar">
          <div className="chat-name-row">
            <input className="chat-name-input" placeholder={t.firstName} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <input className="chat-name-input" placeholder={t.lastName} value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <div style={{ marginTop: 8, display: "flex", justifyContent: "center" }}>
            <button className={`chat-submit-btn ${hasName ? "active" : ""}`} disabled={!hasName || submitting} onClick={handleNameSubmit}>&#10003;</button>
          </div>
        </div>
      )}

      {(step.type === "short_text" || step.type === "phone" || step.type === "email") && (
        <div className="chat-input-bar">
          <div className="chat-input-underline">
            {speech.listening && speech.interim && <div className="voice-interim">{speech.interim}</div>}
            <input
              className="chat-input-field"
              type={step.type === "email" ? "email" : step.type === "phone" ? "tel" : "text"}
              placeholder={getPlaceholder(lang, step.key) ?? step.placeholder ?? t.typeHere}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTextSubmit()}
            />
          </div>
          <div className="chat-input-toolbar">
            <div className="chat-input-modes">
              <button className="chat-mode-btn active" title="Text">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>
              </button>
              {speech.supported && (
                <button className={`chat-mode-btn ${speech.listening ? "recording" : ""}`} onClick={speech.toggle} title="Voice">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                </button>
              )}
            </div>
            <button className={`chat-send-btn ${hasInput ? "active" : ""}`} disabled={!hasInput || submitting} onClick={handleTextSubmit}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>
      )}

      {(step.type === "long_text" || step.type === "textarea_optional") && (
        <div className="chat-input-bar">
          <div className="chat-input-underline">
            {speech.listening && speech.interim && <div className="voice-interim">{speech.interim}</div>}
            <textarea
              className="chat-input-field"
              placeholder={getPlaceholder(lang, step.key) ?? step.placeholder ?? t.typeHere}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              rows={2}
            />
          </div>
          <div className="chat-input-toolbar">
            <div className="chat-input-modes">
              <button className="chat-mode-btn active" title="Text">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>
              </button>
              {speech.supported && (
                <button className={`chat-mode-btn ${speech.listening ? "recording" : ""}`} onClick={speech.toggle} title="Voice">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                </button>
              )}
            </div>
            <button className={`chat-send-btn ${hasInput ? "active" : ""}`} disabled={(!hasInput && step.type !== "textarea_optional") || submitting} onClick={handleTextSubmit}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="widget-footer">
        {config.branding.privacyUrl ? <a href={config.branding.privacyUrl} target="_blank" rel="noreferrer">{t.privacy}</a> : null}
        {config.branding.termsUrl ? <a href={config.branding.termsUrl} target="_blank" rel="noreferrer">{t.terms}</a> : null}
        <span style={{ marginLeft: "auto" }}>{t.poweredBy} <strong>IntakeLLG</strong></span>
      </div>
    </div>
  );
}
