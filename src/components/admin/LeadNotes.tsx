"use client";

import { useEffect, useState } from "react";

type Note = {
  id: string;
  author: string;
  content: string;
  created_at: string;
};

export function LeadNotes({ leadId }: { leadId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/intakeapp/api/admin/leads/notes?leadId=${leadId}`)
      .then((res) => res.json())
      .then((json) => setNotes(json.notes ?? []))
      .catch(() => {});
  }, [leadId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/intakeapp/api/admin/leads/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, content }),
      });
      const json = await res.json();
      if (json.note) {
        setNotes((prev) => [json.note, ...prev]);
        setContent("");
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  function timeAgo(dateStr: string): string {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  return (
    <div>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          className="text-input"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add an internal note..."
          style={{ flex: 1 }}
        />
        <button className="primary-button" type="submit" disabled={saving || !content.trim()} style={{ width: "auto" }}>
          {saving ? "..." : "Add"}
        </button>
      </form>

      {notes.length === 0 ? (
        <p className="muted text-sm">No notes yet.</p>
      ) : (
        <div className="notes-list">
          {notes.map((note) => (
            <div key={note.id} className="note-item">
              <div className="note-header">
                <strong className="text-sm">{note.author}</strong>
                <span className="muted text-sm">{timeAgo(note.created_at)}</span>
              </div>
              <p className="note-content">{note.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
