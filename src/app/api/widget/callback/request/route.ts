import { NextResponse } from "next/server";
import { markLeadCallbackPending } from "@/lib/widget/session";
import { readJsonBody } from "@/lib/utils/json";

type CallbackBody = { leadId: string };

export async function POST(request: Request) {
  try {
    const body = await readJsonBody<CallbackBody>(request);
    await markLeadCallbackPending(body.leadId);
    return NextResponse.json({ ok: true, status: "callback_pending" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
