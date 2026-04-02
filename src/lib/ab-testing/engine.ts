import { supabaseAdmin } from "@/lib/supabase/admin";
import crypto from "crypto";

export type ABVariant = {
  id: string;
  name: string;
  flowId: string | null;
  weight: number; // 0-100 percentage
};

export type ABTest = {
  id: string;
  clientId: string;
  name: string;
  status: "draft" | "running" | "paused" | "completed";
  variants: ABVariant[];
  createdAt: string;
};

export type ABTestResults = {
  testId: string;
  testName: string;
  variants: Array<{
    id: string;
    name: string;
    sessions: number;
    completions: number;
    conversionRate: number;
  }>;
};

/**
 * Get the active A/B test for a client, if any.
 */
export async function getActiveTest(clientId: string): Promise<ABTest | null> {
  const { data: test } = await supabaseAdmin
    .from("ab_tests")
    .select("id, client_id, name, status, created_at")
    .eq("client_id", clientId)
    .eq("status", "running")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!test) return null;

  const { data: variants } = await supabaseAdmin
    .from("ab_variants")
    .select("id, name, flow_id, weight")
    .eq("test_id", test.id)
    .order("created_at");

  return {
    id: test.id,
    clientId: test.client_id,
    name: test.name,
    status: test.status,
    variants: (variants ?? []).map((v) => ({
      id: v.id,
      name: v.name,
      flowId: v.flow_id,
      weight: v.weight,
    })),
    createdAt: test.created_at,
  };
}

/**
 * Assign a visitor to a variant using weighted random selection.
 * Persists the assignment so the same session always gets the same variant.
 */
export function selectVariant(variants: ABVariant[]): ABVariant {
  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
  let random = crypto.randomInt(0, totalWeight);

  for (const variant of variants) {
    random -= variant.weight;
    if (random < 0) return variant;
  }

  return variants[variants.length - 1];
}

/**
 * Record a session assignment to a variant.
 */
export async function recordVariantAssignment(
  testId: string,
  variantId: string,
  sessionId: string,
): Promise<void> {
  await supabaseAdmin.from("ab_assignments").upsert(
    { test_id: testId, variant_id: variantId, session_id: sessionId },
    { onConflict: "session_id" },
  );
}

/**
 * Record a conversion (lead created) for a session's variant.
 */
export async function recordVariantConversion(sessionId: string): Promise<void> {
  await supabaseAdmin
    .from("ab_assignments")
    .update({ converted: true, converted_at: new Date().toISOString() })
    .eq("session_id", sessionId);
}

/**
 * Get results for a test.
 */
export async function getTestResults(testId: string): Promise<ABTestResults | null> {
  const { data: test } = await supabaseAdmin
    .from("ab_tests")
    .select("id, name")
    .eq("id", testId)
    .single();

  if (!test) return null;

  const { data: variants } = await supabaseAdmin
    .from("ab_variants")
    .select("id, name")
    .eq("test_id", testId);

  if (!variants) return null;

  const results: ABTestResults = {
    testId: test.id,
    testName: test.name,
    variants: [],
  };

  for (const variant of variants) {
    const { count: sessions } = await supabaseAdmin
      .from("ab_assignments")
      .select("*", { count: "exact", head: true })
      .eq("variant_id", variant.id);

    const { count: completions } = await supabaseAdmin
      .from("ab_assignments")
      .select("*", { count: "exact", head: true })
      .eq("variant_id", variant.id)
      .eq("converted", true);

    const s = sessions ?? 0;
    const c = completions ?? 0;

    results.variants.push({
      id: variant.id,
      name: variant.name,
      sessions: s,
      completions: c,
      conversionRate: s > 0 ? Math.round((c / s) * 1000) / 10 : 0,
    });
  }

  return results;
}

/**
 * Get all tests for a client.
 */
export async function getTestsForClient(clientId: string) {
  const { data } = await supabaseAdmin
    .from("ab_tests")
    .select("id, name, status, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  return data ?? [];
}
