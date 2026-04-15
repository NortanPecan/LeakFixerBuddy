import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createLegacyPasswordHash } from "@/lib/password-hash";

const dbMock = vi.hoisted(() => ({
  appUser: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  dailyState: {
    findFirst: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  db: dbMock,
}));

vi.mock("@/lib/server-auth", () => ({
  setAuthSession: (response: Response) => response,
  getAuthSession: vi.fn(),
}));

const baseUser = {
  id: "11111111-1111-1111-1111-111111111111",
  telegramId: null,
  username: "test",
  firstName: "Test",
  lastName: null,
  photoUrl: null,
  language: "ru",
  day: 1,
  streak: 0,
  points: 0,
  streakShieldUsedAt: null,
  profile: { waterBaseline: 2000 },
};

let requestNumber = 0;

function makeEmailAuthRequest(body: unknown) {
  requestNumber += 1;

  return new NextRequest("http://localhost/api/auth/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": `127.0.0.${requestNumber}`,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/email", () => {
  beforeEach(() => {
    requestNumber = 0;
    vi.clearAllMocks();
  });

  it("creates new email accounts with scrypt password hashes", async () => {
    const { POST } = await import("../route");
    dbMock.appUser.findUnique.mockResolvedValueOnce(null);
    dbMock.appUser.create.mockImplementationOnce(({ data }) =>
      Promise.resolve({ ...baseUser, ...data, profile: baseUser.profile })
    );

    const response = await POST(
      makeEmailAuthRequest({
        action: "signup",
        email: "New.User@example.com",
        password: "strong-password",
        name: "New User",
      })
    );

    expect(response.status).toBe(200);
    expect(dbMock.appUser.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "new.user@example.com",
          emailSalt: "scrypt",
          passwordHash: expect.stringMatching(/^scrypt\$/),
        }),
      })
    );
  });

  it("migrates legacy SHA-256 password hashes after successful signin", async () => {
    const { POST } = await import("../route");
    const legacySalt = "legacy-salt";
    const legacyHash = createLegacyPasswordHash("old-password", legacySalt);

    dbMock.appUser.findUnique.mockResolvedValueOnce({
      ...baseUser,
      passwordHash: legacyHash,
      emailSalt: legacySalt,
    });
    dbMock.appUser.update.mockResolvedValueOnce(baseUser);
    dbMock.dailyState.findFirst.mockResolvedValue(null);

    const response = await POST(
      makeEmailAuthRequest({
        action: "signin",
        email: "legacy@example.com",
        password: "old-password",
      })
    );

    expect(response.status).toBe(200);
    expect(dbMock.appUser.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: baseUser.id },
        data: expect.objectContaining({
          emailSalt: "scrypt",
          passwordHash: expect.stringMatching(/^scrypt\$/),
          lastLoginAt: expect.any(Date),
        }),
      })
    );
    expect(dbMock.appUser.update.mock.calls[0]?.[0].data.passwordHash).not.toBe(legacyHash);
  });

  it("rejects wrong legacy passwords without rehashing", async () => {
    const { POST } = await import("../route");
    dbMock.appUser.findUnique.mockResolvedValueOnce({
      ...baseUser,
      passwordHash: createLegacyPasswordHash("old-password", "legacy-salt"),
      emailSalt: "legacy-salt",
    });

    const response = await POST(
      makeEmailAuthRequest({
        action: "signin",
        email: "legacy@example.com",
        password: "wrong-password",
      })
    );

    await expect(response.json()).resolves.toMatchObject({ error: "Wrong password" });
    expect(response.status).toBe(401);
    expect(dbMock.appUser.update).not.toHaveBeenCalled();
  });

  it("rejects Telegram-only accounts on email signin", async () => {
    const { POST } = await import("../route");
    dbMock.appUser.findUnique.mockResolvedValueOnce({
      ...baseUser,
      passwordHash: null,
      emailSalt: null,
    });

    const response = await POST(
      makeEmailAuthRequest({
        action: "signin",
        email: "telegram@example.com",
        password: "some-password",
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "This account uses Telegram login. Please sign in via Telegram.",
    });
  });

  it("rejects invalid actions before touching the database", async () => {
    const { POST } = await import("../route");

    const response = await POST(
      makeEmailAuthRequest({
        action: "reset",
        email: "user@example.com",
        password: "some-password",
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "action must be signup or signin",
    });
    expect(dbMock.appUser.findUnique).not.toHaveBeenCalled();
  });
});
