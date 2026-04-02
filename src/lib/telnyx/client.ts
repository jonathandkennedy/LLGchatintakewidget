const TELNYX_API_BASE = "https://api.telnyx.com/v2";

export async function telnyxFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const apiKey = process.env.TELNYX_API_KEY;
  if (!apiKey) throw new Error("Missing TELNYX_API_KEY");

  const response = await fetch(`${TELNYX_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Telnyx API error ${response.status}: ${text}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
}
