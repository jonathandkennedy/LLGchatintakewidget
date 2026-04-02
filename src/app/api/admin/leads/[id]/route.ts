import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminAuth } from "@/lib/auth/api-auth";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const authError = requireAdminAuth();
  if (authError) return authError;
  const { data: lead, error: leadError } = await supabaseAdmin.from("leads").select("*").eq("id", params.id).single();

  if (leadError || !lead) {
    return NextResponse.json({ error: leadError?.message ?? "Lead not found" }, { status: 404 });
  }

  const [{ data: callAttempts }, { data: smsMessages }, { data: answers }] = await Promise.all([
    supabaseAdmin.from("call_attempts").select("*").eq("lead_id", params.id).order("started_at", { ascending: false }),
    supabaseAdmin.from("sms_messages").select("*").eq("lead_id", params.id).order("created_at", { ascending: false }),
    supabaseAdmin.from("lead_session_answers").select("*").eq("session_id", lead.session_id).order("created_at", { ascending: true }),
  ]);

  return NextResponse.json({ lead, callAttempts: callAttempts ?? [], smsMessages: smsMessages ?? [], answers: answers ?? [] });
}
