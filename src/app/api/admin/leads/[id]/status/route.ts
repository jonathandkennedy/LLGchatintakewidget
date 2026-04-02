import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminAuth } from "@/lib/auth/api-auth";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const authError = requireAdminAuth();
  if (authError) return authError;
  const body = await request.json().catch(() => ({}));
  const status = typeof body.status === "string" ? body.status : "";

  if (!status) {
    return NextResponse.json({ error: "status is required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("leads")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .select("id, status")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Failed to update status" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, lead: data });
}
