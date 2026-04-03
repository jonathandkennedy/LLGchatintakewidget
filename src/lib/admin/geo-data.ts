/**
 * Geographic data for lead heatmap visualization.
 * Aggregates lead counts by state.
 */

import { supabaseAdmin } from "@/lib/supabase/admin";

export type StateLeadCount = {
  state: string;
  count: number;
  pct: number;
};

const STATE_ABBREVS: Record<string, string> = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA",
  Colorado: "CO", Connecticut: "CT", Delaware: "DE", Florida: "FL", Georgia: "GA",
  Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA",
  Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD",
  Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS",
  Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV",
  "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM",
  "New York": "NY", "North Carolina": "NC", "North Dakota": "ND",
  Ohio: "OH", Oklahoma: "OK", Oregon: "OR", Pennsylvania: "PA",
  "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD",
  Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT", Virginia: "VA",
  Washington: "WA", "West Virginia": "WV", Wisconsin: "WI", Wyoming: "WY",
};

export function getStateAbbrev(state: string): string {
  return STATE_ABBREVS[state] ?? state.slice(0, 2).toUpperCase();
}

export async function getLeadsByState(clientId?: string, days = 90): Promise<StateLeadCount[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  let builder = supabaseAdmin
    .from("leads")
    .select("incident_state")
    .gte("created_at", since)
    .not("incident_state", "is", null)
    .limit(1000);

  if (clientId) builder = builder.eq("client_id", clientId);

  const { data } = await builder;
  if (!data) return [];

  const counts = new Map<string, number>();
  for (const row of data) {
    if (row.incident_state) {
      const state = row.incident_state;
      counts.set(state, (counts.get(state) ?? 0) + 1);
    }
  }

  const total = data.length || 1;
  return [...counts.entries()]
    .map(([state, count]) => ({ state, count, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count);
}
