"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

type Activity = {
  id: string;
  type: "new_lead" | "status_change" | "call" | "assignment";
  title: string;
  detail: string;
  leadId?: string;
  timestamp: number;
};

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const TYPE_COLORS: Record<string, string> = {
  new_lead: "#3b82f6",
  status_change: "#f59e0b",
  call: "#22c55e",
  assignment: "#8b5cf6",
};

export function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return;

    const client = createClient(supabaseUrl, supabaseKey);

    const channel = client
      .channel("activity-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "leads" },
        (payload) => {
          const lead = payload.new as Record<string, string>;
          const name = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "New Lead";
          setActivities((prev) => [{
            id: `lead-${Date.now()}`,
            type: "new_lead" as const,
            title: "New lead",
            detail: `${name} — ${lead.matter_type ?? "Unknown"}`,
            leadId: lead.id,
            timestamp: Date.now(),
          }, ...prev].slice(0, 20));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "leads" },
        (payload) => {
          const lead = payload.new as Record<string, string>;
          const old = payload.old as Record<string, string>;
          if (lead.status !== old.status) {
            const name = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Lead";
            setActivities((prev) => [{
              id: `status-${Date.now()}`,
              type: "status_change" as const,
              title: "Status changed",
              detail: `${name}: ${old.status} → ${lead.status}`,
              leadId: lead.id,
              timestamp: Date.now(),
            }, ...prev].slice(0, 20));
          }
          if (lead.assigned_to_name && lead.assigned_to_name !== old.assigned_to_name) {
            const name = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Lead";
            setActivities((prev) => [{
              id: `assign-${Date.now()}`,
              type: "assignment" as const,
              title: "Lead assigned",
              detail: `${name} → ${lead.assigned_to_name}`,
              leadId: lead.id,
              timestamp: Date.now(),
            }, ...prev].slice(0, 20));
          }
        }
      )
      .subscribe();

    return () => { client.removeChannel(channel); };
  }, []);

  return (
    <div className="activity-feed">
      <h3 style={{ marginBottom: 12 }}>Live Activity</h3>
      {activities.length === 0 ? (
        <p className="muted text-sm" style={{ padding: "16px 0" }}>Waiting for activity... New leads and status changes will appear here in real time.</p>
      ) : (
        <div className="activity-list">
          {activities.map((a) => (
            <div key={a.id} className="activity-item">
              <div className="activity-dot" style={{ background: TYPE_COLORS[a.type] ?? "#94a3b8" }} />
              <div className="activity-content">
                <div className="activity-title">
                  {a.leadId ? <Link href={`/admin/leads/${a.leadId}`}>{a.title}</Link> : a.title}
                </div>
                <div className="activity-detail">{a.detail}</div>
              </div>
              <div className="activity-time">{timeAgo(a.timestamp)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
