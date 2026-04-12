/**
 * API handler factory — eliminates boilerplate from route handlers.
 *
 * Provides:
 *  - Centralised error handling (ApiError subclasses → correct HTTP status)
 *  - Optional auth enforcement (requireAuth / requireSelf)
 *  - Optional rate limiting
 *  - Consistent JSON response shape
 *  - Sentry error capture
 *
 * Usage:
 *
 *   // Authenticated route
 *   export const GET = apiHandler(
 *     async ({ request, session }) => {
 *       const userId = request.nextUrl.searchParams.get('userId')!
 *       const data = await db.thing.findMany({ where: { userId } })
 *       return { data }
 *     },
 *     { auth: 'self', rateLimit: RATE_LIMITS.API }
 *   )
 *
 *   // Public route (no auth)
 *   export const GET = apiHandler(async ({ request }) => {
 *     return { ok: true }
 *   })
 */

import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import {
  ApiError,
  ForbiddenError,
  InternalError,
  UnauthorizedError,
  ValidationError,
} from "@/lib/errors";
import {
  checkRateLimit,
  RATE_LIMITS,
  rateLimitResponse,
  type RateLimitConfig,
} from "@/lib/rate-limit";
import { getAuthSession } from "@/lib/server-auth";

// ── Types ──────────────────────────────────────────────────────────────────

export interface AuthSession {
  userId: string;
  mode: string;
}

export interface HandlerContext {
  request: NextRequest;
  /** Only present when `auth` option is not false */
  session: AuthSession;
  /** URL params from dynamic route segments (e.g. [id]) — already awaited */
  params: Record<string, string>;
}

// Next.js 15 changed params to Promise<Record<string, string>>; support both
type RouteContext = { params?: Promise<Record<string, string>> | Record<string, string> };

export type ApiHandlerFn<T = unknown> = (ctx: HandlerContext) => Promise<T> | T;

export interface ApiHandlerOptions {
  /**
   * Auth mode:
   *  - `false`   — no auth check (public endpoint)
   *  - `'any'`   — require a valid session (any user)
   *  - `'self'`  — require a valid session where userId matches `userId` query/body param
   * @default 'any'
   */
  auth?: false | "any" | "self";

  /** Apply rate limiting. Defaults to RATE_LIMITS.API when auth !== false. */
  rateLimit?: RateLimitConfig | false;

  /** Key prefix for rate limit (e.g. 'ai:analyze') */
  rateLimitKey?: string;
}

// ── Factory ────────────────────────────────────────────────────────────────

/**
 * Wraps an async handler function with error handling, auth, and rate limiting.
 * Returns a Next.js route handler compatible with App Router.
 */
export function apiHandler<T = unknown>(
  fn: ApiHandlerFn<T>,
  options: ApiHandlerOptions = {}
): (request: NextRequest, context?: RouteContext) => Promise<NextResponse> {
  const { auth = "any", rateLimit, rateLimitKey } = options;

  // Resolve effective rate limit config
  const effectiveRateLimit =
    rateLimit === false ? false : (rateLimit ?? (auth !== false ? RATE_LIMITS.API : false));

  return async (request: NextRequest, routeContext?: RouteContext): Promise<NextResponse> => {
    try {
      // ── Rate limit ──────────────────────────────────────────────────────
      if (effectiveRateLimit) {
        const rl = await checkRateLimit(request, effectiveRateLimit, rateLimitKey);
        if (!rl.success) return rateLimitResponse(rl);
      }

      // ── Auth ────────────────────────────────────────────────────────────
      let session: AuthSession = { userId: "", mode: "demo" };

      if (auth !== false) {
        const raw = getAuthSession(request);
        if (!raw) throw new UnauthorizedError();
        session = raw;

        if (auth === "self") {
          // Derive target userId from query params or body
          const targetUserId =
            request.nextUrl.searchParams.get("userId") ?? extractBodyUserId(request);

          if (!targetUserId) throw new ValidationError("userId is required");
          if (session.userId !== targetUserId) throw new ForbiddenError();
        }
      }

      // ── Execute handler ─────────────────────────────────────────────────
      // Await params to support both Next.js 14 (Record) and 15 (Promise<Record>)
      const rawParams = routeContext?.params;
      const params: Record<string, string> =
        rawParams instanceof Promise ? await rawParams : (rawParams ?? {});
      const result = await fn({ request, session, params });

      // If handler returned a NextResponse directly, pass it through
      if (result instanceof NextResponse) return result;

      return NextResponse.json(result);
    } catch (err) {
      return handleError(err);
    }
  };
}

// ── Error handling ─────────────────────────────────────────────────────────

function handleError(err: unknown): NextResponse {
  // Known API errors → map to status code
  if (err instanceof ApiError) {
    // Report unexpected server errors to Sentry
    if (err.statusCode >= 500) {
      Sentry.captureException(err);
    }
    return NextResponse.json(err.toJSON(), { status: err.statusCode });
  }

  // Prisma unique constraint violation
  if (isPrismaError(err, "P2002")) {
    return NextResponse.json({ error: "Already exists", code: "CONFLICT" }, { status: 409 });
  }

  // Prisma not found
  if (isPrismaError(err, "P2025")) {
    return NextResponse.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 });
  }

  // Unexpected error
  console.error("[API] Unhandled error:", err);
  Sentry.captureException(err);

  const internal = new InternalError();
  return NextResponse.json(internal.toJSON(), { status: 500 });
}

function isPrismaError(err: unknown, code: string): boolean {
  if (typeof err !== "object" || err === null || !("code" in err)) return false;
  const errCode = (err as Record<string, unknown>).code;
  return errCode === code;
}

// ── Body userId extraction ─────────────────────────────────────────────────

// Small cache to avoid double-parsing the body (body stream can only be read once)
const bodyCache = new WeakMap<NextRequest, Record<string, unknown>>();

function extractBodyUserId(request: NextRequest): string | null {
  try {
    const cached = bodyCache.get(request);
    if (cached) return (cached.userId as string) ?? null;
  } catch {
    // ignore
  }
  // Can't sync-read body in middleware; fall back to header
  return request.headers.get("x-user-id");
}

// ── Convenience re-exports ─────────────────────────────────────────────────

export { RATE_LIMITS } from "@/lib/rate-limit";
export * from "@/lib/errors";
