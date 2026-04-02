import { supabaseAdmin } from "@/lib/supabase/admin";

type AuditAction =
  | "lead.status_updated"
  | "lead.assigned"
  | "lead.exported"
  | "branding.updated"
  | "flow.step_created"
  | "flow.step_updated"
  | "flow.step_deleted"
  | "flow.step_moved"
  | "flow.created"
  | "ab_test.created"
  | "ab_test.status_changed"
  | "webhook.configured"
  | "admin.login"
  | "admin.logout";

type AuditEntry = {
  action: AuditAction;
  actor?: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
};

/**
 * Log an admin action for audit trail.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await supabaseAdmin.from("audit_log").insert({
      action: entry.action,
      actor: entry.actor ?? "system",
      resource_type: entry.resourceType ?? null,
      resource_id: entry.resourceId ?? null,
      details_json: entry.details ?? null,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[audit] Failed to log:", err);
  }
}

/**
 * Get recent audit log entries.
 */
export async function getAuditLog(limit = 50) {
  const { data } = await supabaseAdmin
    .from("audit_log")
    .select("id, action, actor, resource_type, resource_id, details_json, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}
