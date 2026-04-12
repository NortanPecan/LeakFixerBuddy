import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { apiHandler, RATE_LIMITS } from "../api-handler";
import {
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  InternalError,
} from "../errors";

// ── Mocks ──────────────────────────────────────────────────────────────────

// Mock Sentry so tests don't need a real DSN
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

// Mock server-auth — default: no session
const mockGetAuthSession = vi.fn();
vi.mock("../server-auth", () => ({
  getAuthSession: (...args: unknown[]) => mockGetAuthSession(...args),
}));

// Mock rate-limit — default: always allow
vi.mock("../rate-limit", async (importOriginal) => {
  const original = await importOriginal<typeof import("../rate-limit")>();
  return {
    ...original,
    checkRateLimit: vi.fn().mockResolvedValue({
      success: true,
      remaining: 59,
      reset: Date.now() + 60_000,
      limit: 60,
    }),
  };
});

// ── Helpers ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeRequest(url = "http://localhost/api/test", init?: any) {
  return new NextRequest(url, init);
}

function makeAuthSession(userId = "user-123", mode = "telegram") {
  return { userId, mode };
}

// ── Public routes (auth: false) ────────────────────────────────────────────

describe("apiHandler — public route (auth: false)", () => {
  it("returns handler result as JSON", async () => {
    const handler = apiHandler(async () => ({ ok: true }), { auth: false, rateLimit: false });
    const res = await handler(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });

  it("passes request to the handler context", async () => {
    const handler = apiHandler(async ({ request }) => ({ path: request.nextUrl.pathname }), {
      auth: false,
      rateLimit: false,
    });
    const res = await handler(makeRequest("http://localhost/api/ping"));
    const body = await res.json();
    expect(body.path).toBe("/api/ping");
  });

  it("passes route params from context", async () => {
    const handler = apiHandler(async ({ params }) => ({ id: params.id }), {
      auth: false,
      rateLimit: false,
    });
    const res = await handler(makeRequest(), { params: { id: "abc123" } });
    const body = await res.json();
    expect(body.id).toBe("abc123");
  });

  it("passes through NextResponse returned directly from handler", async () => {
    const { NextResponse } = await import("next/server");
    const handler = apiHandler(async () => NextResponse.json({ custom: true }, { status: 201 }), {
      auth: false,
      rateLimit: false,
    });
    const res = await handler(makeRequest());
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.custom).toBe(true);
  });
});

// ── Auth: 'any' ────────────────────────────────────────────────────────────

