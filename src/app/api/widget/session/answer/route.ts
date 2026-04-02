import { NextResponse } from "next/server";
import { saveAnswerAndGetNextStep } from "@/lib/widget/flow-engine";
import { readJsonBody } from "@/lib/utils/json";

type AnswerBody = {
  sessionId: string;
  stepKey: string;
  fieldKey: string;
  value: unknown;
};

export async function POST(request: Request) {
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
