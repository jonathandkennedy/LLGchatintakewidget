import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminAuth } from "@/lib/auth/api-auth";

export async function GET(request: NextRequest) {
  const authError = requireAdminAuth();
  if (authError) return authError;

  const leadId = request.nextUrl.searchParams.get("leadId");
  if (!leadId) return NextResponse.json({ error: "leadId required" }, { status: 400 });

  const { data } = await supabaseAdmin
    .from("lead_notes")
    .select("id, lead_id, author, content, created_at")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  return NextResponse.json({ notes: data ?? [] });
}

export async function POST(request: NextRequest) {
  const authError = requireAdminAuth();
  if (authError) return authError;

  try {
    const body = await request.json();
    const { leadId, content, author } = body as { leadId: string; content: string; author?: string };

    if (!leadId || !content?.trim()) {
      return NextResponse.json({ error: "leadId and content required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("lead_notes")
      .insert({
        lead_id: leadId,
        author: author ?? "Admin",
        content: content.trim(),
      })
      .select("id, lead_id, author, content, created_at")
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, note: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
