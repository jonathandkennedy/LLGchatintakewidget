import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminAuth } from "@/lib/auth/api-auth";
import { logAudit } from "@/lib/monitoring/audit";

export async function POST(request: Request) {
  const authError = requireAdminAuth();
  if (authError) return authError;

  try {
    const body = await request.json();

    if (body.action === "create_client") {
      const { name, slug } = body;
      if (!name || !slug) return NextResponse.json({ error: "Name and slug required" }, { status: 400 });

      const { data, error } = await supabaseAdmin
        .from("clients")
        .insert({ name, slug, is_active: true })
        .select("id")
        .single();

      if (error) throw error;
      logAudit({ action: "flow.created", actor: "admin", resourceType: "client", resourceId: data.id, details: { name, slug } });
      return NextResponse.json({ ok: true, clientId: data.id });
    }

    if (body.action === "save_branding") {
      const { clientId, primaryColor, headline, body: welcomeBody } = body;
      if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

      await supabaseAdmin.from("client_branding").upsert({
        client_id: clientId,
        primary_color: primaryColor ?? "#2563eb",
        widget_title: "Free Case Review",
        welcome_headline: headline ?? "",
        welcome_body: welcomeBody ?? "",
      }, { onConflict: "client_id" });

      return NextResponse.json({ ok: true });
    }

    if (body.action === "create_flow") {
      const { clientId } = body;
      if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

      // Check existing
      const { data: existing } = await supabaseAdmin.from("widget_flows").select("id").eq("client_id", clientId).eq("is_default", true).maybeSingle();
      if (existing) return NextResponse.json({ ok: true, flowId: existing.id });

      const { data: flow, error: flowError } = await supabaseAdmin
        .from("widget_flows")
        .insert({ client_id: clientId, name: "Default Intake Flow", status: "published", version: 1, is_default: true })
        .select("id")
        .single();

      if (flowError || !flow) throw flowError ?? new Error("Failed");

      // Insert default steps (simplified)
      const steps = [
        { step_key: "welcome", step_type: "welcome", title: "Injured in an accident?", sort_order: 0, config_json: { next: "matter_type" } },
        { step_key: "matter_type", step_type: "single_select", title: "What kind of matter can we help with?", field_key: "matter_type", is_required: true, sort_order: 1, config_json: { next: "incident_summary" } },
        { step_key: "incident_summary", step_type: "long_text", title: "Could you briefly explain what happened?", field_key: "incident_summary", is_required: true, sort_order: 2, config_json: { next: "full_name" } },
        { step_key: "full_name", step_type: "name", title: "What's your full name?", is_required: true, sort_order: 3, config_json: { next: "phone" } },
        { step_key: "phone", step_type: "phone", title: "Best phone number to reach you?", field_key: "phone", is_required: true, sort_order: 4, config_json: { next: "email" } },
        { step_key: "email", step_type: "email", title: "What's your email?", field_key: "email", sort_order: 5, config_json: { next: "transfer_ready" } },
        { step_key: "transfer_ready", step_type: "transfer_ready", title: "Let's connect you with our team.", sort_order: 6, config_json: { next: "connecting" } },
      ];

      await supabaseAdmin.from("widget_steps").insert(steps.map((s) => ({ flow_id: flow.id, ...s })));
      return NextResponse.json({ ok: true, flowId: flow.id });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
