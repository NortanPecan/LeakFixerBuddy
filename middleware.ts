/**
 * Global middleware — runs before every matched request.
 *
 * Responsibilities:
 *  1. Apply rate limiting to all /api/ routes (covers the ~90 routes that do
 *     not use apiHandler() and therefore have no per-route rate limiting)
 *  2. Apply tighter limits to AI and auth endpoints
 *
 * Routes that manage their own rate limiting / auth are skipped:
 *  - /api/telegram/webhook  (handles Telegram dedup + has own limits)
 *  - /api/auth/**           (uses AUTH limit below)
 *  - /api/cron/**           (protected by CRON_SECRET bearer token)
 *
 * The rate-limit backend uses Upstash Redis when UPSTASH_REDIS_REST_URL is set,
 * falling back to an in-memory sliding-window store for local development.
 */

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";

// ── Path helpers ───────────────────────────────────────────────────────────

function matchesAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname.startsWith(p));
}

// ── Middleware ─────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // ── Skip non-API routes ──────────────────────────────────────────────────
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // ── Cron endpoints: protected by bearer token — skip middleware RL ───────
  // They're called by Vercel scheduler, not end-users; checking the secret
  // is already done inside each handler.
  if (matchesAny(pathname, ["/api/cron/", "/api/telegram/send-", "/api/notifications/"])) {
    return NextResponse.next();
  }

  // ── Telegram webhook: own dedup + per-user limiting inside handler ────────
  if (pathname.startsWith("/api/telegram/webhook")) {
    return NextResponse.next();
  }

  // ── Auth endpoints: tighter IP-based limit ────────────────────────────────
  if (pathname.startsWith("/api/auth/")) {
    const result = await checkRateLimit(request, RATE_LIMITS.AUTH, "mw:auth");
    if (!result.success) return rateLimitResponse(result);
    return NextResponse.next();
  }

  // ── AI endpoints: tighter per-user limit ─────────────────────────────────
  if (pathname.startsWith("/api/ai/")) {
    const result = await checkRateLimit(request, RATE_LIMITS.AI, "mw:ai");
    if (!result.success) return rateLimitResponse(result);
    return NextResponse.next();
  }

  // ── All other API routes: standard API limit ──────────────────────────────
  const result = await checkRateLimit(request, RATE_LIMITS.API, "mw:api");
  if (!result.success) return rateLimitResponse(result);

  return NextResponse.next();
}

// Only run on API routes (excludes _next/static, favicon, etc.)
export const config = {
  matcher: "/api/:path*",
};
