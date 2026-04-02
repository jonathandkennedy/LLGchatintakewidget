"use client";

import { useState } from "react";

type Props = {
  leadIds: string[];
};

const STATUSES = [
  "started", "intake_completed", "transfer_attempted",
  "call_connected", "callback_pending", "closed_contacted", "closed_uncontacted",
];

export function BulkActions({ leadIds }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState("");
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState("");

  function toggleAll() {
    if (selected.size === leadIds.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(leadIds));
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function applyBulk() {
    if (selected.size === 0 || !status) return;
    setApplying(true);
    setResult("");

    let success = 0;
    for (const id of selected) {
      try {
        const res = await fetch(`/intakeapp/api/admin/leads/${id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (res.ok) success++;
      } catch {
        // continue with others
      }
    }

    setResult(`Updated ${success} of ${selected.size} leads`);
    setApplying(false);
    if (success > 0) {
      setTimeout(() => window.location.reload(), 1500);
    }
  }

  if (leadIds.length === 0) return null;

  return (
    <>
      {/* Inject checkboxes via data attributes */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.__bulkSelect = ${JSON.stringify(Array.from(selected))};
            window.__bulkToggle = function(id) {
              const event = new CustomEvent('bulk-toggle', { detail: id });
              window.dispatchEvent(event);
            };
          `,
        }}
      />

      {selected.size > 0 && (
        <div className="bulk-bar">
          <span className="text-sm" style={{ fontWeight: 600 }}>{selected.size} selected</span>
          <select className="text-input" value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: 200, padding: "6px 10px", fontSize: 13 }}>
            <option value="">Set status...</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="primary-button" style={{ width: "auto", padding: "6px 16px", fontSize: 13 }} disabled={!status || applying} onClick={applyBulk}>
            {applying ? "Applying..." : "Apply"}
          </button>
          <button className="secondary-button" style={{ width: "auto", padding: "6px 12px", fontSize: 13 }} onClick={() => setSelected(new Set())}>Clear</button>
          {result && <span className="muted text-sm">{result}</span>}
        </div>
      )}

      {/* Select all toggle in header */}
      <div className="bulk-select-all">
        <label className="checkbox-label" style={{ fontSize: 12 }}>
          <input type="checkbox" checked={selected.size === leadIds.length && leadIds.length > 0} onChange={toggleAll} />
          Select all ({leadIds.length})
        </label>
      </div>
    </>
  );
}

export function BulkCheckbox({ leadId, selected, onToggle }: { leadId: string; selected: boolean; onToggle: (id: string) => void }) {
  return (
    <input type="checkbox" checked={selected} onChange={() => onToggle(leadId)} style={{ cursor: "pointer" }} />
  );
}
