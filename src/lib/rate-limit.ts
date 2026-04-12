/**
 * Rate limiting utility for API routes.
 *
 * Uses @upstash/ratelimit with Redis when UPSTASH_REDIS_REST_URL is configured.
 * Falls back to a simple in-memory store for local development.
 *
 * Usage:
 *   import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
 *
 *   const result = await checkRateLimit(request, RATE_LIMITS.AI)
 *   if (!result.success) return rateLimitResponse(result)
 */

import { NextRequest, NextResponse } from "next/server";

// ── Types ──────────────────────────────────────────────────────────────────

export interface RateLimitResult {
  success: boolean;
  /** Requests remaining in the current window */
  remaining: number;
  /** Unix timestamp (ms) when the window resets */
  reset: number;
  /** Max requests allowed per window */
  limit: number;
}

export interface RateLimitConfig {
  /** Max requests per window */
  requests: number;
  /** Window duration in seconds */
  windowSeconds: number;
  /** Human-readable name for error messages */
  name: string;
}

// ── Preset limits ──────────────────────────────────────────────────────────

export const RATE_LIMITS = {
  /** AI endpoints (expensive) — 10 req/min per user */
  AI: { requests: 10, windowSeconds: 60, name: "AI" } satisfies RateLimitConfig,
  /** General API — 60 req/min per user */
  API: { requests: 60, windowSeconds: 60, name: "API" } satisfies RateLimitConfig,
  /** Auth endpoints — 5 req/min per IP */
  AUTH: { requests: 5, windowSeconds: 60, name: "Auth" } satisfies RateLimitConfig,
  /** Telegram webhook — 30 req/min */
  TELEGRAM: { requests: 30, windowSeconds: 60, name: "Telegram" } satisfies RateLimitConfig,
  /** Cron/admin endpoints */
  CRON: { requests: 10, windowSeconds: 10, name: "Cron" } satisfies RateLimitConfig,
} as const;

// ── Upstash Redis backend ──────────────────────────────────────────────────

interface UnifiedLimiter {
  check(key: string, config: RateLimitConfig): Promise<RateLimitResult>;
}

// Lazily initialised — Promise cached so we only initialise once
let upstashLimiterPromise: Promise<UnifiedLimiter | null> | null = null;

async function buildUpstashLimiter(): Promise<UnifiedLimiter | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const { Redis } = await import("@upstash/redis");
    const { Ratelimit } = await import("@upstash/ratelimit");

    const redis = new Redis({ url, token });
    const limiters = new Map<string, InstanceType<typeof Ratelimit>>();

    return {
      async check(key, config) {
        const configKey = `${config.requests}:${config.windowSeconds}`;
        if (!limiters.has(configKey)) {
          limiters.set(
            configKey,
            new Ratelimit({
              redis,
              limiter: Ratelimit.slidingWindow(config.requests, `${config.windowSeconds} s`),
              prefix: `lfb_rl_${config.name.toLowerCase()}`,
            })
          );
        }
        const limiter = limiters.get(configKey) as InstanceType<typeof Ratelimit>;
        const result = await limiter.limit(key);
        return {
          success: result.success,
          remaining: result.remaining,
          reset: result.reset,
          limit: result.limit,
        };
      },
    };
  } catch (err) {
    console.error("[RateLimit] Failed to initialise Upstash:", err);
    return null;
  }
}

function getUpstashLimiter(): Promise<UnifiedLimiter | null> {
  if (!upstashLimiterPromise) {
    upstashLimiterPromise = buildUpstashLimiter();
  }
  return upstashLimiterPromise;
}

// ── In-memory fallback (dev / no Redis) ───────────────────────────────────

interface MemoryEntry {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, MemoryEntry>();

// Clean up expired entries every minute
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore) {
      if (now >= entry.resetAt) memoryStore.delete(key);
    }
  }, 60_000);
}

function checkMemory(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const entry = memoryStore.get(key);

  if (!entry || now >= entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return {
      success: true,
      remaining: config.requests - 1,
      reset: now + windowMs,
      limit: config.requests,
    };
  }

  entry.count += 1;
  return {
    success: entry.count <= config.requests,
    remaining: Math.max(0, config.requests - entry.count),
    reset: entry.resetAt,
    limit: config.requests,
  };
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Extract a stable identifier from a request.
 * Prefers userId (query param or header), falls back to IP.
 */
export function getIdentifier(request: NextRequest, prefix = ""): string {
  const userId = request.nextUrl.searchParams.get("userId") ?? request.headers.get("x-user-id");

  if (userId) return `${prefix}user:${userId}`;

  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? (forwarded.split(",")[0] ?? "unknown").trim() : "unknown";
  return `${prefix}ip:${ip}`;
}

/**
 * Check rate limit for an incoming request.
 *
 * @example
 * const result = await checkRateLimit(req, RATE_LIMITS.AI, 'ai:analyze')
 * if (!result.success) return rateLimitResponse(result)
 */
export async function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  keyPrefix = ""
): Promise<RateLimitResult> {
  const identifier = getIdentifier(request, keyPrefix ? `${keyPrefix}:` : "");

  const upstash = await getUpstashLimiter();
  if (upstash) {
    try {
      return await upstash.check(identifier, config);
    } catch (err) {
      // Redis error → fail open (allow request)
      console.error("[RateLimit] Upstash check failed, failing open:", err);
    }
  }

  return checkMemory(identifier, config);
}

/**
 * Standard 429 Too Many Requests response with rate-limit headers.
 */
export function rateLimitResponse(result: RateLimitResult): NextResponse {
  const retryAfter = Math.max(0, Math.ceil((result.reset - Date.now()) / 1000));
  return NextResponse.json(
    { error: "Too many requests", retryAfter },
    {
      status: 429,
      headers: {
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(Math.ceil(result.reset / 1000)),
        "Retry-After": String(retryAfter),
      },
    }
  );
}
