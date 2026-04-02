import { NextResponse } from "next/server";
import { connectLeadCall } from "@/lib/telnyx/voice";
import { readJsonBody } from "@/lib/utils/json";

type ConnectBody = {
  sessionId: string;
  leadId: string;
};

export async function POST(request: Request) {
  try {
    const body = await readJsonBody<ConnectBody>(request);
    const result = await connectLeadCall(body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
