import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminAuth } from "@/lib/auth/api-auth";

export async function GET(request: Request) {
  const authError = requireAdminAuth();
  if (authError) return authError;

  const url = new URL(request.url);
  const leadId = url.searchParams.get("leadId");
  if (!leadId) return NextResponse.json({ error: "leadId required" }, { status: 400 });

  const { data } = await supabaseAdmin
    .from("lead_tags")
    .select("id, tag, color, created_at")
    .eq("lead_id", leadId)
    .order("created_at");

  return NextResponse.json({ tags: data ?? [] });
}

export async function POST(request: Request) {
  const authError = requireAdminAuth();
  if (authError) return authError;

  try {
    const { leadId, tag, color } = await request.json();
    if (!leadId || !tag?.trim()) return NextResponse.json({ error: "leadId and tag required" }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from("lead_tags")
      .insert({ lead_id: leadId, tag: tag.trim(), color: color ?? "blue" })
      .select("id, tag, color, created_at")
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, tag: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const authError = requireAdminAuth();
  if (authError) return authError;

  const url = new URL(request.url);
  const tagId = url.searchParams.get("tagId");
  if (!tagId) return NextResponse.json({ error: "tagId required" }, { status: 400 });

  await supabaseAdmin.from("lead_tags").delete().eq("id", tagId);
  return NextResponse.json({ ok: true });
}
