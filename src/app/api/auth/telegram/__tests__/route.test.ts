import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const authTelegramMock = vi.hoisted(() => ({
  authenticateTelegramUser: vi.fn(),
  verifyTelegramInitData: vi.fn(),
}));

vi.mock("@/lib/auth-telegram", () => authTelegramMock);

vi.mock("@/lib/db", () => ({
  db: {
    appUser: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    userProfile: {
      create: vi.fn(),
    },
    dailyState: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/server-auth", () => ({
  setAuthSession: (response: Response) => response,
}));

let requestNumber = 0;

function makeTelegramAuthRequest(body: unknown) {
  requestNumber += 1;

  return new NextRequest("http://localhost/api/auth/telegram", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": `10.10.0.${requestNumber}`,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/telegram", () => {
  beforeEach(() => {
    requestNumber = 0;
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("rejects malformed request bodies before auth work", async () => {
    const { POST } = await import("../route");

    const response = await POST(makeTelegramAuthRequest({ initData: 123 }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: "Invalid Telegram data" });
    expect(authTelegramMock.verifyTelegramInitData).not.toHaveBeenCalled();
    expect(authTelegramMock.authenticateTelegramUser).not.toHaveBeenCalled();
  });

  it("keeps the existing missing initData error shape", async () => {
    const { POST } = await import("../route");
    authTelegramMock.verifyTelegramInitData.mockReturnValueOnce({
      valid: false,
      error: "No hash in initData",
    });

    const response = await POST(makeTelegramAuthRequest({}));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: "No hash in initData" });
    expect(authTelegramMock.verifyTelegramInitData).toHaveBeenCalledWith("");
  });

  it("rejects demo auth when demo mode is disabled", async () => {
    const { POST } = await import("../route");
    vi.stubEnv("DEMO_MODE", "false");

    const response = await POST(makeTelegramAuthRequest({ isDemo: true }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: "Demo mode is disabled" });
    expect(authTelegramMock.authenticateTelegramUser).not.toHaveBeenCalled();
  });
});
