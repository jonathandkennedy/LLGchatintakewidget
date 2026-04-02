import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { readJsonBody } from "@/lib/utils/json";

type RevertBody = {
  sessionId: string;
  toStepKey: string;
};

/**
 * Reverts a session to a specific step by deleting all answers
 * that were submitted at or after that step in the flow.
 */
export async function POST(request: Request) {
  try {
    const body = await readJsonBody<RevertBody>(request);

    if (!body.sessionId || !body.toStepKey) {
      return NextResponse.json({ error: "sessionId and toStepKey are required" }, { status: 400 });
    }

    // Get the flow to determine step order
    const { data: session } = await supabaseAdmin
      .from("lead_sessions")
      .select("id, flow_id, status")
      .eq("id", body.sessionId)
      .single();

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.status === "completed") {
      return NextResponse.json({ error: "Cannot revert a completed session" }, { status: 400 });
    }

    // Get all answers for this session with their step keys
    const { data: answers } = await supabaseAdmin
      .from("lead_session_answers")
      .select("id, step_key, field_key, created_at")
      .eq("session_id", body.sessionId)
      .order("created_at", { ascending: true });

    if (!answers || answers.length === 0) {
      return NextResponse.json({ ok: true, deletedCount: 0 });
    }

    // Find the index of the target step in the answers timeline
    const targetIdx = answers.findIndex((a) => a.step_key === body.toStepKey);
    if (targetIdx < 0) {
      // Step not found in answers - might be a step without a fieldKey (welcome, etc.)
      // Delete nothing, just acknowledge
      return NextResponse.json({ ok: true, deletedCount: 0 });
    }

    // Delete all answers from the target step onward
    const toDelete = answers.slice(targetIdx).map((a) => a.id);

    if (toDelete.length > 0) {
      const { error } = await supabaseAdmin
        .from("lead_session_answers")
        .delete()
        .in("id", toDelete);

      if (error) throw error;
    }

    // Update session activity
    await supabaseAdmin
      .from("lead_sessions")
      .update({ last_activity_at: new Date().toISOString() })
      .eq("id", body.sessionId);

    return NextResponse.json({
      ok: true,
      deletedCount: toDelete.length,
      revertedTo: body.toStepKey,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
