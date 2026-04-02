import { NextResponse } from "next/server";
import { trackWidgetEvent } from "@/lib/widget/tracking";
import { readJsonBody } from "@/lib/utils/json";

type EventBody = {
  clientId?: string;
  sessionId?: string;
  leadId?: string;
  eventName: string;
  eventProperties?: Record<string, unknown>;
};

export async function POST(request: Request) {
  try {
    const body = await readJsonBody<EventBody>(request);
    await trackWidgetEvent(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
