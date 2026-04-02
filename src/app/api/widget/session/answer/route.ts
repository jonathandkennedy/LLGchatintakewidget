import { NextResponse } from "next/server";
import { saveAnswerAndGetNextStep } from "@/lib/widget/flow-engine";
import { readJsonBody } from "@/lib/utils/json";
import { checkRateLimit } from "@/lib/middleware/rate-limit";

type AnswerBody = {
  sessionId: string;
  stepKey: string;
  fieldKey: string;
  value: unknown;
};

export async function POST(request: Request) {
  const limited = checkRateLimit(request, "widget/session/answer");
  if (limited) return limited;

  try {
    const body = await readJsonBody<AnswerBody>(request);
    const result = await saveAnswerAndGetNextStep(body);

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
