/**
 * Shift scheduling for call routing.
 * Determines if calls should route to live agents or auto-callback
 * based on configured business hours.
 */

import { supabaseAdmin } from "@/lib/supabase/admin";

type ShiftStatus = {
  isOpen: boolean;
  currentRule: string | null;
  nextOpenAt: string | null;
  timezone: string;
};

/**
 * Check if the office is currently open for a given client.
 * Uses routing_rules table with day-of-week and time windows.
 */
export async function getShiftStatus(clientId: string): Promise<ShiftStatus> {
  const { data: rules } = await supabaseAdmin
    .from("routing_rules")
    .select("name, timezone, days_of_week, start_time_local, end_time_local")
    .eq("client_id", clientId)
    .eq("is_active", true)
    .order("priority");

  if (!rules || rules.length === 0) {
    return { isOpen: false, currentRule: null, nextOpenAt: null, timezone: "America/Los_Angeles" };
  }

  for (const rule of rules) {
    const tz = rule.timezone || "America/Los_Angeles";
    const now = new Date();

    // Get current time in the rule's timezone
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      weekday: "short",
    });
    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
    const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
    const dayName = parts.find((p) => p.type === "weekday")?.value ?? "";

    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const currentDay = dayMap[dayName] ?? 0;
    const currentMinutes = hour * 60 + minute;

    // Check if current day is in the rule's days
    const daysOfWeek = rule.days_of_week as number[];
    if (!daysOfWeek.includes(currentDay)) continue;

    // Parse start/end times
    const [startH, startM] = (rule.start_time_local as string).split(":").map(Number);
    const [endH, endM] = (rule.end_time_local as string).split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
      return { isOpen: true, currentRule: rule.name, nextOpenAt: null, timezone: tz };
    }
  }

  // Not currently open - find next open time
  // Simplified: just return the first rule's next start time
  const firstRule = rules[0];
  const tz = firstRule.timezone || "America/Los_Angeles";

  return {
    isOpen: false,
    currentRule: null,
    nextOpenAt: `Next business day at ${firstRule.start_time_local}`,
    timezone: tz,
  };
}

/**
 * Get a message for outside-hours visitors.
 */
export function getOutsideHoursMessage(nextOpenAt: string | null, lang: "en" | "es" = "en"): string {
  if (lang === "es") {
    return nextOpenAt
      ? `Nuestras oficinas están cerradas en este momento. Abrimos ${nextOpenAt}. Complete el formulario y nos comunicaremos con usted.`
      : "Nuestras oficinas están cerradas. Complete el formulario y nos comunicaremos con usted lo antes posible.";
  }
  return nextOpenAt
    ? `Our office is currently closed. We open ${nextOpenAt}. Complete the form and we'll reach out to you.`
    : "Our office is currently closed. Complete the form and we'll reach out as soon as possible.";
}
