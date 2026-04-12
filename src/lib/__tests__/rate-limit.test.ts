import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  checkRateLimit,
  rateLimitResponse,
  getIdentifier,
  RATE_LIMITS,
  type RateLimitConfig,
} from "../rate-limit";

// Ensure Upstash is not configured so we always test the in-memory path
beforeEach(() => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetModules();
});

// ── Helpers ────────────────────────────────────────────────────────────────

function makeRequest(url = "http://localhost/api/test", headers: Record<string, string> = {}) {
  return new NextRequest(url, { headers });
}

// ── RATE_LIMITS presets ────────────────────────────────────────────────────

describe("RATE_LIMITS presets", () => {
  it("AI limit is 10 requests per 60 seconds", () => {
    expect(RATE_LIMITS.AI.requests).toBe(10);
    expect(RATE_LIMITS.AI.windowSeconds).toBe(60);
  });

  it("API limit is 60 requests per 60 seconds", () => {
    expect(RATE_LIMITS.API.requests).toBe(60);
    expect(RATE_LIMITS.API.windowSeconds).toBe(60);
  });

  it("AUTH limit is 5 requests per 60 seconds", () => {
    expect(RATE_LIMITS.AUTH.requests).toBe(5);
    expect(RATE_LIMITS.AUTH.windowSeconds).toBe(60);
  });
});

// ── getIdentifier ──────────────────────────────────────────────────────────

describe("getIdentifier", () => {
  it("uses userId from query param", () => {
    const req = makeRequest("http://localhost/api/test?userId=user123");
    expect(getIdentifier(req)).toBe("user:user123");
  });

  it("uses userId from x-user-id header when no query param", () => {
    const req = makeRequest("http://localhost/api/test", { "x-user-id": "user456" });
    expect(getIdentifier(req)).toBe("user:user456");
  });

  it("uses x-forwarded-for IP when no userId", () => {
    const req = makeRequest("http://localhost/api/test", {
      "x-forwarded-for": "1.2.3.4, 5.6.7.8",
    });
    expect(getIdentifier(req)).toBe("ip:1.2.3.4");
  });

  it("falls back to 'unknown' when no IP header", () => {
    const req = makeRequest();
    expect(getIdentifier(req)).toBe("ip:unknown");
  });

  it("prepends prefix (prefix is concatenated directly)", () => {
    const req = makeRequest("http://localhost/?userId=u1");
    // Note: prefix is concatenated as-is; checkRateLimit adds the trailing ':'
    expect(getIdentifier(req, "ai:analyze:")).toBe("ai:analyze:user:u1");
  });

  it("query param userId takes priority over header", () => {
    const req = makeRequest("http://localhost/?userId=fromQuery", {
      "x-user-id": "fromHeader",
    });
    expect(getIdentifier(req)).toBe("user:fromQuery");
  });
});

// ── checkRateLimit (in-memory) ─────────────────────────────────────────────

describe("checkRateLimit (in-memory fallback)", () => {
  const cfg: RateLimitConfig = { requests: 3, windowSeconds: 60, name: "Test" };

  it("allows requests within the limit", async () => {
    const req = makeRequest("http://localhost/?userId=testuser1");
    const r1 = await checkRateLimit(req, cfg, "test");
    expect(r1.success).toBe(true);
    expect(r1.remaining).toBe(2);
    expect(r1.limit).toBe(3);
  });

  it("tracks remaining decrements correctly", async () => {
    const req = makeRequest("http://localhost/?userId=testuser2");
    await checkRateLimit(req, cfg, "test");
    const r2 = await checkRateLimit(req, cfg, "test");
    expect(r2.remaining).toBe(1);
  });

  it("blocks after limit is exceeded", async () => {
    const req = makeRequest("http://localhost/?userId=testuser3");
    await checkRateLimit(req, cfg, "test");
    await checkRateLimit(req, cfg, "test");
    await checkRateLimit(req, cfg, "test");
    const r4 = await checkRateLimit(req, cfg, "test");
    expect(r4.success).toBe(false);
    expect(r4.remaining).toBe(0);
  });

  it("resets after the window expires", async () => {
    const req = makeRequest("http://localhost/?userId=testuser4");
    // Exhaust the limit
    for (let i = 0; i < 3; i++) await checkRateLimit(req, cfg, "test");
    const blocked = await checkRateLimit(req, cfg, "test");
    expect(blocked.success).toBe(false);

    // Advance time past the window
    vi.advanceTimersByTime(61_000);

    const allowed = await checkRateLimit(req, cfg, "test");
    expect(allowed.success).toBe(true);
    expect(allowed.remaining).toBe(2);
  });

  it("uses different buckets for different users", async () => {
    const req1 = makeRequest("http://localhost/?userId=alpha");
    const req2 = makeRequest("http://localhost/?userId=beta");
    const cfg2: RateLimitConfig = { requests: 1, windowSeconds: 60, name: "Tight" };

    const r1 = await checkRateLimit(req1, cfg2, "sep");
    const r2 = await checkRateLimit(req2, cfg2, "sep");
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
  });

  it("uses different buckets for different key prefixes", async () => {
    const req = makeRequest("http://localhost/?userId=sharedUser");
    const cfg1 = { requests: 1, windowSeconds: 60, name: "A" };
    const r1 = await checkRateLimit(req, cfg1, "prefix-a");
    const r2 = await checkRateLimit(req, cfg1, "prefix-b");
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
  });

  it("reset timestamp is in the future", async () => {
    const req = makeRequest("http://localhost/?userId=resetcheck");
    const now = Date.now();
    const result = await checkRateLimit(req, cfg, "test");
    expect(result.reset).toBeGreaterThan(now);
  });
});

// ── rateLimitResponse ──────────────────────────────────────────────────────

describe("rateLimitResponse", () => {
  it("returns 429 status", () => {
    const result = rateLimitResponse({
      success: false,
      remaining: 0,
      reset: Date.now() + 30_000,
      limit: 10,
    });
    expect(result.status).toBe(429);
  });

  it("includes rate limit headers", async () => {
    const resetTs = Date.now() + 30_000;
    const res = rateLimitResponse({ success: false, remaining: 0, reset: resetTs, limit: 10 });
    expect(res.headers.get("X-RateLimit-Limit")).toBe("10");
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(res.headers.get("Retry-After")).toBeDefined();
  });

  it("body contains error and retryAfter", async () => {
    const res = rateLimitResponse({
      success: false,
      remaining: 0,
      reset: Date.now() + 5_000,
      limit: 5,
    });
    const body = (await res.json()) as { error: string; retryAfter: number };
    expect(body.error).toBe("Too many requests");
    expect(typeof body.retryAfter).toBe("number");
    expect(body.retryAfter).toBeGreaterThanOrEqual(0);
  });

  it("retryAfter is 0 when reset is in the past", async () => {
    const res = rateLimitResponse({
      success: false,
      remaining: 0,
      reset: Date.now() - 1000,
      limit: 5,
    });
    const body = (await res.json()) as { retryAfter: number };
    expect(body.retryAfter).toBe(0);
  });
});
