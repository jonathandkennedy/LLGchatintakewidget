"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

type Notification = {
  id: string;
  type: "new_lead" | "callback_pending" | "call_connected" | "call_failed";
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
  leadId?: string;
};

const STORAGE_KEY = "intakellg_notifications";
const MAX_NOTIFICATIONS = 50;

function loadNotifications(): Notification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveNotifications(notifications: Notification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, MAX_NOTIFICATIONS)));
  } catch {
    // ignore
  }
}

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function requestBrowserPermission() {
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function sendBrowserNotification(title: string, body: string) {
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body, icon: "/favicon.ico" });
  }
}

function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    osc.type = "sine";
    gain.gain.value = 0.15;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // audio not available
  }
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [connected, setConnected] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const addNotification = useCallback((notif: Notification) => {
    setNotifications((prev) => {
      const next = [notif, ...prev].slice(0, MAX_NOTIFICATIONS);
      saveNotifications(next);
      return next;
    });
    playNotificationSound();
    sendBrowserNotification(notif.title, notif.body);
  }, []);

  // Load saved notifications on mount
  useEffect(() => {
    setNotifications(loadNotifications());
    requestBrowserPermission();
  }, []);

  // Subscribe to Supabase Realtime
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return;

    const client = createClient(supabaseUrl, supabaseKey);

    const channel = client
      .channel("admin-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "leads" },
        (payload) => {
          const lead = payload.new as Record<string, string>;
          const name = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "New Lead";
          addNotification({
            id: `lead-${lead.id}-${Date.now()}`,
            type: "new_lead",
            title: "New Lead",
            body: `${name} — ${lead.matter_type ?? "Unknown matter"}`,
            timestamp: Date.now(),
            read: false,
            leadId: lead.id,
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "leads" },
        (payload) => {
          const lead = payload.new as Record<string, string>;
          const oldLead = payload.old as Record<string, string>;
          if (lead.status === oldLead.status) return;

          const name = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Lead";

          if (lead.status === "call_connected") {
            addNotification({
              id: `call-${lead.id}-${Date.now()}`,
              type: "call_connected",
              title: "Call Connected",
              body: `${name} is now on a call`,
              timestamp: Date.now(),
              read: false,
              leadId: lead.id,
            });
          } else if (lead.status === "callback_pending") {
            addNotification({
              id: `callback-${lead.id}-${Date.now()}`,
              type: "callback_pending",
              title: "Callback Requested",
              body: `${name} requested a callback`,
              timestamp: Date.now(),
              read: false,
              leadId: lead.id,
            });
          }
        }
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      client.removeChannel(channel);
    };
  }, [addNotification]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function markAllRead() {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      saveNotifications(next);
      return next;
    });
  }

  function clearAll() {
    setNotifications([]);
    saveNotifications([]);
    setOpen(false);
  }

  const iconColor = unreadCount > 0 ? "var(--primary)" : "var(--muted)";

  return (
    <div className="notif-container" ref={dropdownRef}>
      <button className="notif-bell" onClick={() => setOpen(!open)} title="Notifications">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
        <span className={`notif-status-dot ${connected ? "connected" : ""}`} />
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <span className="notif-title">Notifications</span>
            <div className="notif-actions">
              {unreadCount > 0 && (
                <button className="notif-action" onClick={markAllRead}>Mark all read</button>
              )}
              {notifications.length > 0 && (
                <button className="notif-action" onClick={clearAll}>Clear</button>
              )}
            </div>
          </div>
          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">No notifications yet</div>
            ) : (
              notifications.map((n) => (
                <a
                  key={n.id}
                  href={n.leadId ? `/intakeapp/admin/leads/${n.leadId}` : "#"}
                  className={`notif-item ${n.read ? "" : "unread"}`}
                  onClick={() => {
                    setNotifications((prev) => {
                      const next = prev.map((x) => x.id === n.id ? { ...x, read: true } : x);
                      saveNotifications(next);
                      return next;
                    });
                  }}
                >
                  <div className="notif-icon-wrap">
                    {n.type === "new_lead" && <span className="notif-type-icon new">+</span>}
                    {n.type === "call_connected" && <span className="notif-type-icon call">C</span>}
                    {n.type === "callback_pending" && <span className="notif-type-icon callback">R</span>}
                    {n.type === "call_failed" && <span className="notif-type-icon failed">!</span>}
                  </div>
                  <div className="notif-content">
                    <div className="notif-item-title">{n.title}</div>
                    <div className="notif-item-body">{n.body}</div>
                    <div className="notif-item-time">{timeAgo(n.timestamp)}</div>
                  </div>
                  {!n.read && <span className="notif-unread-dot" />}
                </a>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
