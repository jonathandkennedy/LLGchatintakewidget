"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function createClientAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const slug = slugify(name);

  const { data: client, error } = await supabaseAdmin
    .from("clients")
    .insert({ name, slug, status: "active" })
    .select("id")
    .single();

  if (error) throw error;

  // Create default branding
  await supabaseAdmin.from("client_branding").insert({
    client_id: client.id,
    primary_color: "#2563eb",
    accent_color: "#7dd3fc",
    widget_title: "Free Case Review",
    welcome_headline: "Injured in an accident?",
    welcome_body: "Answer a few quick questions so we can connect you with our team.",
  });

  // Create default fallback settings
  await supabaseAdmin.from("fallback_settings").insert({
    client_id: client.id,
    voicemail_enabled: true,
    whisper_enabled: true,
    record_calls: true,
    sms_fallback_enabled: true,
    sms_fallback_message: "We received your request and will call you back as soon as possible.",
    callback_message: "New website intake lead",
  });

  revalidatePath("/admin/clients");
  redirect(`/admin/clients/${client.id}`);
}

export async function updateClientAction(formData: FormData) {
  const clientId = String(formData.get("clientId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const status = String(formData.get("status") ?? "active");

  if (!clientId || !name) return;

  await supabaseAdmin
    .from("clients")
    .update({ name, status, updated_at: new Date().toISOString() })
    .eq("id", clientId);

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin/clients");
}

export async function updateBrandingAction(formData: FormData) {
  const clientId = String(formData.get("clientId") ?? "");
  if (!clientId) return;

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

  await supabaseAdmin
    .from("client_branding")
    .upsert({ client_id: clientId, ...payload }, { onConflict: "client_id" });

  revalidatePath(`/admin/branding`);
  revalidatePath(`/admin/clients/${clientId}`);
}

export async function updateRoutingAction(formData: FormData) {
  const clientId = String(formData.get("clientId") ?? "");
  const ruleId = String(formData.get("ruleId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "America/Los_Angeles");
  const daysRaw = formData.getAll("days").map(Number);
  const startTime = String(formData.get("startTime") ?? "09:00");
  const endTime = String(formData.get("endTime") ?? "17:00");
  const destination = String(formData.get("destinationNumber") ?? "").trim();
  const priority = Number(formData.get("priority") ?? 100);

  if (!clientId || !name || !destination) return;

  const payload = {
    client_id: clientId,
    name,
    timezone,
    days_of_week: daysRaw.length ? daysRaw : [1, 2, 3, 4, 5],
    start_time_local: startTime + ":00",
    end_time_local: endTime + ":00",
    destination_number_e164: destination,
    priority,
    is_active: true,
  };

  if (ruleId) {
    await supabaseAdmin.from("routing_rules").update(payload).eq("id", ruleId);
  } else {
    await supabaseAdmin.from("routing_rules").insert(payload);
  }

  revalidatePath("/admin/routing");
}

export async function deleteRoutingRuleAction(formData: FormData) {
  const ruleId = String(formData.get("ruleId") ?? "");
  if (!ruleId) return;
  await supabaseAdmin.from("routing_rules").delete().eq("id", ruleId);
  revalidatePath("/admin/routing");
}

export async function updateFallbackSettingsAction(formData: FormData) {
  const clientId = String(formData.get("clientId") ?? "");
  if (!clientId) return;

  await supabaseAdmin.from("fallback_settings").upsert({
    client_id: clientId,
    voicemail_enabled: formData.get("voicemailEnabled") === "on",
    whisper_enabled: formData.get("whisperEnabled") === "on",
    record_calls: formData.get("recordCalls") === "on",
    sms_fallback_enabled: formData.get("smsFallbackEnabled") === "on",
    sms_fallback_message: String(formData.get("smsFallbackMessage") ?? ""),
    callback_message: String(formData.get("callbackMessage") ?? ""),
    updated_at: new Date().toISOString(),
  }, { onConflict: "client_id" });

  revalidatePath("/admin/routing");
}

export async function addPhoneNumberAction(formData: FormData) {
  const clientId = String(formData.get("clientId") ?? "");
  const phone = String(formData.get("phoneNumber") ?? "").trim();
  if (!clientId || !phone) return;

  await supabaseAdmin.from("client_phone_numbers").insert({
    client_id: clientId,
    phone_number_e164: phone,
    provider: "telnyx",
    voice_enabled: true,
    sms_enabled: true,
    is_primary: true,
  });

  revalidatePath("/admin/routing");
}
