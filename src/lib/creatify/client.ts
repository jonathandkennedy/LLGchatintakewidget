/**
 * Creatify AI API client.
 * Handles Aurora avatar video generation and text-to-speech.
 */

const BASE_URL = "https://api.creatify.ai/api";

function getHeaders(): Record<string, string> {
  const apiId = process.env.CREATIFY_API_ID;
  const apiKey = process.env.CREATIFY_API_KEY;

  if (!apiId || !apiKey) {
    throw new Error("CREATIFY_API_ID and CREATIFY_API_KEY are required");
  }

  return {
    "X-API-ID": apiId,
    "X-API-KEY": apiKey,
  };
}

// ============================================================
// Types
// ============================================================

export type CreatifyJobStatus = "pending" | "in_queue" | "running" | "failed" | "done";

export type CreatifyJob = {
  id: string;
  status: CreatifyJobStatus;
  output: string | null;
  credits_used: number | null;
  duration: string | null;
  failed_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type Voice = {
  id: string;
  name: string;
  gender: string;
  accents: Array<{
    id: string;
    name: string;
    preview_url: string;
  }>;
};

// ============================================================
// Text-to-Speech
// ============================================================

export async function textToSpeech(script: string, accentId?: string): Promise<CreatifyJob> {
  const formData = new FormData();
  formData.append("script", script);
  if (accentId) formData.append("accent", accentId);

  const response = await fetch(`${BASE_URL}/text_to_speech/`, {
    method: "POST",
    headers: getHeaders(),
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Creatify TTS failed (${response.status}): ${text}`);
  }

  return response.json();
}

// ============================================================
// Aurora Avatar Video
// ============================================================

export async function createAuroraVideo(
  imageBuffer: Buffer,
  imageFilename: string,
  audioBuffer: Buffer,
  audioFilename: string,
  options?: {
    name?: string;
    model?: "aurora_v1" | "aurora_v1_fast";
    webhookUrl?: string;
  },
): Promise<CreatifyJob> {
  // Build multipart boundary manually to avoid Blob/File issues in Next.js webpack
  const boundary = "----CreatifyBoundary" + Date.now();
  const parts: Buffer[] = [];

  function addFilePart(name: string, buffer: Buffer, filename: string, contentType = "application/octet-stream") {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`));
    parts.push(buffer);
    parts.push(Buffer.from("\r\n"));
  }

  function addFieldPart(name: string, value: string) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`));
  }

  addFilePart("image", imageBuffer, imageFilename, "image/jpeg");
  addFilePart("audio", audioBuffer, audioFilename, "audio/mpeg");
  if (options?.name) addFieldPart("name", options.name);
  if (options?.model) addFieldPart("model", options.model);
  if (options?.webhookUrl) addFieldPart("webhook_url", options.webhookUrl);
  parts.push(Buffer.from(`--${boundary}--\r\n`));

  const body = Buffer.concat(parts);

  const response = await fetch(`${BASE_URL}/aurora/`, {
    method: "POST",
    headers: {
      ...getHeaders(),
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Creatify Aurora failed (${response.status}): ${text}`);
  }

  return response.json();
}

// ============================================================
// Job Status Polling
// ============================================================

export async function getJobStatus(jobId: string, endpoint: "aurora" | "text_to_speech"): Promise<CreatifyJob> {
  const response = await fetch(`${BASE_URL}/${endpoint}/${jobId}/`, {
    method: "GET",
    headers: getHeaders(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Creatify status check failed (${response.status}): ${text}`);
  }

  return response.json();
}

/**
 * Poll a job until it completes or fails.
 * @param maxWaitMs Maximum wait time (default 5 minutes)
 * @param intervalMs Poll interval (default 5 seconds)
 */
export async function pollJobUntilDone(
  jobId: string,
  endpoint: "aurora" | "text_to_speech",
  maxWaitMs = 5 * 60 * 1000,
  intervalMs = 5000,
): Promise<CreatifyJob> {
  const start = Date.now();

  while (Date.now() - start < maxWaitMs) {
    const job = await getJobStatus(jobId, endpoint);

    if (job.status === "done") return job;
    if (job.status === "failed") throw new Error(`Job failed: ${job.failed_reason ?? "Unknown reason"}`);

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Job timed out after " + Math.round(maxWaitMs / 1000) + " seconds");
}

// ============================================================
// Available Voices
// ============================================================

export async function getVoices(): Promise<Voice[]> {
  const response = await fetch(`${BASE_URL}/voices/`, {
    method: "GET",
    headers: getHeaders(),
  });

  if (!response.ok) return [];
  return response.json();
}