describe("apiHandler — auth: any", () => {
  beforeEach(() => {
    mockGetAuthSession.mockReturnValue(makeAuthSession());
  });

  it("allows authenticated requests", async () => {
    const handler = apiHandler(async () => ({ ok: true }), { auth: "any", rateLimit: false });
    const res = await handler(makeRequest());
    expect(res.status).toBe(200);
  });

  it("returns 401 when no session", async () => {
    mockGetAuthSession.mockReturnValue(null);
    const handler = apiHandler(async () => ({ ok: true }), { auth: "any", rateLimit: false });
    const res = await handler(makeRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("passes session to handler context", async () => {
    const handler = apiHandler(async ({ session }) => ({ userId: session.userId }), {
      auth: "any",
      rateLimit: false,
    });
    const res = await handler(makeRequest());
    const body = await res.json();
    expect(body.userId).toBe("user-123");
  });
});

// ── Auth: 'self' ───────────────────────────────────────────────────────────

describe("apiHandler — auth: self", () => {
  beforeEach(() => {
    mockGetAuthSession.mockReturnValue(makeAuthSession("user-123"));
  });

  it("allows when userId matches session", async () => {
    const handler = apiHandler(async () => ({ ok: true }), { auth: "self", rateLimit: false });
    const res = await handler(makeRequest("http://localhost/api/test?userId=user-123"));
    expect(res.status).toBe(200);
  });

  it("returns 403 when userId doesn't match session", async () => {
    const handler = apiHandler(async () => ({ ok: true }), { auth: "self", rateLimit: false });
    const res = await handler(makeRequest("http://localhost/api/test?userId=other-user"));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("FORBIDDEN");
  });

  it("returns 400 when userId missing", async () => {
    const handler = apiHandler(async () => ({ ok: true }), { auth: "self", rateLimit: false });
    const res = await handler(makeRequest("http://localhost/api/test"));
    expect(res.status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAuthSession.mockReturnValue(null);
    const handler = apiHandler(async () => ({ ok: true }), { auth: "self", rateLimit: false });
    const res = await handler(makeRequest("http://localhost/api/test?userId=user-123"));
    expect(res.status).toBe(401);
  });
});

// ── Error handling ─────────────────────────────────────────────────────────

describe("apiHandler — error handling", () => {
  beforeEach(() => {
    mockGetAuthSession.mockReturnValue(makeAuthSession());
  });

  it("maps ValidationError to 400", async () => {
    const handler = apiHandler(
      async () => {
        throw new ValidationError("bad input");
      },
      { auth: false, rateLimit: false }
    );
    const res = await handler(makeRequest());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("bad input");
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("maps UnauthorizedError to 401", async () => {
    const handler = apiHandler(
      async () => {
        throw new UnauthorizedError();
      },
      { auth: false, rateLimit: false }
    );
    const res = await handler(makeRequest());
    expect(res.status).toBe(401);
  });

  it("maps ForbiddenError to 403", async () => {
    const handler = apiHandler(
      async () => {
        throw new ForbiddenError();
      },
      { auth: false, rateLimit: false }
    );
    const res = await handler(makeRequest());
    expect(res.status).toBe(403);
  });

  it("maps NotFoundError to 404", async () => {
    const handler = apiHandler(
      async () => {
        throw new NotFoundError("thing not found");
      },
      { auth: false, rateLimit: false }
    );
    const res = await handler(makeRequest());
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("thing not found");
  });

  it("maps InternalError to 500", async () => {
    const handler = apiHandler(
      async () => {
        throw new InternalError();
      },
      { auth: false, rateLimit: false }
    );
    const res = await handler(makeRequest());
    expect(res.status).toBe(500);
  });

  it("maps unknown Error to 500", async () => {
    const handler = apiHandler(
      async () => {
        throw new Error("unexpected");
      },
      { auth: false, rateLimit: false }
    );
    const res = await handler(makeRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("maps Prisma P2002 to 409", async () => {
    const handler = apiHandler(
      async () => {
        throw Object.assign(new Error("unique"), { code: "P2002" });
      },
      { auth: false, rateLimit: false }
    );
    const res = await handler(makeRequest());
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe("CONFLICT");
  });

  it("maps Prisma P2025 to 404", async () => {
    const handler = apiHandler(
      async () => {
        throw Object.assign(new Error("not found"), { code: "P2025" });
      },
      { auth: false, rateLimit: false }
    );
    const res = await handler(makeRequest());
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe("NOT_FOUND");
  });
});

// ── Rate limiting ──────────────────────────────────────────────────────────

describe("apiHandler — rate limiting", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let checkRateLimit: any;

  beforeAll(async () => {
    const mod = await import("../rate-limit");
    checkRateLimit = vi.mocked(mod.checkRateLimit);
  });

  beforeEach(() => {
    mockGetAuthSession.mockReturnValue(makeAuthSession());
  });

  it("returns 429 when rate limit exceeded", async () => {
    checkRateLimit.mockResolvedValueOnce({
      success: false,
      remaining: 0,
      reset: Date.now() + 60_000,
      limit: 10,
    });

    const handler = apiHandler(async () => ({ ok: true }), {
      auth: false,
      rateLimit: RATE_LIMITS.API,
    });
    const res = await handler(makeRequest());
    expect(res.status).toBe(429);
  });

  it("applies rate limiting before auth check", async () => {
    checkRateLimit.mockResolvedValueOnce({
      success: false,
      remaining: 0,
      reset: Date.now() + 60_000,
      limit: 10,
    });
    mockGetAuthSession.mockReturnValue(null); // no session

    const handler = apiHandler(async () => ({ ok: true }), {
      auth: "any",
      rateLimit: RATE_LIMITS.API,
    });
    const res = await handler(makeRequest());
    // Rate limit should fire before auth, so 429 not 401
    expect(res.status).toBe(429);
  });
});
