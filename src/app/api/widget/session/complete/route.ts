import { NextResponse } from "next/server";
import { finalizeLeadFromSession } from "@/lib/widget/session";
import { readJsonBody } from "@/lib/utils/json";

type CompleteBody = { sessionId: string };

export async function POST(request: Request) {
  try {
    const body = await readJsonBody<CompleteBody>(request);
    const lead = await finalizeLeadFromSession(body.sessionId);
    return NextResponse.json({ ok: true, leadId: lead.id, status: lead.status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
