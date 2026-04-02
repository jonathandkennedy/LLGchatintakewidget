import { NextResponse } from "next/server";
import { connectLeadCall } from "@/lib/telnyx/voice";
import { readJsonBody } from "@/lib/utils/json";
import { checkRateLimit } from "@/lib/middleware/rate-limit";

type ConnectBody = {
  sessionId: string;
  leadId: string;
};

export async function POST(request: Request) {
  const limited = checkRateLimit(request, "widget/call/connect");
  if (limited) return limited;

  try {
    const body = await readJsonBody<ConnectBody>(request);
    const result = await connectLeadCall(body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
