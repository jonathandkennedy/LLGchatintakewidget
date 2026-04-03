/**
 * Time-of-day greetings for the widget.
 * Returns appropriate greeting based on local time.
 */

type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

const GREETINGS_EN: Record<TimeOfDay, string> = {
  morning: "Good morning! How can we help you today?",
  afternoon: "Good afternoon! How can we help you today?",
  evening: "Good evening! How can we help you today?",
  night: "Hello! We're here to help, even at this hour.",
};

const GREETINGS_ES: Record<TimeOfDay, string> = {
  morning: "\u00a1Buenos d\u00edas! \u00bfC\u00f3mo podemos ayudarle hoy?",
  afternoon: "\u00a1Buenas tardes! \u00bfC\u00f3mo podemos ayudarle hoy?",
  evening: "\u00a1Buenas noches! \u00bfC\u00f3mo podemos ayudarle hoy?",
  night: "\u00a1Hola! Estamos aqu\u00ed para ayudarle.",
};

export function getTimeGreeting(lang: "en" | "es" = "en"): string {
  const time = getTimeOfDay();
  return lang === "es" ? GREETINGS_ES[time] : GREETINGS_EN[time];
}

export function getTimeEmoji(): string {
  const time = getTimeOfDay();
  switch (time) {
    case "morning": return "\u2600\ufe0f";
    case "afternoon": return "\u26c5";
    case "evening": return "\ud83c\udf05";
    case "night": return "\ud83c\udf19";
  }
}
