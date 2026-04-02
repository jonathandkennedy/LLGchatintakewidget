"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function createDefaultFlowAction(formData: FormData) {
  const clientId = String(formData.get("clientId") ?? "");
  if (!clientId) return;

  // Check if flow already exists
  const { data: existing } = await supabaseAdmin
    .from("widget_flows")
    .select("id")
    .eq("client_id", clientId)
    .eq("is_default", true)
    .maybeSingle();

  if (existing) return;

  const { data: flow, error: flowError } = await supabaseAdmin
    .from("widget_flows")
    .insert({ client_id: clientId, name: "Default Intake Flow", status: "published", version: 1, is_default: true })
    .select("id")
    .single();

  if (flowError || !flow) throw flowError ?? new Error("Failed to create flow");

  // Insert default steps
  const defaultSteps = [
    { step_key: "welcome", step_type: "welcome", title: "Injured in an accident?", description: "Answer a few quick questions so we can connect you with our team.", sort_order: 0, config_json: { next: "matter_type" } },
    { step_key: "matter_type", step_type: "single_select", title: "What kind of matter can we help with?", field_key: "matter_type", is_required: true, sort_order: 1, config_json: { next: "incident_summary" } },
    { step_key: "incident_summary", step_type: "long_text", title: "Could you briefly explain what happened?", field_key: "incident_summary", is_required: true, sort_order: 2, config_json: { next: "injury_status", placeholder: "Example: I was rear-ended at a stop light..." } },
    { step_key: "injury_status", step_type: "single_select", title: "Did you suffer any injuries?", field_key: "injury_status", is_required: true, sort_order: 3, config_json: {} },
    { step_key: "injury_areas", step_type: "multi_select", title: "What injuries are you experiencing?", field_key: "injury_areas", is_required: true, sort_order: 4, config_json: { next: "medical_treatment_status" } },
    { step_key: "medical_treatment_status", step_type: "single_select", title: "Did you receive medical treatment?", field_key: "medical_treatment_status", is_required: true, sort_order: 5, config_json: { next: "incident_state" } },
    { step_key: "incident_state", step_type: "dropdown", title: "In what state did the accident happen?", field_key: "incident_state", is_required: true, sort_order: 6, config_json: { next: "incident_city" } },
    { step_key: "incident_city", step_type: "short_text", title: "What city did it happen in?", field_key: "incident_city", is_required: true, sort_order: 7, config_json: { next: "incident_date_range" } },
    { step_key: "incident_date_range", step_type: "single_select", title: "When did the accident occur?", field_key: "incident_date_range", is_required: true, sort_order: 8, config_json: { next: "full_name" } },
    { step_key: "full_name", step_type: "name", title: "What's your full name?", is_required: true, sort_order: 9, config_json: { next: "phone" } },
    { step_key: "phone", step_type: "phone", title: "Best phone number to reach you?", field_key: "phone", is_required: true, sort_order: 10, config_json: { next: "email" } },
    { step_key: "email", step_type: "email", title: "What's your email address?", field_key: "email", is_required: false, sort_order: 11, config_json: { next: "additional_notes" } },
    { step_key: "additional_notes", step_type: "textarea_optional", title: "Anything else you'd like us to know?", field_key: "additional_notes", is_required: false, sort_order: 12, config_json: { next: "transfer_ready" } },
    { step_key: "transfer_ready", step_type: "transfer_ready", title: "Great — let's connect you with our team now.", description: "Tap below and we'll connect your call.", sort_order: 13, config_json: { next: "connecting" } },
  ];

  const stepsToInsert = defaultSteps.map((s) => ({ flow_id: flow.id, ...s }));
  await supabaseAdmin.from("widget_steps").insert(stepsToInsert);

  // Insert default options for select steps
  const { data: insertedSteps } = await supabaseAdmin
    .from("widget_steps")
    .select("id, step_key")
    .eq("flow_id", flow.id);

  if (insertedSteps) {
    const stepIdMap = new Map(insertedSteps.map((s) => [s.step_key, s.id]));

    const options = [
      ...[
        { key: "car_accident", label: "Car accident" },
        { key: "truck_accident", label: "Truck accident" },
        { key: "motorcycle_accident", label: "Motorcycle accident" },
        { key: "slip_fall", label: "Slip and fall" },
        { key: "wrongful_death", label: "Wrongful death" },
        { key: "other_injury", label: "Other injury" },
      ].map((o, i) => ({ step_id: stepIdMap.get("matter_type")!, option_key: o.key, label: o.label, sort_order: i })),

      ...[
        { key: "yes_injured", label: "Yes, I'm injured" },
        { key: "someone_else_injured", label: "Someone else was injured" },
        { key: "no_injuries", label: "No injuries" },
        { key: "not_sure", label: "Not sure yet" },
      ].map((o, i) => ({ step_id: stepIdMap.get("injury_status")!, option_key: o.key, label: o.label, sort_order: i })),

      ...[
        { key: "back_neck", label: "Back / neck" },
        { key: "head", label: "Head" },
        { key: "shoulder_arm", label: "Shoulder / arm" },
        { key: "hip_leg", label: "Hip / leg" },
        { key: "cuts_bruising", label: "Cuts / bruising" },
        { key: "emotional_distress", label: "Emotional distress" },
        { key: "other", label: "Other" },
      ].map((o, i) => ({ step_id: stepIdMap.get("injury_areas")!, option_key: o.key, label: o.label, sort_order: i })),

      ...[
        { key: "yes", label: "Yes" },
        { key: "no", label: "No" },
        { key: "scheduled", label: "Appointment scheduled" },
        { key: "not_yet", label: "Not yet" },
      ].map((o, i) => ({ step_id: stepIdMap.get("medical_treatment_status")!, option_key: o.key, label: o.label, sort_order: i })),

      ...[
        { key: "today", label: "Today" },
        { key: "last_7_days", label: "Within the last week" },
        { key: "last_30_days", label: "Within the last month" },
        { key: "last_12_months", label: "Within the last year" },
        { key: "over_1_year", label: "More than a year ago" },
      ].map((o, i) => ({ step_id: stepIdMap.get("incident_date_range")!, option_key: o.key, label: o.label, sort_order: i })),
    ];

    await supabaseAdmin.from("widget_step_options").insert(options);

    // Insert branch rules for injury_status
    const injuryStatusKey = "injury_status";
    await supabaseAdmin.from("widget_branches").insert([
      { flow_id: flow.id, from_step_key: injuryStatusKey, to_step_key: "injury_areas", priority: 1, condition_json: { fieldKey: "injury_status", operator: "in", value: ["yes_injured", "someone_else_injured"] } },
      { flow_id: flow.id, from_step_key: injuryStatusKey, to_step_key: "incident_state", priority: 2, condition_json: { fieldKey: "injury_status", operator: "in", value: ["no_injuries", "not_sure"] } },
    ]);
  }

  revalidatePath("/admin/flow-editor");
}

