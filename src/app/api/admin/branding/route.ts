import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminAuth } from "@/lib/auth/api-auth";

export async function POST(request: Request) {
  const authError = requireAdminAuth();
  if (authError) return authError;

  try {
    const formData = await request.formData();
    const clientId = String(formData.get("clientId") ?? "");
    if (!clientId) {
      return NextResponse.json({ error: "clientId required" }, { status: 400 });
    }

    const payload = {
      logo_url: String(formData.get("logoUrl") ?? "").trim() || null,
      avatar_url: String(formData.get("avatarUrl") ?? "").trim() || null,
      welcome_video_url: String(formData.get("welcomeVideoUrl") ?? "").trim() || null,
      primary_color: String(formData.get("primaryColor") ?? "#2563eb"),
      accent_color: String(formData.get("accentColor") ?? "").trim() || null,
      widget_title: String(formData.get("widgetTitle") ?? "Free Case Review"),
      welcome_headline: String(formData.get("welcomeHeadline") ?? ""),
      welcome_body: String(formData.get("welcomeBody") ?? ""),
      privacy_url: String(formData.get("privacyUrl") ?? "").trim() || null,
      terms_url: String(formData.get("termsUrl") ?? "").trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin
      .from("client_branding")
      .upsert({ client_id: clientId, ...payload }, { onConflict: "client_id" });

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
