import crypto from "crypto";

type StoredToken = {
  email: string;
  code: string;
  type: "magic_link" | "otp";
  expiresAt: number;
  used: boolean;
};

// In-memory store for tokens (resets on server restart)
// For production, store in Supabase or Redis
const tokenStore = new Map<string, StoredToken>();

const TOKEN_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const OTP_LENGTH = 6;

// Cleanup expired tokens periodically
let lastCleanup = Date.now();
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, entry] of tokenStore) {
    if (now > entry.expiresAt || entry.used) tokenStore.delete(key);
  }
}

function getAuthorizedEmails(): string[] {
  const envEmails = process.env.ADMIN_AUTHORIZED_EMAILS ?? "";
  return envEmails
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAuthorized(email: string): boolean {
  const authorized = getAuthorizedEmails();
  if (authorized.length === 0) return false;
  return authorized.includes(email.toLowerCase().trim());
}

export function generateMagicLinkToken(email: string): string {
  cleanup();
  const token = crypto.randomBytes(32).toString("hex");
  tokenStore.set(token, {
    email: email.toLowerCase().trim(),
    code: token,
    type: "magic_link",
    expiresAt: Date.now() + TOKEN_EXPIRY_MS,
    used: false,
  });
  return token;
}

export function generateOTP(email: string): string {
  cleanup();
  // Generate 6-digit numeric OTP
  const otp = String(crypto.randomInt(100000, 999999));
  const key = `otp:${email.toLowerCase().trim()}`;

  // Remove any existing OTP for this email
  for (const [k, v] of tokenStore) {
    if (v.type === "otp" && v.email === email.toLowerCase().trim()) {
      tokenStore.delete(k);
    }
  }

  tokenStore.set(key, {
    email: email.toLowerCase().trim(),
    code: otp,
    type: "otp",
    expiresAt: Date.now() + TOKEN_EXPIRY_MS,
    used: false,
  });
  return otp;
}

export function verifyMagicLinkToken(token: string): string | null {
  cleanup();
  const entry = tokenStore.get(token);
  if (!entry || entry.type !== "magic_link" || entry.used || Date.now() > entry.expiresAt) {
    return null;
  }
  entry.used = true;
  return entry.email;
}

export function verifyOTP(email: string, code: string): boolean {
  cleanup();
  const key = `otp:${email.toLowerCase().trim()}`;
  const entry = tokenStore.get(key);
  if (!entry || entry.type !== "otp" || entry.used || Date.now() > entry.expiresAt) {
    return false;
  }
  if (entry.code !== code) {
    return false;
  }
  entry.used = true;
  return true;
}

export function buildMagicLinkUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${baseUrl}/intakeapp/admin/login?token=${token}`;
}

export async function sendMagicLinkEmail(email: string, url: string): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.LEAD_NOTIFICATION_FROM ?? "IntakeLLG <notifications@intakellg.com>";

  if (!resendKey) {
    console.log(`[auth] Magic link for ${email}: ${url}`);
    return;
  }

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: fromEmail,
      to: email,
      subject: "IntakeLLG Admin Login",
      html: `
        <div style="max-width:480px;margin:0 auto;padding:32px 16px;font-family:-apple-system,sans-serif;">
          <h1 style="font-size:24px;font-weight:700;margin-bottom:8px;">IntakeLLG Admin</h1>
          <p style="color:#64748b;margin-bottom:24px;">Click the button below to sign in. This link expires in 10 minutes.</p>
          <a href="${url}" style="display:inline-block;padding:14px 28px;background:#2563eb;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">Sign in to Dashboard</a>
          <p style="color:#94a3b8;font-size:12px;margin-top:24px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
      text: `Sign in to IntakeLLG Admin: ${url}\n\nThis link expires in 10 minutes.`,
    }),
  });
}

export async function sendOTPEmail(email: string, otp: string): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.LEAD_NOTIFICATION_FROM ?? "IntakeLLG <notifications@intakellg.com>";

  if (!resendKey) {
    console.log(`[auth] OTP for ${email}: ${otp}`);
    return;
  }

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: fromEmail,
      to: email,
      subject: `IntakeLLG Admin Login Code: ${otp}`,
      html: `
        <div style="max-width:480px;margin:0 auto;padding:32px 16px;font-family:-apple-system,sans-serif;">
          <h1 style="font-size:24px;font-weight:700;margin-bottom:8px;">IntakeLLG Admin</h1>
          <p style="color:#64748b;margin-bottom:16px;">Your one-time login code is:</p>
          <div style="font-size:36px;font-weight:800;letter-spacing:8px;text-align:center;padding:20px;background:#f1f5f9;border-radius:12px;margin-bottom:16px;">${otp}</div>
          <p style="color:#94a3b8;font-size:13px;">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
        </div>
      `,
      text: `Your IntakeLLG admin login code: ${otp}\n\nThis code expires in 10 minutes.`,
    }),
  });
}
