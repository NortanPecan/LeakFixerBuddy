import { createHmac } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  db: {},
}));

vi.mock("@/lib/server-auth", () => ({
  setAuthSession: (response: Response) => response,
}));

function buildTelegramInitData(botToken: string, values: Record<string, string>) {
  const params = new URLSearchParams(values);
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const hash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  params.set("hash", hash);
  return params.toString();
}

function makeAuthRequest(initData: string) {
  return new NextRequest("http://localhost/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initData }),
  });
}

describe("POST /api/auth Telegram initData validation", () => {
  const botToken = "test-bot-token";
  const nowSeconds = 1_776_253_600;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(nowSeconds * 1000));
    vi.stubEnv("TELEGRAM_BOT_TOKEN", botToken);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("rejects signed initData older than 24 hours", async () => {
    const { POST } = await import("../route");
    const initData = buildTelegramInitData(botToken, {
      auth_date: String(nowSeconds - 60 * 60 * 24 - 1),
      user: JSON.stringify({ id: 123, first_name: "Test" }),
    });

    const response = await POST(makeAuthRequest(initData));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: "Invalid Telegram signature",
    });
  });

  it("rejects signed initData from too far in the future", async () => {
    const { POST } = await import("../route");
    const initData = buildTelegramInitData(botToken, {
      auth_date: String(nowSeconds + 61),
      user: JSON.stringify({ id: 123, first_name: "Test" }),
    });

    const response = await POST(makeAuthRequest(initData));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: "Invalid Telegram signature",
    });
  });
});
