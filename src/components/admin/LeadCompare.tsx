"use client";

import { useState } from "react";

type Lead = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone_e164: string | null;
  email: string | null;
  matter_type: string | null;
  status: string;
  lead_score: number | null;
  incident_summary: string | null;
  created_at: string;
};

type Props = {
  leadA: Lead;
  leadB: Lead;
};

export function LeadCompare({ leadA, leadB }: Props) {
  const [merging, setMerging] = useState(false);
  const [result, setResult] = useState("");

  const fields: Array<{ key: keyof Lead; label: string }> = [
    { key: "first_name", label: "First Name" },
    { key: "last_name", label: "Last Name" },
    { key: "phone_e164", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "matter_type", label: "Matter Type" },
    { key: "status", label: "Status" },
    { key: "lead_score", label: "Score" },
    { key: "incident_summary", label: "Summary" },
    { key: "created_at", label: "Created" },
  ];

  async function handleMerge(primaryId: string, secondaryId: string) {
    if (!confirm("Merge these leads? This cannot be undone.")) return;
    setMerging(true);
    try {
      const res = await fetch("/api/admin/leads/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primaryId, secondaryId }),
      });
      const json = await res.json();
      if (json.ok) {
        setResult(`Merged into ${primaryId.slice(0, 8)}. Reloading...`);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setResult(json.error ?? "Merge failed");
      }
    } catch {
      setResult("Merge failed");
    } finally {
      setMerging(false);
    }
  }

  function highlight(a: string | null | number, b: string | null | number) {
    if (a === b) return {};
    if (!a && b) return { background: "#fef3c7" };
    if (a && !b) return {};
    return { background: "#fef2f2" };
  }

  return (
    <div>
      {result && <div className="error-banner" style={{ marginBottom: 12 }}>{result}</div>}
      <table className="table">
        <thead>
          <tr>
            <th>Field</th>
            <th>Lead A</th>
            <th>Lead B</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((f) => {
            const valA = String(leadA[f.key] ?? "");
            const valB = String(leadB[f.key] ?? "");
            const differs = valA !== valB;
            return (
              <tr key={f.key}>
                <td><strong>{f.label}</strong></td>
                <td style={differs ? highlight(leadA[f.key], leadB[f.key]) : {}}>{valA || "\u2014"}</td>
                <td style={differs ? highlight(leadB[f.key], leadA[f.key]) : {}}>{valB || "\u2014"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button
          className="primary-button"
          style={{ width: "auto" }}
          disabled={merging}
          onClick={() => handleMerge(leadA.id, leadB.id)}
        >
          Keep Lead A, merge B into A
        </button>
        <button
          className="secondary-button"
          style={{ width: "auto" }}
          disabled={merging}
          onClick={() => handleMerge(leadB.id, leadA.id)}
        >
          Keep Lead B, merge A into B
        </button>
      </div>
    </div>
  );
}
