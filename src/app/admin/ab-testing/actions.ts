"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function createTestAction(formData: FormData) {
  const clientId = String(formData.get("clientId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!clientId || !name) return;

  const { data: test } = await supabaseAdmin
    .from("ab_tests")
    .insert({ client_id: clientId, name, status: "draft" })
    .select("id")
    .single();

  if (!test) return;

  // Create two default variants: Control (50%) and Variant B (50%)
  await supabaseAdmin.from("ab_variants").insert([
    { test_id: test.id, name: "Control (A)", flow_id: null, weight: 50 },
    { test_id: test.id, name: "Variant B", flow_id: null, weight: 50 },
  ]);

  revalidatePath("/admin/ab-testing");
}

export async function updateTestStatusAction(formData: FormData) {
  const testId = String(formData.get("testId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!testId || !status) return;

  await supabaseAdmin.from("ab_tests").update({ status }).eq("id", testId);
  revalidatePath("/admin/ab-testing");
}

export async function updateVariantAction(formData: FormData) {
  const variantId = String(formData.get("variantId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const flowId = String(formData.get("flowId") ?? "").trim() || null;
  const weight = parseInt(String(formData.get("weight") ?? "50"), 10);
  if (!variantId) return;

  await supabaseAdmin.from("ab_variants").update({
    name: name || undefined,
    flow_id: flowId,
    weight: isNaN(weight) ? 50 : weight,
  }).eq("id", variantId);

  revalidatePath("/admin/ab-testing");
}

export async function addVariantAction(formData: FormData) {
  const testId = String(formData.get("testId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!testId || !name) return;

  await supabaseAdmin.from("ab_variants").insert({
    test_id: testId,
    name,
    flow_id: null,
    weight: 50,
  });

  revalidatePath("/admin/ab-testing");
}

export async function deleteVariantAction(formData: FormData) {
  const variantId = String(formData.get("variantId") ?? "");
  if (!variantId) return;
  await supabaseAdmin.from("ab_variants").delete().eq("id", variantId);
  revalidatePath("/admin/ab-testing");
}
