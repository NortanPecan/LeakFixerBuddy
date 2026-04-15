import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const serverAuthMock = vi.hoisted(() => ({
  requireAuthenticatedUser: vi.fn(),
  clearAuthSession: vi.fn((response: Response) => response),
}));

vi.mock("@/lib/server-auth", () => serverAuthMock);

vi.mock("@/lib/db", () => ({
  db: {
    appUser: {
      findUnique: vi.fn(),
    },
    dailyState: {
      findFirst: vi.fn(),
    },
  },
}));

let requestNumber = 0;

function makeSessionRequest() {
  requestNumber += 1;

  return new NextRequest("http://localhost/api/auth/session", {
    headers: { "x-forwarded-for": `10.20.0.${requestNumber}` },
  });
}

describe("GET /api/auth/session", () => {
  beforeEach(() => {
    requestNumber = 0;
    vi.clearAllMocks();
  });

  it("preserves the unauthenticated session response", async () => {
    const { GET } = await import("../route");
    serverAuthMock.requireAuthenticatedUser.mockReturnValueOnce({
      error: NextResponse.json(
        {
          error: "Authentication required",
          hint: "Sign in again to restore your session",
        },
        { status: 401 }
      ),
    });

    const response = await GET(makeSessionRequest());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: "Authentication required",
      hint: "Sign in again to restore your session",
    });
  });
});
