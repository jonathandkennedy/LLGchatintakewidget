import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateSession } from "./admin-auth";

const COOKIE_NAME = "intakellg_admin_session";

/**
 * Check admin auth for API routes. Returns a 401 response if not authenticated, or null if OK.
 */
export function requireAdminAuth(): NextResponse | null {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token || !validateSession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
