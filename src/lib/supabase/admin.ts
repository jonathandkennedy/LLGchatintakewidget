import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    // Graceful fallback so the build doesn't crash when env vars are missing.
    // API calls will fail at runtime but static pages will still render.
    console.warn("[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    client = createClient("https://placeholder.supabase.co", "placeholder-key", {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return client;
  }

  client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return client;
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const liveClient = getSupabaseAdmin();
    const value = Reflect.get(liveClient, prop);
    return typeof value === "function" ? value.bind(liveClient) : value;
  },
});
