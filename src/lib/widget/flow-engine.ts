import { supabaseAdmin } from "@/lib/supabase/admin";
import { getFlowById } from "@/lib/widget/config";
import { validateStepValue } from "@/lib/widget/validation";
import type { BranchCondition, WidgetFlow, WidgetStep } from "@/types/widget";

type SaveAnswerInput = {
  sessionId: string;
  stepKey: string;
  fieldKey: string;
  value: unknown;
};

type SessionRow = {
  id: string;
  flow_id: string | null;
};

function isTruthy(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value);
}

function matchesCondition(condition: BranchCondition, answers: Map<string, unknown>): boolean {
  const currentValue = answers.get(condition.fieldKey);

  switch (condition.operator) {
    case "eq":
      return currentValue === condition.value;
    case "neq":
      return currentValue !== condition.value;
    case "in":
      return Array.isArray(condition.value) && condition.value.includes(String(currentValue));
    case "not_in":
      return Array.isArray(condition.value) && !condition.value.includes(String(currentValue));
    case "is_truthy":
      return isTruthy(currentValue);
    case "is_falsy":
      return !isTruthy(currentValue);
    default:
      return false;
  }
}

function getStep(flow: WidgetFlow, stepKey: string): WidgetStep | undefined {
  return flow.steps.find((step) => step.key === stepKey);
}

async function getSession(sessionId: string): Promise<SessionRow> {
  const { data, error } = await supabaseAdmin
    .from("lead_sessions")
    .select("id, flow_id")
    .eq("id", sessionId)
    .single();

  if (error || !data) {
    throw error ?? new Error("Session not found");
  }

  return data as SessionRow;
}

async function buildAnswerMap(sessionId: string): Promise<Map<string, unknown>> {
  const { data } = await supabaseAdmin
    .from("lead_session_answers")
    .select("field_key, value_text, value_json")
    .eq("session_id", sessionId);

  const map = new Map<string, unknown>();
  for (const row of data ?? []) {
    map.set(String(row.field_key), row.value_json ?? row.value_text);
  }
  return map;
}

function computeNextStep(currentStep: WidgetStep, answers: Map<string, unknown>): string | null {
  if (currentStep.branches?.length) {
    const sortedBranches = [...currentStep.branches].sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
    for (const branch of sortedBranches) {
      const matches = branch.conditions.every((condition) => matchesCondition(condition, answers));
      if (matches) return branch.nextStepKey;
    }
  }

  return currentStep.next ?? null;
}

export async function saveAnswerAndGetNextStep(input: SaveAnswerInput) {
  const validation = validateStepValue(input.fieldKey, input.value);
  if (!validation.ok) {
    return { ok: false as const, error: "Validation failed", fieldErrors: validation.errors };
  }

  const isObjectOrArray = typeof input.value === "object" && input.value !== null;

  const { error } = await supabaseAdmin
    .from("lead_session_answers")
    .upsert(
      {
        session_id: input.sessionId,
        step_key: input.stepKey,
        field_key: input.fieldKey,
        value_text: isObjectOrArray ? null : String(input.value),
        value_json: isObjectOrArray ? input.value : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id,field_key" },
    );

  if (error) throw error;

  await supabaseAdmin
    .from("lead_sessions")
    .update({ status: "in_progress", last_activity_at: new Date().toISOString() })
    .eq("id", input.sessionId);

  const session = await getSession(input.sessionId);
  const flow = await getFlowById(session.flow_id);
  const answers = await buildAnswerMap(input.sessionId);
  const currentStep = getStep(flow, input.stepKey);
  const nextStepKey = currentStep ? computeNextStep(currentStep, answers) : null;
  const completedSteps = answers.size;
  const estimatedTotalSteps = flow.steps.filter(
    (step) => !["connected", "fallback", "callback_confirmation", "connecting"].includes(step.type),
  ).length;

  return {
    ok: true as const,
    nextStepKey,
    progress: {
      completedSteps,
      estimatedTotalSteps,
    },
  };
}
