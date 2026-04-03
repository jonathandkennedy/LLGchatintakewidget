/**
 * Conversion attribution tracking.
 * Tracks first-touch and last-touch attribution for leads.
 * Stores UTM params on first visit (first-touch) and on session start (last-touch).
 */

const FIRST_TOUCH_KEY = "intakellg_first_touch";

type TouchData = {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  term: string | null;
  content: string | null;
  referrer: string | null;
  landingPage: string | null;
  timestamp: string;
};

/**
 * Capture first-touch attribution on initial visit.
 * Only stored once per visitor (persists in localStorage).
 */
export function captureFirstTouch(): TouchData | null {
  if (typeof window === "undefined") return null;

  const existing = localStorage.getItem(FIRST_TOUCH_KEY);
  if (existing) {
    try { return JSON.parse(existing); } catch { /* continue */ }
  }

  const params = new URLSearchParams(window.location.search);
  const touch: TouchData = {
    source: params.get("utm_source"),
    medium: params.get("utm_medium"),
    campaign: params.get("utm_campaign"),
    term: params.get("utm_term"),
    content: params.get("utm_content"),
    referrer: document.referrer || null,
    landingPage: window.location.pathname,
    timestamp: new Date().toISOString(),
  };

  localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(touch));
  return touch;
}

/**
 * Get last-touch attribution from current page URL.
 */
export function getLastTouch(): TouchData {
  if (typeof window === "undefined") {
    return { source: null, medium: null, campaign: null, term: null, content: null, referrer: null, landingPage: null, timestamp: new Date().toISOString() };
  }

  const params = new URLSearchParams(window.location.search);
  return {
    source: params.get("utm_source"),
    medium: params.get("utm_medium"),
    campaign: params.get("utm_campaign"),
    term: params.get("utm_term"),
    content: params.get("utm_content"),
    referrer: document.referrer || null,
    landingPage: window.location.pathname,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get first-touch data from localStorage.
 */
export function getFirstTouch(): TouchData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(FIRST_TOUCH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
