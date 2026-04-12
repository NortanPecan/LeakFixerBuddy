/**
 * Typed API error classes.
 *
 * Usage in API routes:
 *   throw new NotFoundError('User not found')
 *   throw new ValidationError('userId is required')
 *   throw new ForbiddenError()
 */

// ── Base ───────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = "ApiError";
    // Maintains proper prototype chain in transpiled code
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON() {
    return {
      error: this.message,
      ...(this.code ? { code: this.code } : {}),
    };
  }
}

// ── 4xx Client errors ──────────────────────────────────────────────────────

export class ValidationError extends ApiError {
  constructor(message = "Validation failed", code = "VALIDATION_ERROR") {
    super(message, 400, code);
    this.name = "ValidationError";
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = "Forbidden") {
    super(message, 403, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends ApiError {
  constructor(message = "Not found") {
    super(message, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class ConflictError extends ApiError {
  constructor(message = "Conflict", code = "CONFLICT") {
    super(message, 409, code);
    this.name = "ConflictError";
  }
}

export class RateLimitError extends ApiError {
  constructor(retryAfter?: number) {
    super("Too many requests", 429, "RATE_LIMITED");
    this.name = "RateLimitError";
    if (retryAfter !== undefined) this.retryAfter = retryAfter;
  }
  retryAfter?: number;
}

// ── 5xx Server errors ──────────────────────────────────────────────────────

export class InternalError extends ApiError {
  constructor(message = "Internal server error") {
    super(message, 500, "INTERNAL_ERROR");
    this.name = "InternalError";
  }
}

export class ServiceUnavailableError extends ApiError {
  constructor(message = "Service temporarily unavailable") {
    super(message, 503, "SERVICE_UNAVAILABLE");
    this.name = "ServiceUnavailableError";
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Returns true if the value is one of our typed API errors. */
export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

/** Extracts a safe error message from any caught value. */
export function toErrorMessage(err: unknown, fallback = "Internal server error"): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return fallback;
}
