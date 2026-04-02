import type { Lang } from "./i18n";

type ChatMessage = {
  id: string;
  role: "bot" | "user";
  text: string;
  timestamp: string;
  stepKey?: string;
};

export type SavedSession = {
  currentKey: string;
  answers: Record<string, unknown>;
  messages: ChatMessage[];
  lang: Lang;
  sessionId?: string | null;
  savedAt: number;
};

const EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

function getStorageKey(widgetId: string): string {
  return `intakellg_session_${widgetId}`;
}

export function saveSession(widgetId: string, data: Omit<SavedSession, "savedAt">): void {
  try {
    const session: SavedSession = { ...data, savedAt: Date.now() };
    localStorage.setItem(getStorageKey(widgetId), JSON.stringify(session));
  } catch {
    // localStorage may be unavailable in iframe/private mode
  }
}

export function loadSession(widgetId: string): SavedSession | null {
  try {
    const raw = localStorage.getItem(getStorageKey(widgetId));
    if (!raw) return null;
    const session: SavedSession = JSON.parse(raw);
    // Expire after 30 minutes
    if (Date.now() - session.savedAt > EXPIRY_MS) {
      clearSession(widgetId);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function clearSession(widgetId: string): void {
  try {
    localStorage.removeItem(getStorageKey(widgetId));
  } catch {
    // ignore
  }
}
