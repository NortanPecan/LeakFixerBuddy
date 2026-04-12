import { describe, it, expect } from "vitest";
import {
  ApiError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InternalError,
  ServiceUnavailableError,
  isApiError,
  toErrorMessage,
} from "../errors";

// ── ApiError base class ────────────────────────────────────────────────────

describe("ApiError", () => {
  it("sets message, statusCode, and code", () => {
    const err = new ApiError("test message", 418, "TEAPOT");
    expect(err.message).toBe("test message");
    expect(err.statusCode).toBe(418);
    expect(err.code).toBe("TEAPOT");
    expect(err.name).toBe("ApiError");
  });

  it("is an instance of Error", () => {
    const err = new ApiError("oops", 500);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
  });

  it("toJSON includes error and code", () => {
    const err = new ApiError("bad request", 400, "BAD");
    expect(err.toJSON()).toEqual({ error: "bad request", code: "BAD" });
  });

  it("toJSON omits code when undefined", () => {
    const err = new ApiError("oops", 500);
    expect(err.toJSON()).toEqual({ error: "oops" });
  });

  it("has a stack trace", () => {
    const err = new ApiError("x", 400);
    expect(err.stack).toBeDefined();
  });
});

// ── Subclasses ─────────────────────────────────────────────────────────────

describe("ValidationError", () => {
  it("has statusCode 400 and correct defaults", () => {
    const err = new ValidationError();
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.message).toBe("Validation failed");
    expect(err.name).toBe("ValidationError");
  });

  it("accepts custom message and code", () => {
    const err = new ValidationError("userId is required", "MISSING_USER_ID");
    expect(err.message).toBe("userId is required");
    expect(err.code).toBe("MISSING_USER_ID");
  });

  it("is instanceof ApiError and Error", () => {
    expect(new ValidationError()).toBeInstanceOf(ApiError);
    expect(new ValidationError()).toBeInstanceOf(Error);
  });
});

describe("UnauthorizedError", () => {
  it("has statusCode 401", () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe("UNAUTHORIZED");
    expect(err.message).toBe("Unauthorized");
  });

  it("accepts custom message", () => {
    expect(new UnauthorizedError("Token expired").message).toBe("Token expired");
  });
});

describe("ForbiddenError", () => {
  it("has statusCode 403", () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe("FORBIDDEN");
  });
});

describe("NotFoundError", () => {
  it("has statusCode 404", () => {
    const err = new NotFoundError();
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
  });

  it("accepts custom message", () => {
    expect(new NotFoundError("User not found").message).toBe("User not found");
  });
});

describe("ConflictError", () => {
  it("has statusCode 409", () => {
    const err = new ConflictError();
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe("CONFLICT");
  });

  it("accepts custom code", () => {
    expect(new ConflictError("Duplicate email", "DUPLICATE_EMAIL").code).toBe("DUPLICATE_EMAIL");
  });
});

describe("RateLimitError", () => {
  it("has statusCode 429", () => {
    const err = new RateLimitError();
    expect(err.statusCode).toBe(429);
    expect(err.code).toBe("RATE_LIMITED");
    expect(err.message).toBe("Too many requests");
  });

  it("stores retryAfter when provided", () => {
    const err = new RateLimitError(60);
    expect(err.retryAfter).toBe(60);
  });

  it("retryAfter is undefined when not provided", () => {
    expect(new RateLimitError().retryAfter).toBeUndefined();
  });
});

describe("InternalError", () => {
  it("has statusCode 500", () => {
    const err = new InternalError();
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe("INTERNAL_ERROR");
  });
});

describe("ServiceUnavailableError", () => {
  it("has statusCode 503", () => {
    const err = new ServiceUnavailableError();
    expect(err.statusCode).toBe(503);
    expect(err.code).toBe("SERVICE_UNAVAILABLE");
  });
});

// ── Helper functions ───────────────────────────────────────────────────────

describe("isApiError", () => {
  it("returns true for ApiError instances", () => {
    expect(isApiError(new ApiError("x", 400))).toBe(true);
    expect(isApiError(new ValidationError())).toBe(true);
    expect(isApiError(new NotFoundError())).toBe(true);
  });

  it("returns false for plain Error", () => {
    expect(isApiError(new Error("plain"))).toBe(false);
  });

  it("returns false for non-error values", () => {
    expect(isApiError(null)).toBe(false);
    expect(isApiError(undefined)).toBe(false);
    expect(isApiError("string error")).toBe(false);
    expect(isApiError({ message: "fake" })).toBe(false);
  });
});

describe("toErrorMessage", () => {
  it("extracts message from Error", () => {
    expect(toErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns string as-is", () => {
    expect(toErrorMessage("something failed")).toBe("something failed");
  });

  it("returns fallback for unknown type", () => {
    expect(toErrorMessage(null)).toBe("Internal server error");
    expect(toErrorMessage(42)).toBe("Internal server error");
    expect(toErrorMessage({})).toBe("Internal server error");
  });

  it("uses custom fallback", () => {
    expect(toErrorMessage(null, "Custom fallback")).toBe("Custom fallback");
  });
});
