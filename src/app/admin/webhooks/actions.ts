"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/monitoring/audit";

export async function createWebhookAction(formData: FormData) {
  const clientId = String(formData.get("clientId") ?? "");
  const url = String(formData.get("url") ?? "").trim();
  const secret = String(formData.get("secret") ?? "").trim();
  const events = formData.getAll("events").map(String).filter(Boolean);

  if (!clientId || !url) return;

  await supabaseAdmin.from("client_webhooks").insert({
    client_id: clientId,
    url,
    secret: secret || null,
    events: events.length > 0 ? events : null,
    is_active: true,
  });

  logAudit({ action: "webhook.configured", resourceType: "webhook", details: { url, events } });
  revalidatePath("/admin/webhooks");
}

export async function deleteWebhookAction(formData: FormData) {
  const webhookId = String(formData.get("webhookId") ?? "");
  if (!webhookId) return;
  await supabaseAdmin.from("client_webhooks").delete().eq("id", webhookId);
  revalidatePath("/admin/webhooks");
}

export async function toggleWebhookAction(formData: FormData) {
  const webhookId = String(formData.get("webhookId") ?? "");
  const isActive = formData.get("isActive") === "true";
  if (!webhookId) return;
  await supabaseAdmin.from("client_webhooks").update({ is_active: !isActive }).eq("id", webhookId);
  revalidatePath("/admin/webhooks");
}
