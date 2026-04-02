import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type ServiceStatus = "ok" | "degraded" | "down";

type HealthCheck = {
  status: ServiceStatus;
  timestamp: string;
  uptime: number;
  services: {
    database: { status: ServiceStatus; latencyMs: number };
    telnyx: { configured: boolean };
    resend: { configured: boolean };
    anthropic: { configured: boolean };
  };
  version: string;
};

const startTime = Date.now();

export async function GET() {
  const timestamp = new Date().toISOString();
  const uptime = Math.floor((Date.now() - startTime) / 1000);

  // Check database
  let dbStatus: ServiceStatus = "down";
  let dbLatency = 0;
  try {
    const start = Date.now();
    const { error } = await supabaseAdmin.from("clients").select("id").limit(1);
    dbLatency = Date.now() - start;
    dbStatus = error ? "degraded" : dbLatency > 2000 ? "degraded" : "ok";
  } catch {
    dbStatus = "down";
  }

  const health: HealthCheck = {
    status: dbStatus === "ok" ? "ok" : dbStatus === "degraded" ? "degraded" : "down",
    timestamp,
    uptime,
    services: {
      database: { status: dbStatus, latencyMs: dbLatency },
      telnyx: { configured: !!process.env.TELNYX_API_KEY },
      resend: { configured: !!process.env.RESEND_API_KEY },
      anthropic: { configured: !!process.env.ANTHROPIC_API_KEY },
    },
    version: "1.0.0",
  };

  const httpStatus = health.status === "ok" ? 200 : health.status === "degraded" ? 200 : 503;

  return NextResponse.json(health, { status: httpStatus });
}
