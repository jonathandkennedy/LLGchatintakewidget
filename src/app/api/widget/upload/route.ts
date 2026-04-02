import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/middleware/rate-limit";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];

export async function POST(request: Request) {
  const limited = checkRateLimit(request, "widget/upload");
  if (limited) return limited;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const sessionId = String(formData.get("sessionId") ?? "");
    const fieldKey = String(formData.get("fieldKey") ?? "file_upload");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large. Maximum size is 10MB." }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "File type not allowed. Use JPEG, PNG, WebP, HEIC, or PDF." }, { status: 400 });
    }

    // Generate a unique filename
    const ext = file.name.split(".").pop() ?? "bin";
    const filename = `${sessionId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    // Upload to Supabase Storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from("lead-uploads")
      .upload(filename, buffer, {
        contentType: file.type,
        cacheControl: "3600",
      });

    if (uploadError) {
      // If bucket doesn't exist, store metadata only
      console.error("[upload] Storage error:", uploadError.message);

      // Save reference in answers table even without storage
      await supabaseAdmin.from("lead_session_answers").upsert({
        session_id: sessionId,
        step_key: "file_upload",
        field_key: fieldKey,
        value_json: {
          filename: file.name,
          size: file.size,
          type: file.type,
          status: "metadata_only",
          error: uploadError.message,
        },
        updated_at: new Date().toISOString(),
      }, { onConflict: "session_id,field_key" });

      return NextResponse.json({
        ok: true,
        filename: file.name,
        size: file.size,
        status: "metadata_only",
      });
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from("lead-uploads")
      .getPublicUrl(uploadData.path);

    const fileUrl = urlData.publicUrl;

    // Save file reference in session answers
    await supabaseAdmin.from("lead_session_answers").upsert({
      session_id: sessionId,
      step_key: "file_upload",
      field_key: fieldKey,
      value_json: {
        filename: file.name,
        size: file.size,
        type: file.type,
        url: fileUrl,
        path: uploadData.path,
        status: "uploaded",
      },
      updated_at: new Date().toISOString(),
    }, { onConflict: "session_id,field_key" });

    return NextResponse.json({
      ok: true,
      filename: file.name,
      size: file.size,
      url: fileUrl,
      status: "uploaded",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    );
  }
}
