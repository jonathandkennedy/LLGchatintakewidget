/**
 * Admin notification preferences.
 * Stores per-user preferences in localStorage for:
 * - Which notification types to show
 * - Sound on/off
 * - Browser notification on/off
 */

const PREFS_KEY = "intakellg_notif_prefs";

type NotificationPrefs = {
  soundEnabled: boolean;
  browserNotificationsEnabled: boolean;
  showNewLeads: boolean;
  showStatusChanges: boolean;
  showCallEvents: boolean;
  showAssignments: boolean;
};

const DEFAULT_PREFS: NotificationPrefs = {
  soundEnabled: true,
  browserNotificationsEnabled: true,
  showNewLeads: true,
  showStatusChanges: true,
  showCallEvents: true,
  showAssignments: true,
};

export function getNotificationPrefs(): NotificationPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function saveNotificationPrefs(prefs: Partial<NotificationPrefs>): void {
  try {
    const current = getNotificationPrefs();
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...current, ...prefs }));
  } catch { /* ignore */ }
}

export function shouldShowNotification(type: string, prefs: NotificationPrefs): boolean {
  switch (type) {
    case "new_lead": return prefs.showNewLeads;
    case "call_connected": return prefs.showCallEvents;
    case "callback_pending": return prefs.showStatusChanges;
    default: return true;
  }
}
