/**
 * Video generation orchestrator.
 * Handles the full flow: TTS (optional) → Aurora → Download → Upload to Supabase.
 */

import { supabaseAdmin } from "@/lib/supabase/admin";
import { textToSpeech, createAuroraVideo, pollJobUntilDone } from "./client";

type GenerateVideoInput = {
  clientId: string;
  /** "welcome" or "connecting" */
  videoType: "welcome" | "connecting";
  /** Lawyer headshot image */
  imageBuffer: Buffer;
  imageFilename: string;
  /** Either provide audio directly or a script for TTS */
  audioBuffer?: Buffer;
  audioFilename?: string;
  /** Script text - will be converted to audio via TTS if no audioBuffer */
  script?: string;
  /** Voice accent ID for TTS */
  accentId?: string;
  /** Use fast model (cheaper, lower quality) */
  useFastModel?: boolean;
};

type GenerateVideoResult = {
  videoUrl: string;
  storagePath: string;
  creditsUsed: number | null;
  duration: string | null;
};

/**
 * Generate a video from a photo + audio/script, upload to Supabase Storage,
 * and save the URL to client branding.
 */
export async function generateAndStoreVideo(input: GenerateVideoInput): Promise<GenerateVideoResult> {
  let audioBuffer = input.audioBuffer;
  let audioFilename = input.audioFilename ?? "audio.mp3";

  // Step 1: If script provided but no audio, generate TTS first
  if (!audioBuffer && input.script) {
    console.log("[creatify] Generating TTS for script...");
    const ttsJob = await textToSpeech(input.script, input.accentId);
    const completedTts = await pollJobUntilDone(ttsJob.id, "text_to_speech", 2 * 60 * 1000);

    if (!completedTts.output) throw new Error("TTS completed but no audio URL returned");

    // Download the TTS audio
    const audioResponse = await fetch(completedTts.output);
    if (!audioResponse.ok) throw new Error("Failed to download TTS audio");
    audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
    audioFilename = "tts-audio.mp3";
    console.log("[creatify] TTS complete");
  }

  if (!audioBuffer) throw new Error("Either audioBuffer or script is required");

  // Step 2: Create Aurora video
  console.log("[creatify] Creating Aurora video...");
  const auroraJob = await createAuroraVideo(
    input.imageBuffer,
    input.imageFilename,
    audioBuffer,
    audioFilename,
    {
      name: `${input.videoType}-${input.clientId}`,
      model: input.useFastModel ? "aurora_v1_fast" : "aurora_v1",
    },
  );

  // Step 3: Poll until done
  const completedVideo = await pollJobUntilDone(auroraJob.id, "aurora", 5 * 60 * 1000);
  if (!completedVideo.output) throw new Error("Video completed but no URL returned");
  console.log("[creatify] Video generated:", completedVideo.output);

  // Step 4: Download video and upload to Supabase Storage
  const videoResponse = await fetch(completedVideo.output);
  if (!videoResponse.ok) throw new Error("Failed to download generated video");
  const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());

  const storagePath = `videos/${input.clientId}/${input.videoType}-${Date.now()}.mp4`;
  const { error: uploadError } = await supabaseAdmin.storage
    .from("lead-uploads")
    .upload(storagePath, videoBuffer, {
      contentType: "video/mp4",
      cacheControl: "86400",
    });

  let videoUrl = completedVideo.output; // Fallback to Creatify URL
  if (!uploadError) {
    const { data: urlData } = supabaseAdmin.storage
      .from("lead-uploads")
      .getPublicUrl(storagePath);
    videoUrl = urlData.publicUrl;
  } else {
    console.warn("[creatify] Storage upload failed, using Creatify URL:", uploadError.message);
  }

  // Step 5: Save URL to client branding
  const brandingField = input.videoType === "welcome" ? "welcome_video_url" : "connecting_video_url";
  await supabaseAdmin
    .from("client_branding")
    .update({ [brandingField]: videoUrl, updated_at: new Date().toISOString() })
    .eq("client_id", input.clientId);

  console.log(`[creatify] ${input.videoType} video saved for client ${input.clientId}`);

  return {
    videoUrl,
    storagePath,
    creditsUsed: completedVideo.credits_used,
    duration: completedVideo.duration,
  };
}
