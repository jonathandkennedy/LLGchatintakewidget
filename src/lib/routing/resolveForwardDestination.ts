import { DateTime } from "luxon";
import { supabaseAdmin } from "@/lib/supabase/admin";

type ResolveInput = {
  clientId: string;
  now?: Date;
};

export async function resolveForwardDestination({ clientId, now = new Date() }: ResolveInput): Promise<{ destinationNumber: string | null; matchedRuleId?: string | null }> {
  const { data: rules, error } = await supabaseAdmin
    .from("routing_rules")
    .select("*")
    .eq("client_id", clientId)
    .eq("is_active", true)
    .order("priority", { ascending: true });

  if (error) throw error;
  if (!rules?.length) return { destinationNumber: null, matchedRuleId: null };

  for (const rule of rules) {
    const localNow = DateTime.fromJSDate(now).setZone(String(rule.timezone));
    const weekday = localNow.weekday % 7;
    const current = localNow.toFormat("HH:mm:ss");
    const daysOfWeek = Array.isArray(rule.days_of_week) ? (rule.days_of_week as number[]) : [];

    if (daysOfWeek.includes(weekday) && current >= String(rule.start_time_local) && current <= String(rule.end_time_local)) {
      return {
        destinationNumber: String(rule.destination_number_e164),
        matchedRuleId: String(rule.id),
      };
    }
  }

  return {
    destinationNumber: String(rules[0].destination_number_e164),
    matchedRuleId: String(rules[0].id),
  };
}
