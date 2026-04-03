/**
 * Hourly submission heatmap data.
 * Shows which hours and days of the week get the most leads.
 */

import { supabaseAdmin } from "@/lib/supabase/admin";

export type HeatmapCell = {
  day: number; // 0=Sun, 6=Sat
  hour: number; // 0-23
  count: number;
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export { DAY_LABELS };

export async function getHourlyHeatmap(clientId?: string, days = 30): Promise<HeatmapCell[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  let builder = supabaseAdmin
    .from("leads")
    .select("created_at")
    .gte("created_at", since)
    .limit(2000);

  if (clientId) builder = builder.eq("client_id", clientId);

  const { data } = await builder;
  if (!data) return [];

  // Initialize grid
  const grid = new Map<string, number>();
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      grid.set(`${d}-${h}`, 0);
    }
  }

  // Count leads per day/hour
  for (const row of data) {
    const date = new Date(row.created_at);
    const day = date.getDay();
    const hour = date.getHours();
    const key = `${day}-${hour}`;
    grid.set(key, (grid.get(key) ?? 0) + 1);
  }

  return [...grid.entries()].map(([key, count]) => {
    const [day, hour] = key.split("-").map(Number);
    return { day, hour, count };
  });
}
