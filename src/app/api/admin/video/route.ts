import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth/api-auth";
import { generateAndStoreVideo } from "@/lib/creatify/generate-video";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const authError = requireAdminAuth();
  if (authError) return authError;

  try {
    const formData = await request.formData();
    const clientId = String(formData.get("clientId") ?? "");
    const videoType = String(formData.get("videoType") ?? "welcome") as "welcome" | "connecting";
    const mode = String(formData.get("mode") ?? ""); // "upload" or "generate"

    if (!clientId) {
      return NextResponse.json({ error: "clientId required" }, { status: 400 });
    }

    // Mode: Direct upload
    if (mode === "upload") {
      const file = formData.get("video") as File | null;
      if (!file) return NextResponse.json({ error: "No video file" }, { status: 400 });

      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.name.split(".").pop() ?? "mp4";
      const storagePath = `videos/${clientId}/${videoType}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from("lead-uploads")
        .upload(storagePath, buffer, { contentType: file.type, cacheControl: "86400" });

      let videoUrl: string;
      if (uploadError) {
        // Fallback: store the file info but can't get URL
        return NextResponse.json({ error: "Storage upload failed: " + uploadError.message }, { status: 500 });
      }

      const { data: urlData } = supabaseAdmin.storage.from("lead-uploads").getPublicUrl(storagePath);
      videoUrl = urlData.publicUrl;

      // Save to branding
      const field = videoType === "welcome" ? "welcome_video_url" : "connecting_video_url";
      await supabaseAdmin.from("client_branding").update({ [field]: videoUrl, updated_at: new Date().toISOString() }).eq("client_id", clientId);

      return NextResponse.json({ ok: true, videoUrl, mode: "upload" });
    }

    // Mode: Generate via Creatify
    if (mode === "generate") {
      const imageFile = formData.get("image") as File | null;
      const audioFile = formData.get("audio") as File | null;
      const script = String(formData.get("script") ?? "").trim();
      const accentId = String(formData.get("accentId") ?? "").trim() || undefined;
      const useFast = formData.get("useFast") === "true";

      if (!imageFile) return NextResponse.json({ error: "Photo is required" }, { status: 400 });
      if (!audioFile && !script) return NextResponse.json({ error: "Either audio file or script text is required" }, { status: 400 });

      const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
      const audioBuffer = audioFile ? Buffer.from(await audioFile.arrayBuffer()) : undefined;

      const result = await generateAndStoreVideo({
        clientId,
        videoType,
        imageBuffer,
        imageFilename: imageFile.name,
        audioBuffer,
        audioFilename: audioFile?.name,
        script: audioFile ? undefined : script,
        accentId,
        useFastModel: useFast,
      });

      return NextResponse.json({
        ok: true,
        videoUrl: result.videoUrl,
        creditsUsed: result.creditsUsed,
        duration: result.duration,
        mode: "generate",
      });
    }

    return NextResponse.json({ error: "Invalid mode. Use 'upload' or 'generate'" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Video generation failed" }, { status: 500 });
  }
}
