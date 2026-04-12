import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Never cache health checks — always fresh
export const dynamic = "force-dynamic";

interface CheckResult {
  status: "ok" | "error" | "unconfigured";
  latencyMs?: number;
  detail?: string;
}

interface HealthPayload {
  status: "ok" | "degraded" | "error";
  timestamp: string;
  environment: string;
  version: string;
  latencyMs: number;
  checks: Record<string, CheckResult>;
}

/**
 * GET /api/health
 * Returns application health status including database connectivity.
 * Returns 200 if healthy, 503 if degraded/down.
 */
export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, CheckResult> = {};

  // ── Database check ──────────────────────────────────────────────────────
  try {
    const dbStart = Date.now();
    await db.$queryRaw`SELECT 1`;
    checks.database = { status: "ok", latencyMs: Date.now() - dbStart };
  } catch (err) {
    checks.database = {
      status: "error",
      detail: err instanceof Error ? err.message : "unknown error",
    };
  }

  // ── Environment / config checks ─────────────────────────────────────────
  checks.telegram = {
    status: process.env.TELEGRAM_BOT_TOKEN ? "ok" : "unconfigured",
  };
  checks.ai_groq = {
    status: process.env.GROQ_API_KEY ? "ok" : "unconfigured",
  };
  checks.ai_gemini = {
    status: process.env.GEMINI_API_KEY ? "ok" : "unconfigured",
  };
  checks.rate_limit = {
    status: process.env.UPSTASH_REDIS_REST_URL ? "ok" : "unconfigured",
    detail: process.env.UPSTASH_REDIS_REST_URL ? "Upstash Redis" : "in-memory fallback",
  };
  checks.sentry = {
    status: process.env.SENTRY_DSN ? "ok" : "unconfigured",
  };

  // ── Overall status ──────────────────────────────────────────────────────
  const hasError = Object.values(checks).some((c) => c.status === "error");
  const overallStatus: HealthPayload["status"] = hasError ? "error" : "ok";

  const payload: HealthPayload = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? "unknown",
    version: process.env.npm_package_version ?? "1.0.0",
    latencyMs: Date.now() - startTime,
    checks,
  };

  return NextResponse.json(payload, { status: hasError ? 503 : 200 });
}
