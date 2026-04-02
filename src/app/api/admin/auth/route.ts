import { NextResponse } from "next/server";
import { verifyAdminPassword, createSession, setSessionCookie, clearSessionCookie } from "@/lib/auth/admin-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, password } = body as { action: string; password?: string };

    if (action === "login") {
      if (!password || !verifyAdminPassword(password)) {
        return NextResponse.json({ error: "Invalid password" }, { status: 401 });
      }
      const token = createSession();
      setSessionCookie(token);
      return NextResponse.json({ ok: true });
    }

    if (action === "logout") {
      clearSessionCookie();
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
