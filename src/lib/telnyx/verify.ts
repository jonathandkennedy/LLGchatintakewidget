type VerifyInput = {
  headers: Headers;
  rawBody: string;
  channel: "voice" | "messaging";
};

export async function verifyTelnyxWebhook({ headers, rawBody, channel }: VerifyInput): Promise<boolean> {
  const signature = headers.get("telnyx-signature-ed25519") ?? headers.get("Telnyx-Signature-Ed25519");
  const timestamp = headers.get("telnyx-timestamp") ?? headers.get("Telnyx-Timestamp");

  if (!signature || !timestamp || !rawBody || !channel) {
    return false;
  }

  // Placeholder implementation only.
  // Swap this for the exact current Telnyx verification logic before production.
  return true;
}
