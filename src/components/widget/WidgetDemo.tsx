"use client";

import { useMemo, useState } from "react";
import { DEFAULT_FLOW } from "@/lib/widget/default-flow";
import type { WidgetStep } from "@/types/widget";

const STATE_OPTIONS = ["Arizona", "California", "Nevada", "Washington"];

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

export function WidgetDemo() {
  const [currentKey, setCurrentKey] = useState<string>(DEFAULT_FLOW.steps[0]?.key ?? "welcome");
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [textValue, setTextValue] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const step = useMemo(() => DEFAULT_FLOW.steps.find((item) => item.key === currentKey), [currentKey]);

  if (!step) {
    return <div className="widget-card">Flow error: missing step.</div>;
  }

  const goNext = (value?: unknown) => {
    const nextAnswers = { ...answers };
    if (step.fieldKey && value !== undefined) {
      nextAnswers[step.fieldKey] = value;
      setAnswers(nextAnswers);
    }

    if (step.key === "full_name") {
      nextAnswers.first_name = firstName;
      nextAnswers.last_name = lastName;
      setAnswers(nextAnswers);
    }

    const nextKey = getNextStepKey(step, nextAnswers);
    if (nextKey) setCurrentKey(nextKey);
  };

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div>
          <div className="eyebrow">Free Case Review</div>
          <h2>{step.title}</h2>
          {step.description ? <p>{step.description}</p> : null}
        </div>
      </div>

      <div className="widget-body">
        {step.type === "welcome" && (
          <div className="stack">
            <ul className="bullet-list">
              <li>Free case review</li>
              <li>Takes about 1 minute</li>
              <li>Private and no obligation</li>
            </ul>
            <button className="primary-button" onClick={() => goNext()}>
              Start intake
            </button>
          </div>
        )}

        {(step.type === "single_select" || step.type === "date_range") && (
          <div className="stack">
            {step.options?.map((option) => (
              <button key={option.key} className="option-card" onClick={() => goNext(option.key)}>
                {option.label}
              </button>
            ))}
          </div>
        )}

        {step.type === "multi_select" && (
          <MultiSelectStep step={step} onContinue={(value) => goNext(value)} />
        )}

        {(step.type === "long_text" || step.type === "textarea_optional") && (
          <div className="stack">
            <textarea
              className="text-input text-area"
              value={textValue}
              placeholder={step.placeholder}
              onChange={(event) => setTextValue(event.target.value)}
            />
            <button className="primary-button" onClick={() => goNext(textValue)}>
              Continue
            </button>
          </div>
        )}

        {step.type === "short_text" && (
          <div className="stack">
            <input className="text-input" value={textValue} placeholder={step.placeholder} onChange={(event) => setTextValue(event.target.value)} />
            <button className="primary-button" onClick={() => goNext(textValue)}>
              Continue
            </button>
          </div>
        )}

        {step.type === "dropdown" && (
          <div className="stack">
            <select className="text-input" value={textValue} onChange={(event) => setTextValue(event.target.value)}>
              <option value="">Select a state</option>
              {STATE_OPTIONS.map((state) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
            <button className="primary-button" onClick={() => goNext(textValue)}>
              Continue
            </button>
          </div>
        )}

        {step.type === "name" && (
          <div className="stack">
            <div className="name-grid">
              <input className="text-input" placeholder="First name" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
              <input className="text-input" placeholder="Last name" value={lastName} onChange={(event) => setLastName(event.target.value)} />
            </div>
            <button className="primary-button" onClick={() => goNext()}>
              Continue
            </button>
          </div>
        )}

        {(step.type === "phone" || step.type === "email") && (
          <div className="stack">
            <input className="text-input" value={textValue} placeholder={step.type === "phone" ? "(555) 555-5555" : "you@example.com"} onChange={(event) => setTextValue(event.target.value)} />
            <button className="primary-button" onClick={() => goNext(textValue)}>
              Continue
            </button>
          </div>
        )}

        {step.type === "transfer_ready" && (
          <div className="stack">
            <button className="primary-button" onClick={() => setCurrentKey("connecting")}>Connect me now</button>
            <button className="secondary-button" onClick={() => setCurrentKey("callback_requested_confirmation")}>Prefer a callback instead?</button>
          </div>
        )}

        {step.type === "connecting" && (
          <div className="stack">
            <div className="status-pill">Connecting...</div>
            <button className="primary-button" onClick={() => setCurrentKey("connected")}>Simulate connected</button>
            <button className="secondary-button" onClick={() => setCurrentKey("transfer_fallback")}>Simulate fallback</button>
          </div>
        )}

        {(step.type === "connected" || step.type === "fallback" || step.type === "callback_confirmation") && (
          <div className="stack">
            <pre className="answer-preview">{JSON.stringify(answers, null, 2)}</pre>
            <button className="primary-button" onClick={() => window.location.reload()}>Restart demo</button>
          </div>
        )}
      </div>
    </div>
  );
}

function MultiSelectStep({ step, onContinue }: { step: WidgetStep; onContinue: (value: string[]) => void }) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (key: string) => {
    setSelected((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  };

  return (
    <div className="stack">
      {step.options?.map((option) => (
        <button key={option.key} className={`option-card ${selected.includes(option.key) ? "selected" : ""}`} onClick={() => toggle(option.key)}>
          {option.label}
        </button>
      ))}
      <button className="primary-button" onClick={() => onContinue(selected)}>Continue</button>
    </div>
  );
}
