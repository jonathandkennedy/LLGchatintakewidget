"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { DEFAULT_FLOW } from "@/lib/widget/default-flow";
import { translations, getStepTitle, getStepDescription, getOptionLabel, getPlaceholder, type Lang } from "@/lib/widget/i18n";
import { saveSession, loadSession, clearSession } from "@/lib/widget/session-store";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import type { WidgetStep } from "@/types/widget";

const STATE_OPTIONS = ["Arizona", "California", "Nevada", "Washington"];

function findLastIdx<T>(arr: T[], predicate: (item: T) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i])) return i;
  }
  return -1;
}

// Configure media URLs here
const WELCOME_VIDEO_URL = ""; // e.g. "/intakeapp/videos/welcome.mp4"
const CONNECTING_VIDEO_URL = ""; // e.g. "/intakeapp/videos/connecting.mp4"
const HEADER_IMAGE_URL = "/intakeapp/images/lawyer-logo.webp";
const AVATAR_IMAGE_URL = "/intakeapp/images/lawyer-logo.webp";

type ChatMessage = {
  id: string;
  role: "bot" | "user";
  text: string;
  timestamp: string;
  stepKey?: string;
};

function getNextStepKey(step: WidgetStep, answers: Record<string, unknown>): string | null {
  if (step.branches?.length) {
    for (const branch of [...step.branches].sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100))) {
      const matches = branch.conditions.every((condition) => {
        const currentValue = answers[condition.fieldKey];
        switch (condition.operator) {
          case "eq": return currentValue === condition.value;
          case "in": return Array.isArray(condition.value) && condition.value.includes(String(currentValue));
          case "is_truthy": return Boolean(currentValue);
          case "is_falsy": return !currentValue;
          default: return false;
        }
      });
      if (matches) return branch.nextStepKey;
    }
  }
  return step.next ?? null;
}

function timeAgo() { return "a few seconds ago"; }

/* SVG Icons */
function SendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

const DEMO_WIDGET_ID = "demo";

