import { supabaseAdmin } from "@/lib/supabase/admin";
import { DEFAULT_FLOW } from "@/lib/widget/default-flow";
import { getFeatureFlag } from "@/lib/utils/env";
import type { BranchRule, StepOption, WidgetFlow, WidgetPublicConfig, WidgetStep } from "@/types/widget";

type Row = Record<string, unknown>;

type FlowStepRow = Row & {
  id: string;
  step_key: string;
  step_type: string;
  title: string;
  description?: string | null;
  field_key?: string | null;
  is_required?: boolean;
  sort_order?: number;
  config_json?: Record<string, unknown> | null;
};

type FlowOptionRow = Row & {
  step_id: string;
  option_key: string;
  label: string;
  sort_order?: number;
};

type FlowBranchRow = Row & {
  from_step_key: string;
  to_step_key: string;
  priority?: number;
  condition_json?: Record<string, unknown> | null;
};

function mapBranchCondition(raw: unknown) {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const fieldKey = typeof value.fieldKey === "string" ? value.fieldKey : null;
  const operator = typeof value.operator === "string" ? value.operator : null;

  if (!fieldKey || !operator) return null;

  return {
    fieldKey,
    operator: operator as BranchRule["conditions"][number]["operator"],
    value: value.value as string | string[] | boolean | undefined,
  };
}

function mapDbStepsToFlow(steps: FlowStepRow[], options: FlowOptionRow[], branches: FlowBranchRow[]): WidgetStep[] {
  const optionsByStepId = new Map<string, StepOption[]>();
  for (const option of options) {
    const current = optionsByStepId.get(option.step_id) ?? [];
    current.push({ key: String(option.option_key), label: String(option.label) });
    optionsByStepId.set(option.step_id, current);
  }

  const branchesByStepKey = new Map<string, BranchRule[]>();
  for (const branch of branches) {
    const conditionSource = branch.condition_json;
    const conditionList = Array.isArray(conditionSource?.conditions)
      ? conditionSource.conditions
      : conditionSource
        ? [conditionSource]
        : [];

    const conditions = conditionList
      .map(mapBranchCondition)
      .filter((item): item is NonNullable<ReturnType<typeof mapBranchCondition>> => Boolean(item));

    if (!conditions.length) continue;

    const current = branchesByStepKey.get(String(branch.from_step_key)) ?? [];
    current.push({
      conditions,
      nextStepKey: String(branch.to_step_key),
      priority: Number(branch.priority ?? 100),
    });
    branchesByStepKey.set(String(branch.from_step_key), current);
  }

  return steps
    .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
    .map((step) => {
      const config = (step.config_json && typeof step.config_json === "object") ? step.config_json : {};
      return {
        key: String(step.step_key),
        type: String(step.step_type) as WidgetStep["type"],
        title: String(step.title),
        description: step.description ? String(step.description) : undefined,
        fieldKey: step.field_key ? String(step.field_key) : undefined,
        required: Boolean(step.is_required),
        placeholder: typeof config.placeholder === "string" ? config.placeholder : undefined,
        helperText: typeof config.helperText === "string" ? config.helperText : undefined,
        options: optionsByStepId.get(String(step.id)),
        next: typeof config.next === "string" ? config.next : undefined,
        branches: branchesByStepKey.get(String(step.step_key)),
        config,
      } satisfies WidgetStep;
    });
}

export async function getFlowById(flowId?: string | null): Promise<WidgetFlow> {
  if (!flowId) return DEFAULT_FLOW;

  const [{ data: flow }, { data: steps }, { data: options }, { data: branches }] = await Promise.all([
    supabaseAdmin.from("widget_flows").select("id, version, name").eq("id", flowId).single(),
    supabaseAdmin.from("widget_steps").select("*").eq("flow_id", flowId),
    supabaseAdmin
      .from("widget_step_options")
      .select("step_id, option_key, label, sort_order, widget_steps!inner(flow_id)")
      .eq("widget_steps.flow_id", flowId),
    supabaseAdmin.from("widget_branches").select("from_step_key, to_step_key, priority, condition_json").eq("flow_id", flowId),
  ]);

  if (!flow || !steps?.length) return DEFAULT_FLOW;

  return {
    id: String(flow.id),
    version: Number(flow.version ?? 1),
    name: String(flow.name ?? "Default flow"),
    steps: mapDbStepsToFlow(
      steps as unknown as FlowStepRow[],
      (options as unknown as FlowOptionRow[] | null) ?? [],
      (branches as unknown as FlowBranchRow[] | null) ?? [],
    ),
  };
}

export async function getPublishedWidgetConfigBySlug(slug: string): Promise<WidgetPublicConfig | null> {
  try {
    const { data: client } = await supabaseAdmin
      .from("clients")
      .select("id, name, slug")
      .eq("slug", slug)
      .single();

    if (!client) {
      return getDemoConfig(slug);
    }

    const [{ data: branding }, { data: flowRow }] = await Promise.all([
      supabaseAdmin.from("client_branding").select("*").eq("client_id", client.id).single(),
      supabaseAdmin
        .from("widget_flows")
        .select("id, version, name")
        .eq("client_id", client.id)
        .eq("is_default", true)
        .single(),
    ]);

    const flow = await getFlowById(flowRow?.id ? String(flowRow.id) : null);

    return {
      clientId: String(client.id),
      clientName: String(client.name),
      branding: {
        logoUrl: branding?.logo_url ? String(branding.logo_url) : undefined,
        avatarUrl: branding?.avatar_url ? String(branding.avatar_url) : undefined,
        welcomeVideoUrl: branding?.welcome_video_url ? String(branding.welcome_video_url) : undefined,
        primaryColor: branding?.primary_color ? String(branding.primary_color) : "#2563eb",
        accentColor: branding?.accent_color ? String(branding.accent_color) : "#60a5fa",
        widgetTitle: branding?.widget_title ? String(branding.widget_title) : "Free Case Review",
        welcomeHeadline: branding?.welcome_headline ? String(branding.welcome_headline) : "Injured in an accident?",
        welcomeBody: branding?.welcome_body ? String(branding.welcome_body) : "Answer a few quick questions so we can connect you fast.",
        privacyUrl: branding?.privacy_url ? String(branding.privacy_url) : undefined,
        termsUrl: branding?.terms_url ? String(branding.terms_url) : undefined,
      },
      flow,
      features: {
        callNowEnabled: true,
        smsFallbackEnabled: getFeatureFlag("FEATURE_SMS_FALLBACK", true),
        resumeEnabled: getFeatureFlag("FEATURE_RESUME_ENABLED", true),
      },
    };
  } catch {
    return getDemoConfig(slug);
  }
}

function getDemoConfig(slug: string): WidgetPublicConfig {
  return {
    clientId: `demo-${slug}`,
    clientName: "Demo Law Firm",
    branding: {
      primaryColor: "#2563eb",
      accentColor: "#7dd3fc",
      widgetTitle: "Free Case Review",
      welcomeHeadline: "Injured in an accident?",
      welcomeBody: "Answer a few quick questions so we can connect you with our team as fast as possible.",
      privacyUrl: "#",
      termsUrl: "#",
    },
    flow: DEFAULT_FLOW,
    features: {
      callNowEnabled: true,
      smsFallbackEnabled: true,
      resumeEnabled: true,
    },
  };
}
