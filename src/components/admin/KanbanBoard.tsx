"use client";

import { useState } from "react";
import Link from "next/link";

type Lead = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  matter_type: string | null;
  status: string;
  lead_score: number | null;
  lead_score_tier: string | null;
  created_at: string;
  assigned_to_name: string | null;
};

type Props = {
  leads: Lead[];
};

const COLUMNS = [
  { key: "intake_completed", label: "New", color: "#3b82f6" },
  { key: "callback_pending", label: "Callback", color: "#eab308" },
  { key: "transfer_attempted", label: "Attempted", color: "#f97316" },
  { key: "call_connected", label: "Connected", color: "#22c55e" },
  { key: "closed_contacted", label: "Closed", color: "#6b7280" },
];

function timeAgo(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function KanbanBoard({ leads }: Props) {
  const [moving, setMoving] = useState<string | null>(null);

  async function moveLead(leadId: string, newStatus: string) {
    setMoving(leadId);
    try {
      await fetch(`/intakeapp/api/admin/leads/${leadId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      window.location.reload();
    } catch {
      setMoving(null);
    }
  }

  return (
    <div className="kanban-board">
      {COLUMNS.map((col) => {
        const colLeads = leads.filter((l) => l.status === col.key);
        return (
          <div key={col.key} className="kanban-column">
            <div className="kanban-column-header">
              <div className="kanban-column-dot" style={{ background: col.color }} />
              <span className="kanban-column-title">{col.label}</span>
              <span className="kanban-column-count">{colLeads.length}</span>
            </div>
            <div className="kanban-cards">
              {colLeads.map((lead) => {
                const name = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Unknown";
                return (
                  <div key={lead.id} className={`kanban-card ${moving === lead.id ? "moving" : ""}`}>
                    <div className="kanban-card-header">
                      <Link href={`/admin/leads/${lead.id}`} className="kanban-card-name">{name}</Link>
                      {lead.lead_score != null && (
                        <span className={`score-badge score-${lead.lead_score_tier ?? "cold"}`} style={{ fontSize: 10 }}>{lead.lead_score}</span>
                      )}
                    </div>
                    <div className="kanban-card-meta">
                      {lead.matter_type && <span>{lead.matter_type.replace(/_/g, " ")}</span>}
                      <span>{timeAgo(lead.created_at)}</span>
                    </div>
                    {lead.assigned_to_name && <div className="kanban-card-assigned">{lead.assigned_to_name}</div>}
                    <div className="kanban-card-actions">
                      {COLUMNS.filter((c) => c.key !== col.key).slice(0, 3).map((target) => (
                        <button
                          key={target.key}
                          className="kanban-move-btn"
                          style={{ borderColor: target.color, color: target.color }}
                          disabled={moving === lead.id}
                          onClick={() => moveLead(lead.id, target.key)}
                          title={`Move to ${target.label}`}
                        >
                          {target.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              {colLeads.length === 0 && <div className="kanban-empty">No leads</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
