/**
 * Error tracking for widget and admin.
 * Captures errors and surfaces them in the admin dashboard.
 */

import { supabaseAdmin } from "@/lib/supabase/admin";

type ErrorEntry = {
  source: "widget" | "api" | "admin" | "webhook" | "integration";
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  clientId?: string;
  sessionId?: string;
};

/**
 * Track an error.
 */
export async function trackError(entry: ErrorEntry): Promise<void> {
  try {
    await supabaseAdmin.from("error_log").insert({
      source: entry.source,
      message: entry.message,
      stack: entry.stack ?? null,
      context_json: entry.context ?? null,
      client_id: entry.clientId ?? null,
      session_id: entry.sessionId ?? null,
      created_at: new Date().toISOString(),
    });
  } catch {
    console.error("[error-tracker] Failed to log error:", entry.message);
  }
}

/**
 * Get recent errors for the admin dashboard.
 */
export async function getRecentErrors(limit = 50) {
  const { data } = await supabaseAdmin
    .from("error_log")
    .select("id, source, message, stack, context_json, client_id, session_id, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}

/**
 * Get error counts by source for the last N hours.
 */
export async function getErrorCounts(hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const { data } = await supabaseAdmin
    .from("error_log")
    .select("source")
    .gte("created_at", since);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.source, (counts.get(row.source) ?? 0) + 1);
  }

  return Object.fromEntries(counts);
}
