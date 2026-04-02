"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_FLOW } from "@/lib/widget/default-flow";
import type { WidgetStep } from "@/types/widget";

const STATE_OPTIONS = ["Arizona", "California", "Nevada", "Washington"];

type ChatMessage = {
  id: string;
  role: "bot" | "user";
  text: string;
  timestamp: string;
};

function getNextStepKey(step: WidgetStep, answers: Record<string, unknown>): string | null {
  if (step.branches?.length) {
    for (const branch of [...step.branches].sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100))) {
      const matches = branch.conditions.every((condition) => {
        const currentValue = answers[condition.fieldKey];
        switch (condition.operator) {
          case "eq":
            return currentValue === condition.value;
          case "in":
            return Array.isArray(condition.value) && condition.value.includes(String(currentValue));
          case "is_truthy":
            return Boolean(currentValue);
          case "is_falsy":
            return !currentValue;
          default:
            return false;
        }
      });
      if (matches) return branch.nextStepKey;
    }
  }
  return step.next ?? null;
}

function timeAgo() {
  return "a few seconds ago";
}

export function WidgetDemo() {
  const [currentKey, setCurrentKey] = useState<string>(DEFAULT_FLOW.steps[0]?.key ?? "welcome");
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [selectedMulti, setSelectedMulti] = useState<string[]>([]);
  const threadRef = useRef<HTMLDivElement>(null);

  const step = useMemo(() => DEFAULT_FLOW.steps.find((item) => item.key === currentKey), [currentKey]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages, currentKey]);

  // Add bot message when step changes
  useEffect(() => {
    if (!step) return;
    const text = step.title + (step.description ? "\n" + step.description : "");
    addBotMessage(text);
  }, [currentKey]); // eslint-disable-line react-hooks/exhaustive-deps

  function addBotMessage(text: string) {
    setMessages((prev) => [...prev, { id: `bot-${Date.now()}`, role: "bot", text, timestamp: timeAgo() }]);
  }

  function addUserMessage(text: string) {
    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: "user", text, timestamp: timeAgo() }]);
  }

  const goNext = (value?: unknown, displayText?: string) => {
    if (displayText) addUserMessage(displayText);

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
    const nextKey = step ? getNextStepKey(step, nextAnswers) : null;
    if (nextKey) setCurrentKey(nextKey);
  };

  if (!step) {
    return <div className="widget-card"><div className="chat-thread">Flow error: missing step.</div></div>;
  }

  const handleTextSubmit = () => {
    if (!inputValue.trim()) return;
    goNext(inputValue, inputValue);
  };

  const handleNameSubmit = () => {
    if (!firstName.trim() || !lastName.trim()) return;
    addUserMessage(`${firstName} ${lastName}`);
    const nextAnswers = { ...answers, first_name: firstName, last_name: lastName };
    setAnswers(nextAnswers);
    setFirstName("");
    setLastName("");
    const nextKey = step ? getNextStepKey(step, nextAnswers) : null;
    if (nextKey) setCurrentKey(nextKey);
  };

  const hasInput = inputValue.trim().length > 0;
  const hasName = firstName.trim().length > 0 && lastName.trim().length > 0;

  return (
    <div className="widget-card">
      {/* Toolbar */}
      <div className="widget-toolbar">
        <button className="widget-toolbar-btn" title="Restart" onClick={() => window.location.reload()}>&#8634;</button>
        <button className="widget-toolbar-btn" title="Close">&times;</button>
      </div>

      {/* Chat thread */}
      <div className="chat-thread" ref={threadRef}>
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

        {/* Interactive area for current step */}
        {step.type === "welcome" && (
          <div className="chat-msg chat-msg-bot" style={{ marginTop: 8 }}>
            <button className="chat-pill" onClick={() => goNext(undefined, "Start intake")}>
              Start intake
            </button>
          </div>
        )}

        {(step.type === "single_select" || step.type === "date_range") && (
          <div className="chat-msg chat-msg-bot" style={{ marginTop: 4 }}>
            <div className="chat-options">
              {step.options?.map((option) => (
                <button key={option.key} className="chat-pill" onClick={() => goNext(option.key, option.label)}>
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step.type === "multi_select" && (
          <div className="chat-msg chat-msg-bot" style={{ marginTop: 4 }}>
            <div className="chat-options">
              {step.options?.map((option) => (
                <button
                  key={option.key}
                  className={`chat-pill ${selectedMulti.includes(option.key) ? "selected" : ""}`}
                  onClick={() => setSelectedMulti((c) => c.includes(option.key) ? c.filter((k) => k !== option.key) : [...c, option.key])}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {selectedMulti.length > 0 && (
              <button className="chat-pill selected" style={{ marginTop: 8 }} onClick={() => goNext(selectedMulti, selectedMulti.join(", "))}>
                Continue
              </button>
            )}
          </div>
        )}

        {step.type === "dropdown" && (
          <div className="chat-msg chat-msg-bot" style={{ marginTop: 4 }}>
            <div className="chat-options">
              {STATE_OPTIONS.map((state) => (
                <button key={state} className="chat-pill" onClick={() => goNext(state, state)}>
                  {state}
                </button>
              ))}
            </div>
          </div>
        )}

        {step.type === "transfer_ready" && (
          <div className="chat-msg chat-msg-bot" style={{ marginTop: 4 }}>
            <div className="chat-options">
              <button className="chat-pill" onClick={() => { addUserMessage("Connect me now"); setCurrentKey("connecting"); }}>Connect me now</button>
              <button className="chat-pill" onClick={() => { addUserMessage("Prefer a callback"); setCurrentKey("callback_requested_confirmation"); }}>Prefer a callback</button>
            </div>
          </div>
        )}

        {step.type === "connecting" && (
          <div className="chat-msg chat-msg-bot" style={{ marginTop: 8 }}>
            <div className="status-pill">Connecting...</div>
            <div className="chat-options" style={{ marginTop: 8 }}>
              <button className="chat-pill" onClick={() => setCurrentKey("connected")}>Simulate connected</button>
              <button className="chat-pill" onClick={() => setCurrentKey("transfer_fallback")}>Simulate fallback</button>
            </div>
          </div>
        )}

        {(step.type === "connected" || step.type === "fallback" || step.type === "callback_confirmation") && (
          <div className="chat-msg chat-msg-bot" style={{ marginTop: 8 }}>
            <pre className="answer-preview">{JSON.stringify(answers, null, 2)}</pre>
            <button className="chat-pill" style={{ marginTop: 8 }} onClick={() => window.location.reload()}>Restart demo</button>
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
            <button className={`chat-submit-btn ${hasName ? "active" : ""}`} disabled={!hasName} onClick={handleNameSubmit}>
              &#10003;
            </button>
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
            <button className={`chat-submit-btn ${hasInput ? "active" : ""}`} disabled={!hasInput} onClick={handleTextSubmit}>
              &#9654;
            </button>
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
            <button className={`chat-submit-btn ${hasInput ? "active" : ""}`} disabled={!hasInput && step.type !== "textarea_optional"} onClick={handleTextSubmit}>
              &#9654;
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="widget-footer">
        <span>Powered by <strong>IntakeLLG</strong></span>
      </div>
    </div>
  );
}
