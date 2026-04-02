import { NextResponse } from "next/server";
import { trackWidgetEvent } from "@/lib/widget/tracking";
import { readJsonBody } from "@/lib/utils/json";
import { checkRateLimit } from "@/lib/middleware/rate-limit";

type EventBody = {
  clientId?: string;
  sessionId?: string;
  leadId?: string;
  eventName: string;
  eventProperties?: Record<string, unknown>;
};

export async function POST(request: Request) {
  const limited = checkRateLimit(request, "widget/event");
  if (limited) return limited;

  try {
    const body = await readJsonBody<EventBody>(request);
    await trackWidgetEvent(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
