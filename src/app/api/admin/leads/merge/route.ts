import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminAuth } from "@/lib/auth/api-auth";
import { logAudit } from "@/lib/monitoring/audit";

/**
 * Merge two duplicate leads into one.
 * Keeps the primary lead, moves all data from secondary, then marks secondary as merged.
 */
export async function POST(request: Request) {
  const authError = requireAdminAuth();
  if (authError) return authError;

  try {
    const { primaryId, secondaryId } = await request.json();

    if (!primaryId || !secondaryId || primaryId === secondaryId) {
      return NextResponse.json({ error: "Two different lead IDs required" }, { status: 400 });
    }

    // Get both leads
    const [{ data: primary }, { data: secondary }] = await Promise.all([
      supabaseAdmin.from("leads").select("*").eq("id", primaryId).single(),
      supabaseAdmin.from("leads").select("*").eq("id", secondaryId).single(),
    ]);

    if (!primary || !secondary) {
      return NextResponse.json({ error: "One or both leads not found" }, { status: 404 });
    }

    // Merge: fill in any null fields on primary from secondary
    const mergedFields: Record<string, unknown> = {};
    const fieldsToMerge = [
      "phone_e164", "email", "matter_type", "incident_summary",
      "injury_status", "injury_areas", "medical_treatment_status",
      "incident_state", "incident_city", "incident_date_range", "additional_notes",
    ];

    for (const field of fieldsToMerge) {
      if (!primary[field] && secondary[field]) {
        mergedFields[field] = secondary[field];
      }
    }

    // Keep higher score
    if ((secondary.lead_score ?? 0) > (primary.lead_score ?? 0)) {
      mergedFields.lead_score = secondary.lead_score;
      mergedFields.lead_score_tier = secondary.lead_score_tier;
    }

    // Update primary with merged data
    if (Object.keys(mergedFields).length > 0) {
      await supabaseAdmin.from("leads").update(mergedFields).eq("id", primaryId);
    }

    // Move call attempts and SMS from secondary to primary
    await supabaseAdmin.from("call_attempts").update({ lead_id: primaryId }).eq("lead_id", secondaryId);
    await supabaseAdmin.from("sms_messages").update({ lead_id: primaryId }).eq("lead_id", secondaryId);
    await supabaseAdmin.from("lead_notes").update({ lead_id: primaryId }).eq("lead_id", secondaryId);

    // Mark secondary as merged
    await supabaseAdmin.from("leads").update({
      status: "merged",
      additional_notes: `Merged into lead ${primaryId}`,
    }).eq("id", secondaryId);

    logAudit({
      action: "lead.status_updated",
      actor: "admin",
      resourceType: "lead",
      resourceId: primaryId,
      details: { action: "merge", mergedFrom: secondaryId, fieldsUpdated: Object.keys(mergedFields) },
    });

    return NextResponse.json({ ok: true, primaryId, mergedFields: Object.keys(mergedFields) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Merge failed" }, { status: 500 });
  }
}
