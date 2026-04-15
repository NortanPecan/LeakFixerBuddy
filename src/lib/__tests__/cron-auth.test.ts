import { describe, it, expect, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { requireCronSecret } from "../cron-auth";

function makeRequest(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/cron/test", { headers });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("requireCronSecret", () => {
  it("allows local development without CRON_SECRET", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("CRON_SECRET", "");

    expect(requireCronSecret(makeRequest())).toBeNull();
  });

  it("fails closed in production when CRON_SECRET is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CRON_SECRET", "");

    const response = requireCronSecret(makeRequest());

    expect(response?.status).toBe(503);
    await expect(response?.json()).resolves.toEqual({
      error: "CRON_SECRET is not configured",
    });
  });

  it("rejects requests with an invalid bearer token", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CRON_SECRET", "secret-value");

    const response = requireCronSecret(makeRequest({ authorization: "Bearer wrong-value" }));

    expect(response?.status).toBe(401);
    await expect(response?.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("allows requests with the configured bearer token", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CRON_SECRET", "secret-value");

    const response = requireCronSecret(makeRequest({ authorization: "Bearer secret-value" }));

    expect(response).toBeNull();
  });
});
