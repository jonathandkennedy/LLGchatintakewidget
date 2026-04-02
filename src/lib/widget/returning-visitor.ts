/**
 * Returning visitor detection.
 * Tracks visit count and last visit time to personalize the widget greeting.
 */

const VISIT_KEY = "intakellg_visits";

type VisitorInfo = {
  isReturning: boolean;
  visitCount: number;
  lastVisit: string | null;
  daysSinceLastVisit: number | null;
};

export function getVisitorInfo(): VisitorInfo {
  try {
    const raw = localStorage.getItem(VISIT_KEY);
    const now = new Date().toISOString();

    if (!raw) {
      localStorage.setItem(VISIT_KEY, JSON.stringify({ count: 1, lastVisit: now }));
      return { isReturning: false, visitCount: 1, lastVisit: null, daysSinceLastVisit: null };
    }

    const data = JSON.parse(raw);
    const count = (data.count ?? 0) + 1;
    const lastVisit = data.lastVisit ?? null;
    const daysSince = lastVisit ? Math.floor((Date.now() - new Date(lastVisit).getTime()) / 86400000) : null;

    localStorage.setItem(VISIT_KEY, JSON.stringify({ count, lastVisit: now }));

    return {
      isReturning: count > 1,
      visitCount: count,
      lastVisit,
      daysSinceLastVisit: daysSince,
    };
  } catch {
    return { isReturning: false, visitCount: 1, lastVisit: null, daysSinceLastVisit: null };
  }
}

/**
 * Get a personalized greeting based on visitor info.
 */
export function getPersonalizedGreeting(info: VisitorInfo, defaultGreeting: string): string {
  if (!info.isReturning) return defaultGreeting;

  if (info.visitCount === 2) return "Welcome back! How can we help you today?";
  if (info.visitCount >= 5) return "Good to see you again! Ready to get started?";
  return "Welcome back! We're here to help.";
}

export function getPersonalizedGreetingEs(info: VisitorInfo, defaultGreeting: string): string {
  if (!info.isReturning) return defaultGreeting;

  if (info.visitCount === 2) return "\u00a1Bienvenido de nuevo! \u00bfC\u00f3mo podemos ayudarle hoy?";
  if (info.visitCount >= 5) return "\u00a1Qu\u00e9 bueno verle de nuevo! \u00bfListo para empezar?";
  return "\u00a1Bienvenido de nuevo! Estamos aqu\u00ed para ayudarle.";
}
