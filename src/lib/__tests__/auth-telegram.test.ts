import { createHmac } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verifyTelegramInitData } from "@/lib/auth-telegram";

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

describe("verifyTelegramInitData", () => {
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

  it("accepts fresh signed initData", () => {
    const initData = buildTelegramInitData(botToken, {
      auth_date: String(nowSeconds),
      user: JSON.stringify({ id: 123, first_name: "Test" }),
    });

    expect(verifyTelegramInitData(initData)).toMatchObject({
      valid: true,
      user: { id: 123, first_name: "Test" },
    });
  });

  it("rejects signed initData older than 24 hours", () => {
    const initData = buildTelegramInitData(botToken, {
      auth_date: String(nowSeconds - 60 * 60 * 24 - 1),
      user: JSON.stringify({ id: 123, first_name: "Test" }),
    });

    expect(verifyTelegramInitData(initData)).toEqual({
      valid: false,
      error: "Invalid Telegram signature",
    });
  });

  it("rejects signed initData from too far in the future", () => {
    const initData = buildTelegramInitData(botToken, {
      auth_date: String(nowSeconds + 61),
      user: JSON.stringify({ id: 123, first_name: "Test" }),
    });

    expect(verifyTelegramInitData(initData)).toEqual({
      valid: false,
      error: "Invalid Telegram signature",
    });
  });

  it("rejects malformed hex signatures without throwing", () => {
    const params = new URLSearchParams({
      auth_date: String(nowSeconds),
      user: JSON.stringify({ id: 123, first_name: "Test" }),
      hash: "not-hex",
    });

    expect(verifyTelegramInitData(params.toString())).toEqual({
      valid: false,
      error: "Invalid Telegram signature",
    });
  });
});
