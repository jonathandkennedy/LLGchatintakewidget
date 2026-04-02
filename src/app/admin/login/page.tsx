"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type AuthMethod = "password" | "magic_link" | "otp";

export default function AdminLoginPage() {
  const [method, setMethod] = useState<AuthMethod>("password");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Handle magic link token from URL
  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      setLoading(true);
      fetch("/intakeapp/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_magic_link", token }),
      })
        .then(async (res) => {
          if (res.ok) {
            router.push("/admin");
            router.refresh();
          } else {
            const json = await res.json();
            setError(json.error ?? "Invalid or expired link");
            setLoading(false);
          }
        })
        .catch(() => {
          setError("Something went wrong");
          setLoading(false);
        });
    }
  }, [searchParams, router]);

  async function authFetch(body: Record<string, string>) {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/intakeapp/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await response.json();
      if (!response.ok) {
        setError(json.error ?? "Authentication failed");
        return null;
      }
      return json;
    } catch {
      setError("Something went wrong. Please try again.");
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = await authFetch({ action: "login", password });
    if (result?.ok) {
      router.push("/admin");
      router.refresh();
    }
  }

  async function handleSendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    const result = await authFetch({ action: "send_magic_link", email });
    if (result) setMessage(result.message ?? "Check your email for a login link.");
  }

  async function handleSendOTP(e: React.FormEvent) {
    e.preventDefault();
    const result = await authFetch({ action: "send_otp", email });
    if (result) {
      setMessage(result.message ?? "Check your email for a code.");
      setOtpSent(true);
    }
  }

  async function handleVerifyOTP(e: React.FormEvent) {
    e.preventDefault();
    const result = await authFetch({ action: "verify_otp", email, code: otpCode });
    if (result?.ok) {
      router.push("/admin");
      router.refresh();
    }
  }

  function switchMethod(m: AuthMethod) {
    setMethod(m);
    setError("");
    setMessage("");
    setOtpSent(false);
    setOtpCode("");
  }

  if (searchParams.get("token")) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-header">
            <h1>IntakeLLG</h1>
            <p>{loading ? "Verifying your link..." : error || "Processing..."}</p>
          </div>
          {error && (
            <div className="login-form">
              <div className="error-banner">{error}</div>
              <button className="primary-button" onClick={() => router.push("/admin/login")}>Back to login</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>IntakeLLG</h1>
          <p>Sign in to the admin dashboard</p>
        </div>

        {/* Method tabs */}
        <div className="login-tabs">
          <button className={`login-tab ${method === "password" ? "active" : ""}`} onClick={() => switchMethod("password")}>Password</button>
          <button className={`login-tab ${method === "magic_link" ? "active" : ""}`} onClick={() => switchMethod("magic_link")}>Magic Link</button>
          <button className={`login-tab ${method === "otp" ? "active" : ""}`} onClick={() => switchMethod("otp")}>One-Time Code</button>
        </div>

        {/* Password */}
        {method === "password" && (
          <form onSubmit={handlePasswordSubmit} className="login-form">
            {error && <div className="error-banner">{error}</div>}
            <label className="admin-label">
              Password
              <input className="text-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter admin password" autoFocus required />
            </label>
            <button className="primary-button" type="submit" disabled={loading || !password}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        )}

        {/* Magic Link */}
        {method === "magic_link" && (
          <form onSubmit={handleSendMagicLink} className="login-form">
            {error && <div className="error-banner">{error}</div>}
            {message && <div className="success-banner">{message}</div>}
            <label className="admin-label">
              Email Address
              <input className="text-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoFocus required />
            </label>
            <button className="primary-button" type="submit" disabled={loading || !email}>
              {loading ? "Sending..." : "Send Login Link"}
            </button>
            <p className="login-hint">We'll email you a link to sign in instantly.</p>
          </form>
        )}

        {/* OTP */}
        {method === "otp" && !otpSent && (
          <form onSubmit={handleSendOTP} className="login-form">
            {error && <div className="error-banner">{error}</div>}
            {message && <div className="success-banner">{message}</div>}
            <label className="admin-label">
              Email Address
              <input className="text-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoFocus required />
            </label>
            <button className="primary-button" type="submit" disabled={loading || !email}>
              {loading ? "Sending..." : "Send Code"}
            </button>
            <p className="login-hint">We'll email you a 6-digit code to sign in.</p>
          </form>
        )}

        {method === "otp" && otpSent && (
          <form onSubmit={handleVerifyOTP} className="login-form">
            {error && <div className="error-banner">{error}</div>}
            {message && <div className="success-banner">{message}</div>}
            <label className="admin-label">
              Verification Code
              <input
                className="text-input login-otp-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                autoFocus
                required
              />
            </label>
            <button className="primary-button" type="submit" disabled={loading || otpCode.length !== 6}>
              {loading ? "Verifying..." : "Verify Code"}
            </button>
            <button type="button" className="login-resend" onClick={() => { setOtpSent(false); setOtpCode(""); setError(""); setMessage(""); }}>
              Didn't receive it? Send again
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
