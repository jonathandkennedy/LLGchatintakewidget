import { NextResponse } from "next/server";
import { verifyAdminPassword, createSession, setSessionCookie, clearSessionCookie } from "@/lib/auth/admin-auth";
import { logAudit } from "@/lib/monitoring/audit";
import {
  isEmailAuthorized,
  generateMagicLinkToken,
  generateOTP,
  verifyMagicLinkToken,
  verifyOTP,
  buildMagicLinkUrl,
  sendMagicLinkEmail,
  sendOTPEmail,
} from "@/lib/auth/magic-link";

type AuthBody = {
  action: string;
  password?: string;
  email?: string;
  code?: string;
  token?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AuthBody;

    // Password login
    if (body.action === "login") {
      if (!body.password || !verifyAdminPassword(body.password)) {
        return NextResponse.json({ error: "Invalid password" }, { status: 401 });
      }
      const token = createSession();
      setSessionCookie(token);
      logAudit({ action: "admin.login", actor: "password" });
      return NextResponse.json({ ok: true });
    }

    // Request magic link
    if (body.action === "send_magic_link") {
      const email = body.email?.trim().toLowerCase();
      if (!email) {
        return NextResponse.json({ error: "Email is required" }, { status: 400 });
      }
      if (!isEmailAuthorized(email)) {
        // Don't reveal whether the email exists - always say "sent"
        return NextResponse.json({ ok: true, message: "If this email is authorized, a login link has been sent." });
      }
      const linkToken = generateMagicLinkToken(email);
      const url = buildMagicLinkUrl(linkToken);
      await sendMagicLinkEmail(email, url);
      return NextResponse.json({ ok: true, message: "Login link sent to your email." });
    }

    // Verify magic link token
    if (body.action === "verify_magic_link") {
      if (!body.token) {
        return NextResponse.json({ error: "Token is required" }, { status: 400 });
      }
      const email = verifyMagicLinkToken(body.token);
      if (!email) {
        return NextResponse.json({ error: "Invalid or expired link" }, { status: 401 });
      }
      const sessionToken = createSession();
      setSessionCookie(sessionToken);
      return NextResponse.json({ ok: true });
    }

    // Request OTP
    if (body.action === "send_otp") {
      const email = body.email?.trim().toLowerCase();
      if (!email) {
        return NextResponse.json({ error: "Email is required" }, { status: 400 });
      }
      if (!isEmailAuthorized(email)) {
        return NextResponse.json({ ok: true, message: "If this email is authorized, a code has been sent." });
      }
      const otp = generateOTP(email);
      await sendOTPEmail(email, otp);
      return NextResponse.json({ ok: true, message: "Verification code sent to your email." });
    }

    // Verify OTP
    if (body.action === "verify_otp") {
      const email = body.email?.trim().toLowerCase();
      if (!email || !body.code) {
        return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
      }
      if (!verifyOTP(email, body.code)) {
        return NextResponse.json({ error: "Invalid or expired code" }, { status: 401 });
      }
      const sessionToken = createSession();
      setSessionCookie(sessionToken);
      return NextResponse.json({ ok: true });
    }

    // Logout
    if (body.action === "logout") {
      logAudit({ action: "admin.logout" });
      clearSessionCookie();
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