export async function updateStepAction(formData: FormData) {
  const stepId = String(formData.get("stepId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const isRequired = formData.get("isRequired") === "on";
  const titleEs = String(formData.get("title_es") ?? "").trim();
  const descriptionEs = String(formData.get("description_es") ?? "").trim();
  const placeholder = String(formData.get("placeholder") ?? "").trim();
  const placeholderEs = String(formData.get("placeholder_es") ?? "").trim();

  if (!stepId || !title) return;

  // Build config JSON with translations
  const { data: existing } = await supabaseAdmin
    .from("widget_steps")
    .select("config_json")
    .eq("id", stepId)
    .single();

  const config = (existing?.config_json as Record<string, unknown>) ?? {};
  if (titleEs) config.title_es = titleEs;
  else delete config.title_es;
  if (descriptionEs) config.description_es = descriptionEs;
  else delete config.description_es;
  if (placeholder) config.placeholder = placeholder;
  else delete config.placeholder;
  if (placeholderEs) config.placeholder_es = placeholderEs;
  else delete config.placeholder_es;

  await supabaseAdmin.from("widget_steps").update({
    title,
    description: description || null,
    is_required: isRequired,
    config_json: config,
  }).eq("id", stepId);

  revalidatePath("/admin/flow-editor");
}

export async function addStepAction(formData: FormData) {
  const flowId = String(formData.get("flowId") ?? "");
  const stepKey = String(formData.get("stepKey") ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  const stepType = String(formData.get("stepType") ?? "short_text");
  const title = String(formData.get("title") ?? "").trim();
  const fieldKey = String(formData.get("fieldKey") ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  const afterStepId = String(formData.get("afterStepId") ?? "");

  if (!flowId || !stepKey || !title) return;

  // Get current max sort order
  const { data: steps } = await supabaseAdmin
    .from("widget_steps")
    .select("id, sort_order")
    .eq("flow_id", flowId)
    .order("sort_order", { ascending: false })
    .limit(1);

  let sortOrder = (steps?.[0]?.sort_order ?? 0) + 1;

  // If inserting after a specific step, shift others down
  if (afterStepId) {
    const { data: afterStep } = await supabaseAdmin
      .from("widget_steps")
      .select("sort_order")
      .eq("id", afterStepId)
      .single();

    if (afterStep) {
      sortOrder = afterStep.sort_order + 1;
      // Shift all steps after this one
      const { data: toShift } = await supabaseAdmin
        .from("widget_steps")
        .select("id, sort_order")
        .eq("flow_id", flowId)
        .gte("sort_order", sortOrder);

      if (toShift) {
        for (const s of toShift) {
          await supabaseAdmin.from("widget_steps").update({ sort_order: s.sort_order + 1 }).eq("id", s.id);
        }
      }
    }
  }

  await supabaseAdmin.from("widget_steps").insert({
    flow_id: flowId,
    step_key: stepKey,
    step_type: stepType,
    title,
    field_key: fieldKey || null,
    is_required: false,
    sort_order: sortOrder,
    config_json: {},
  });

  revalidatePath("/admin/flow-editor");
}

export async function updateOptionAction(formData: FormData) {
  const optionId = String(formData.get("optionId") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const labelEs = String(formData.get("label_es") ?? "").trim();

  if (!optionId || !label) return;

  await supabaseAdmin.from("widget_step_options").update({
    label,
    label_es: labelEs || null,
  }).eq("id", optionId);

  revalidatePath("/admin/flow-editor");
}

export async function deleteStepAction(formData: FormData) {
  const stepId = String(formData.get("stepId") ?? "");
  if (!stepId) return;
  await supabaseAdmin.from("widget_steps").delete().eq("id", stepId);
  revalidatePath("/admin/flow-editor");
}

export async function moveStepAction(formData: FormData) {
  const stepId = String(formData.get("stepId") ?? "");
  const direction = String(formData.get("direction") ?? "");
  const flowId = String(formData.get("flowId") ?? "");
  if (!stepId || !flowId) return;

  const { data: steps } = await supabaseAdmin
    .from("widget_steps")
    .select("id, sort_order")
    .eq("flow_id", flowId)
    .order("sort_order");

  if (!steps) return;

  const idx = steps.findIndex((s) => s.id === stepId);
  if (idx < 0) return;

  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= steps.length) return;

  const currentOrder = steps[idx].sort_order;
  const swapOrder = steps[swapIdx].sort_order;

  await Promise.all([
    supabaseAdmin.from("widget_steps").update({ sort_order: swapOrder }).eq("id", steps[idx].id),
    supabaseAdmin.from("widget_steps").update({ sort_order: currentOrder }).eq("id", steps[swapIdx].id),
  ]);

  revalidatePath("/admin/flow-editor");
}
