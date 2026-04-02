import { cookies } from "next/headers";
import crypto from "crypto";

const COOKIE_NAME = "intakellg_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24; // 24 hours

function getSecret(): string {
  return process.env.ADMIN_SESSION_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "fallback-dev-secret-change-me";
}

function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD ?? "admin";
}

function signToken(payload: string): string {
  const secret = getSecret();
  const hmac = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${hmac}`;
}

function verifyToken(token: string): string | null {
  const lastDot = token.lastIndexOf(".");
  if (lastDot < 0) return null;
  const payload = token.substring(0, lastDot);
  const sig = token.substring(lastDot + 1);
  const secret = getSecret();
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  if (sig !== expected) return null;
  return payload;
}

export function verifyAdminPassword(password: string): boolean {
  return password === getAdminPassword();
}

export function createSession(): string {
  const expiresAt = Date.now() + SESSION_MAX_AGE * 1000;
  const payload = JSON.stringify({ role: "admin", exp: expiresAt });
  return signToken(Buffer.from(payload).toString("base64url"));
}

export function validateSession(token: string): boolean {
  const payload = verifyToken(token);
  if (!payload) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (data.role !== "admin") return false;
    if (typeof data.exp === "number" && Date.now() > data.exp) return false;
    return true;
  } catch {
    return false;
  }
}

export function setSessionCookie(token: string): void {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export function clearSessionCookie(): void {
  cookies().delete(COOKIE_NAME);
}

export function getSessionFromCookies(): string | null {
  return cookies().get(COOKIE_NAME)?.value ?? null;
}

export function isAdminAuthenticated(): boolean {
  const token = getSessionFromCookies();
  if (!token) return false;
  return validateSession(token);
}
