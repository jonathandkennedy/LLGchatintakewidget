import { NextResponse } from "next/server";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

// In-memory store - resets on server restart (fine for edge/serverless cold starts)
const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 60 seconds
let lastCleanup = Date.now();
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}

type RateLimitConfig = {
  /** Max requests allowed in the window */
  limit: number;
  /** Window size in seconds */
  windowSeconds: number;
};

/** Default rate limits per route category */
const ROUTE_LIMITS: Record<string, RateLimitConfig> = {
  // Widget public endpoints (called from visitor browsers)
  "widget/config": { limit: 30, windowSeconds: 60 },
  "widget/session/start": { limit: 10, windowSeconds: 60 },
  "widget/session/answer": { limit: 60, windowSeconds: 60 },
  "widget/session/complete": { limit: 5, windowSeconds: 60 },
  "widget/session/revert": { limit: 10, windowSeconds: 60 },
  "widget/call/connect": { limit: 3, windowSeconds: 60 },
  "widget/callback/request": { limit: 3, windowSeconds: 60 },
  "widget/event": { limit: 60, windowSeconds: 60 },
  // Default fallback
  default: { limit: 30, windowSeconds: 60 },
};

function getClientIp(request: Request): string {
  const headers = new Headers(request.headers);
  // Check standard proxy headers
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

/**
 * Check rate limit for a request.
 * Returns null if allowed, or a 429 NextResponse if rate limited.
 */
export function checkRateLimit(request: Request, routeKey: string): NextResponse | null {
  cleanup();

  const config = ROUTE_LIMITS[routeKey] ?? ROUTE_LIMITS.default;
  const ip = getClientIp(request);
  const key = `${routeKey}:${ip}`;
  const now = Date.now();

  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // Start new window
    store.set(key, { count: 1, resetAt: now + config.windowSeconds * 1000 });
    return null;
  }

  entry.count++;

  if (entry.count > config.limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(config.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(entry.resetAt / 1000)),
        },
      },
    );
  }

  return null;
}
