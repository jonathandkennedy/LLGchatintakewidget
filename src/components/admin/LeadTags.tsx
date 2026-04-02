"use client";

import { useEffect, useState } from "react";

type Tag = { id: string; tag: string; color: string; created_at: string };

const TAG_COLORS = [
  { key: "blue", bg: "#dbeafe", text: "#2563eb" },
  { key: "green", bg: "#d1fae5", text: "#059669" },
  { key: "red", bg: "#fee2e2", text: "#dc2626" },
  { key: "yellow", bg: "#fef3c7", text: "#d97706" },
  { key: "purple", bg: "#ede9fe", text: "#7c3aed" },
  { key: "pink", bg: "#fce7f3", text: "#db2777" },
];

export function LeadTags({ leadId }: { leadId: string }) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [input, setInput] = useState("");
  const [color, setColor] = useState("blue");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/leads/tags?leadId=${leadId}`)
      .then((r) => r.json())
      .then((j) => setTags(j.tags ?? []))
      .catch(() => {});
  }, [leadId]);

  async function addTag() {
    if (!input.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/admin/leads/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, tag: input, color }),
      });
      const json = await res.json();
      if (json.tag) { setTags((p) => [...p, json.tag]); setInput(""); }
    } catch { /* ignore */ }
    finally { setAdding(false); }
  }

  async function removeTag(tagId: string) {
    await fetch(`/api/admin/leads/tags?tagId=${tagId}`, { method: "DELETE" });
    setTags((p) => p.filter((t) => t.id !== tagId));
  }

  function getColorStyle(c: string) {
    return TAG_COLORS.find((tc) => tc.key === c) ?? TAG_COLORS[0];
  }

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {tags.map((t) => {
          const cs = getColorStyle(t.color);
          return (
            <span key={t.id} className="lead-tag" style={{ background: cs.bg, color: cs.text }}>
              {t.tag}
              <button className="lead-tag-remove" onClick={() => removeTag(t.id)}>&times;</button>
            </span>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input className="text-input" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTag()} placeholder="Add tag..." style={{ flex: 1, padding: "6px 10px", fontSize: 13 }} />
        <select value={color} onChange={(e) => setColor(e.target.value)} style={{ padding: "6px 8px", fontSize: 12, border: "1px solid var(--border)", borderRadius: 6 }}>
          {TAG_COLORS.map((c) => <option key={c.key} value={c.key}>{c.key}</option>)}
        </select>
        <button className="move-btn" disabled={adding || !input.trim()} onClick={addTag} style={{ width: 28, height: 28, fontSize: 12 }}>+</button>
      </div>
    </div>
  );
}