export function WidgetDemo() {
  const [currentKey, setCurrentKey] = useState<string>(DEFAULT_FLOW.steps[0]?.key ?? "welcome");
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [selectedMulti, setSelectedMulti] = useState<string[]>([]);
  const [inputMode, setInputMode] = useState<"text" | "voice" | "video">("text");
  const [lang, setLang] = useState<Lang>("en");
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") return window.matchMedia("(prefers-color-scheme: dark)").matches;
    return false;
  });
  const [restored, setRestored] = useState(false);
  const [typing, setTyping] = useState(false);
  const [stepHistory, setStepHistory] = useState<string[]>([]);
  const threadRef = useRef<HTMLDivElement>(null);

  const t = translations[lang];
  const step = useMemo(() => DEFAULT_FLOW.steps.find((item) => item.key === currentKey), [currentKey]);

  // Voice input
  const handleVoiceTranscript = useCallback((text: string) => {
    setInputValue((prev) => (prev + " " + text).trim());
    setInputMode("text");
  }, []);
  const speech = useSpeechToText(handleVoiceTranscript, lang === "es" ? "es-US" : "en-US");

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        // Close widget (postMessage to parent in iframe context)
        window.parent?.postMessage?.("widget-close", "*");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Restore saved session on mount
  useEffect(() => {
    const saved = loadSession(DEMO_WIDGET_ID);
    if (saved && saved.currentKey !== "welcome") {
      setCurrentKey(saved.currentKey);
      setAnswers(saved.answers);
      setMessages(saved.messages);
      setLang(saved.lang);
      setRestored(true);
    } else {
      setRestored(true);
    }
  }, []);

  // Auto-save on every state change (debounced by React batching)
  useEffect(() => {
    if (!restored) return;
    // Don't save terminal states
    const terminalSteps = ["connected", "transfer_fallback", "callback_requested_confirmation"];
    if (terminalSteps.includes(currentKey)) {
      clearSession(DEMO_WIDGET_ID);
      return;
    }
    saveSession(DEMO_WIDGET_ID, { currentKey, answers, messages, lang });
  }, [currentKey, answers, messages, lang, restored]);

  const scrollToBottom = useCallback(() => {
    if (threadRef.current) {
      setTimeout(() => {
        threadRef.current!.scrollTop = threadRef.current!.scrollHeight;
      }, 50);
    }
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, currentKey, typing, scrollToBottom]);

  // Add bot message when step changes - show typing first, then message
  useEffect(() => {
    if (!step || !restored) return;
    const alreadyHasMsg = messages.some((m) => m.role === "bot" && m.stepKey === step.key);
    if (alreadyHasMsg) return;

    // Show typing indicator, then add message after delay
    setTyping(true);
    const delay = step.key === "welcome" ? 600 : 800 + Math.random() * 400;
    const timer = setTimeout(() => {
      setTyping(false);
      const title = getStepTitle(lang, step.key) ?? step.title;
      const desc = getStepDescription(lang, step.key) ?? step.description;
      const text = title + (desc ? "\n" + desc : "");
      setMessages((prev) => [...prev, { id: `bot-${Date.now()}`, role: "bot", text, timestamp: t.timeAgo, stepKey: step.key }]);
    }, delay);
    return () => { clearTimeout(timer); setTyping(false); };
  }, [currentKey, lang, restored]); // eslint-disable-line react-hooks/exhaustive-deps

  function addUserMessage(text: string, stepKey?: string) {
    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: "user", text, timestamp: t.timeAgo, stepKey }]);
  }

  function handleUndo(msg: ChatMessage) {
    if (!msg.stepKey) return;
    const idx = messages.findIndex((m) => m.id === msg.id);
    if (idx < 0) return;

    // Collect all bot steps that will be reverted
    const revertedMessages = messages.slice(idx);
    const revertedBotSteps = revertedMessages.filter((m) => m.role === "bot").map((m) => m.stepKey).filter(Boolean);

    // Remove messages from this point forward
    setMessages((prev) => prev.slice(0, idx));

    // Remove answers for all reverted steps
    setAnswers((prev) => {
      const next = { ...prev };
      for (const stepKey of revertedBotSteps) {
        const flowStep = DEFAULT_FLOW.steps.find((s) => s.key === stepKey);
        if (flowStep?.fieldKey) delete next[flowStep.fieldKey];
      }
      // Also handle name step special fields
      if (revertedBotSteps.includes("full_name")) {
        delete next.first_name;
        delete next.last_name;
      }
      return next;
    });

    setCurrentKey(msg.stepKey);
  }

  const goNext = (value?: unknown, displayText?: string) => {
    if (displayText && step) addUserMessage(displayText, step.key);

    const nextAnswers = { ...answers };
    if (step?.fieldKey && value !== undefined) {
      nextAnswers[step.fieldKey] = value;
      setAnswers(nextAnswers);
    }
    if (step?.key === "full_name") {
      nextAnswers.first_name = firstName;
      nextAnswers.last_name = lastName;
      setAnswers(nextAnswers);
    }

    setInputValue("");
    setSelectedMulti([]);
    setFirstName("");
    setLastName("");
    const nextKey = step ? getNextStepKey(step, nextAnswers) : null;
    if (nextKey) {
      setStepHistory((prev) => [...prev, currentKey]);
      setCurrentKey(nextKey);
    }
  };

  function handleBack() {
    if (stepHistory.length === 0 || typing) return;
    const prevKey = stepHistory[stepHistory.length - 1];

    // Remove the last user message and the current bot message
    setMessages((prev) => {
      const filtered = [...prev];
      // Remove current step's bot message
      const botIdx = findLastIdx(filtered, (m) => m.role === "bot" && m.stepKey === currentKey);
      if (botIdx >= 0) filtered.splice(botIdx, 1);
      // Remove the user answer that led to this step
      const userIdx = findLastIdx(filtered, (m) => m.role === "user" && m.stepKey === prevKey);
      if (userIdx >= 0) filtered.splice(userIdx, 1);
      return filtered;
    });

    // Remove answer for the previous step
    const prevStep = DEFAULT_FLOW.steps.find((s) => s.key === prevKey);
    if (prevStep?.fieldKey) {
      setAnswers((prev) => {
        const next = { ...prev };
        delete next[prevStep.fieldKey!];
        return next;
      });
    }
    if (prevKey === "full_name") {
      setAnswers((prev) => {
        const next = { ...prev };
        delete next.first_name;
        delete next.last_name;
        return next;
      });
    }

    setStepHistory((prev) => prev.slice(0, -1));
    setCurrentKey(prevKey);
  }

  if (!step) {
    return <div className="widget-card"><div className="chat-thread">Flow error: missing step.</div></div>;
  }

  const handleTextSubmit = () => {
    if (!inputValue.trim()) return;
    goNext(inputValue, inputValue);
  };

  const handleNameSubmit = () => {
    if (!firstName.trim() || !lastName.trim()) return;
    addUserMessage(`${firstName} ${lastName}`, step?.key);
    const nextAnswers = { ...answers, first_name: firstName, last_name: lastName };
    setAnswers(nextAnswers);
    setFirstName("");
    setLastName("");
    const nextKey = step ? getNextStepKey(step, nextAnswers) : null;
    if (nextKey) {
      setStepHistory((prev) => [...prev, currentKey]);
      setCurrentKey(nextKey);
    }
  };

  const hasInput = inputValue.trim().length > 0;
  const hasName = firstName.trim().length > 0 && lastName.trim().length > 0;

  const showTextInput = step.type === "short_text" || step.type === "phone" || step.type === "email";
  const showTextarea = step.type === "long_text" || step.type === "textarea_optional";

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Demo mode: just show the file name as the answer
    goNext(file.name, `Uploaded: ${file.name}`);
  };
  const showInputBar = showTextInput || showTextarea || step.type === "name";

  return (
    <div className={`widget-card ${darkMode ? "dark" : ""}`}>
      {/* Video/Image Header */}
      <div className="chat-video-header">
        {WELCOME_VIDEO_URL ? (
          <video
            className="chat-header-video"
            src={WELCOME_VIDEO_URL}
            autoPlay
            muted
            loop
            playsInline
          />
        ) : HEADER_IMAGE_URL ? (
          <img src={HEADER_IMAGE_URL} alt="" className="chat-header-image" />
        ) : (
          <div className="chat-video-placeholder">
            <div className="chat-video-avatar-lg" />
          </div>
        )}
        {stepHistory.length > 0 && (
          <button className="chat-toolbar-btn chat-back-btn" title="Back" onClick={handleBack}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
        )}
        <div className="chat-toolbar-overlay">
          <button
            className="chat-toolbar-btn chat-lang-btn"
            onClick={() => setLang(lang === "en" ? "es" : "en")}
          >
            {lang === "en" ? t.espanol : t.english}
          </button>
          <button className="chat-toolbar-btn" title={darkMode ? "Light mode" : "Dark mode"} onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? "\u2600" : "\u263E"}
          </button>
          <button className="chat-toolbar-btn" title="Restart" onClick={() => { clearSession(DEMO_WIDGET_ID); window.location.reload(); }}>&#8634;</button>
          <button className="chat-toolbar-btn" title="Close">&times;</button>
        </div>
      </div>

      {/* Chat thread */}
      <div className="chat-thread" ref={threadRef}>
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-msg ${msg.role === "bot" ? "chat-msg-bot" : "chat-msg-user"}`}>
            {msg.role === "user" && (
              <div className="chat-user-actions">
                <button className="chat-action-btn" title="Undo" onClick={() => handleUndo(msg)}><UndoIcon /></button>
                <button className="chat-action-btn" title="Edit"><EditIcon /></button>
              </div>
            )}
            <div className={`chat-bubble ${msg.role === "bot" ? "chat-bubble-bot" : "chat-bubble-user"}`}>
              {msg.text}
            </div>
            {msg.role === "bot" ? (
              <div className="chat-avatar-row">
                {AVATAR_IMAGE_URL ? <img src={AVATAR_IMAGE_URL} alt="" className="chat-avatar" /> : <div className="chat-avatar" />}
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
              {AVATAR_IMAGE_URL ? <img src={AVATAR_IMAGE_URL} alt="" className="chat-avatar" /> : <div className="chat-avatar" />}
            </div>
          </div>
        )}

        {/* Privacy notice after first answer */}
        {messages.filter((m) => m.role === "user").length === 1 && (
          <div className="chat-privacy">
            {t.privacyNotice}{" "}
            <a href="#" onClick={(e) => e.preventDefault()}>{t.privacyPolicy}</a>
          </div>
        )}

        {/* Interactive options */}
        {step.type === "welcome" && (
          <div className="chat-msg chat-msg-bot" style={{ marginTop: 8 }}>
            <button className="chat-pill" onClick={() => goNext(undefined, t.startIntake)}>{t.startIntake}</button>
          </div>
        )}

        {(step.type === "single_select" || step.type === "date_range") && (
          <div className="chat-msg chat-msg-bot" style={{ marginTop: 4 }}>
            <div className="chat-options">
              {step.options?.map((opt) => {
                const label = getOptionLabel(lang, opt.key) ?? opt.label;
                return <button key={opt.key} className="chat-pill" onClick={() => goNext(opt.key, label)}>{label}</button>;
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
                    onClick={() => setSelectedMulti((c) => c.includes(opt.key) ? c.filter((k) => k !== opt.key) : [...c, opt.key])}
                  >{label}</button>
                );
              })}
            </div>
            {selectedMulti.length > 0 && (
              <button className="chat-pill selected" style={{ marginTop: 8 }} onClick={() => goNext(selectedMulti, selectedMulti.join(", "))}>{t.continue_}</button>
            )}
          </div>
        )}

        {step.type === "dropdown" && (
          <div className="chat-msg chat-msg-bot" style={{ marginTop: 4 }}>
            <div className="chat-options">
              {STATE_OPTIONS.map((st) => (
                <button key={st} className="chat-pill" onClick={() => goNext(st, st)}>{st}</button>
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
                    <button key={d.key} className={`appointment-date-btn ${selectedDate === d.key ? "selected" : ""}`} onClick={() => setSelectedDate(d.key)}>{d.label}</button>
                  ))}
                </div>
                {selectedDate && (
                  <div className="appointment-time-grid">
                    {times.map((t) => (
                      <button key={t} className={`appointment-time-btn ${selectedTime === t ? "selected" : ""}`} onClick={() => setSelectedTime(t)}>{t}</button>
                    ))}
                  </div>
                )}
                {selectedDate && selectedTime && (
                  <button className="chat-pill selected" onClick={() => { goNext(`${selectedDate} ${selectedTime}`, `${selectedDate} at ${selectedTime}`); setSelectedDate(""); setSelectedTime(""); }}>
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
              <input type="file" accept="image/*,.pdf" onChange={handleFileSelect} style={{ display: "none" }} />
              <div className="file-upload-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </div>
              <div className="file-upload-text"><strong>Tap to upload</strong> a photo or document</div>
              <div className="file-upload-hint">JPEG, PNG, WebP, HEIC, PDF up to 10MB</div>
            </label>
            <button className="chat-pill" style={{ marginTop: 8 }} onClick={() => goNext("skipped", "Skipped upload")}>Skip</button>
          </div>
        )}

        {step.type === "transfer_ready" && (
          <div className="chat-msg chat-msg-bot" style={{ marginTop: 4 }}>
            <div className="chat-options">
              <button className="chat-pill" onClick={() => { addUserMessage(t.connectMeNow, step.key); setStepHistory((p) => [...p, currentKey]); setCurrentKey("connecting"); }}>{t.connectMeNow}</button>
              <button className="chat-pill" onClick={() => { addUserMessage(t.preferCallback, step.key); setStepHistory((p) => [...p, currentKey]); setCurrentKey("callback_requested_confirmation"); }}>{t.preferCallback}</button>
            </div>
          </div>
        )}

        {step.type === "connecting" && (
          <div className="chat-msg chat-msg-bot" style={{ marginTop: 8 }}>
            {CONNECTING_VIDEO_URL && (
              <div className="chat-inline-video">
                <video
                  src={CONNECTING_VIDEO_URL}
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
            <div className="chat-options" style={{ marginTop: 8 }}>
              <button className="chat-pill" onClick={() => setCurrentKey("connected")}>{t.simulateConnected}</button>
              <button className="chat-pill" onClick={() => setCurrentKey("transfer_fallback")}>{t.simulateFallback}</button>
            </div>
          </div>
        )}

        {(step.type === "connected" || step.type === "fallback" || step.type === "callback_confirmation") && (
          <div className="chat-msg chat-msg-bot" style={{ marginTop: 8 }}>
            <pre className="answer-preview">{JSON.stringify(answers, null, 2)}</pre>
            <button className="chat-pill" style={{ marginTop: 8 }} onClick={() => { clearSession(DEMO_WIDGET_ID); window.location.reload(); }}>{t.restartDemo}</button>
          </div>
        )}
      </div>

      {/* Input bar */}
      {step.type === "name" && (
        <div className="chat-input-bar">
          <div className="chat-name-row">
            <input className="chat-name-input" placeholder={t.firstName} value={firstName} onChange={(e) => setFirstName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()} />
            <input className="chat-name-input" placeholder={t.lastName} value={lastName} onChange={(e) => setLastName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()} />
          </div>
          <button className={`chat-submit-bar-btn ${hasName ? "active" : ""}`} disabled={!hasName} onClick={handleNameSubmit}>
            <CheckIcon />
          </button>
        </div>
      )}

      {showTextInput && (
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
          {/* Input mode toolbar */}
          <div className="chat-input-toolbar">
            <div className="chat-input-modes">
              <button className={`chat-mode-btn ${inputMode === "text" ? "active" : ""}`} onClick={() => { setInputMode("text"); speech.stop(); }} title="Text">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>
              </button>
              <button className={`chat-mode-btn ${inputMode === "voice" ? "active" : ""} ${speech.listening ? "recording" : ""}`} onClick={() => { setInputMode("voice"); speech.toggle(); }} title="Voice">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              </button>
              <button className={`chat-mode-btn ${inputMode === "video" ? "active" : ""}`} onClick={() => setInputMode("video")} title="Video">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
              </button>
            </div>
            <button className={`chat-send-btn ${hasInput ? "active" : ""}`} disabled={!hasInput} onClick={handleTextSubmit}>
              <SendIcon />
            </button>
          </div>
        </div>
      )}

      {showTextarea && (
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
              <button className={`chat-mode-btn ${inputMode === "text" ? "active" : ""}`} onClick={() => { setInputMode("text"); speech.stop(); }} title="Text">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>
              </button>
              <button className={`chat-mode-btn ${inputMode === "voice" ? "active" : ""} ${speech.listening ? "recording" : ""}`} onClick={() => { setInputMode("voice"); speech.toggle(); }} title="Voice">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              </button>
              <button className={`chat-mode-btn ${inputMode === "video" ? "active" : ""}`} onClick={() => setInputMode("video")} title="Video">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
              </button>
            </div>
            <button className={`chat-send-btn ${hasInput ? "active" : ""}`} disabled={!hasInput && step.type !== "textarea_optional"} onClick={handleTextSubmit}>
              <SendIcon />
            </button>
          </div>
        </div>
      )}

      {/* Progress + Footer */}
      {step.type !== "welcome" && step.type !== "connected" && step.type !== "fallback" && step.type !== "callback_confirmation" && (() => {
        const totalSteps = DEFAULT_FLOW.steps.filter((s) => !["connecting", "connected", "fallback", "callback_confirmation"].includes(s.type)).length;
        const currentIdx = DEFAULT_FLOW.steps.findIndex((s) => s.key === currentKey);
        const pct = Math.min(Math.round((currentIdx / totalSteps) * 100), 100);
        return (
          <div className="widget-progress-footer">
            <div className="progress-bar" style={{ margin: 0 }}>
              <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="progress-label">{pct}% complete</span>
          </div>
        );
      })()}
      <div className="widget-footer">
        <span>{t.poweredBy} <strong>IntakeLLG</strong></span>
      </div>
    </div>
  );
}
