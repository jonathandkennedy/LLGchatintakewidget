import { NextResponse } from "next/server";
import { createLeadSession } from "@/lib/widget/session";
import { readJsonBody } from "@/lib/utils/json";
import { checkRateLimit } from "@/lib/middleware/rate-limit";

type StartSessionBody = {
  clientId: string;
  flowId?: string;
  landingPageUrl?: string;
  referrerUrl?: string;
  utm?: Record<string, string | undefined>;
  deviceType?: string;
};

export async function POST(request: Request) {
  const limited = checkRateLimit(request, "widget/session/start");
  if (limited) return limited;

  try {
    const body = await readJsonBody<StartSessionBody>(request);
    const session = await createLeadSession(body);
    return NextResponse.json({ sessionId: session.id, status: session.status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
