import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler, RATE_LIMITS } from "@/lib/api-handler";
import { parseJsonBody } from "@/lib/api-body";
import { authenticateTelegramUser, verifyTelegramInitData } from "@/lib/auth-telegram";
import { db } from "@/lib/db";
import { setAuthSession } from "@/lib/server-auth";

const TelegramAuthBodySchema = z
  .object({
    initData: z.string().optional(),
    isDemo: z.boolean().optional(),
  })
  .passthrough();

type TelegramAuthBody = z.infer<typeof TelegramAuthBodySchema>;

type TelegramUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
};

function isDemoModeEnabled() {
  return process.env.DEMO_MODE === "true";
}

/**
 * POST /api/auth/telegram
 * Authenticate user via Telegram WebApp
 */
export const POST = apiHandler(
  async ({ request }) => {
    const parsedBody = await parseTelegramAuthBody(request);
    if (parsedBody instanceof NextResponse) return parsedBody;

    return authenticateTelegramRequest(parsedBody);
  },
  { auth: false, rateLimit: RATE_LIMITS.AUTH, rateLimitKey: "auth:telegram" }
);

/**
 * GET /api/auth/telegram?demo=true
 * Demo authentication for testing
 */
export const GET = apiHandler(
  async ({ request }) => {
    const isDemo = request.nextUrl.searchParams.get("demo") === "true";

    if (!isDemo) {
      return NextResponse.json({ error: "Use POST with Telegram initData" }, { status: 400 });
    }

    return authenticateTelegramRequest({ isDemo: true });
  },
  { auth: false, rateLimit: RATE_LIMITS.AUTH, rateLimitKey: "auth:telegram-demo" }
);

async function parseTelegramAuthBody(
  request: NextRequest
): Promise<TelegramAuthBody | NextResponse> {
  const parsed = await parseJsonBody(request, TelegramAuthBodySchema, {
    invalidBodyMessage: "Invalid Telegram data",
  });
  if (!parsed.success) {
    return parsed.response;
  }

  return parsed.data;
}

async function authenticateTelegramRequest(body: TelegramAuthBody) {
  let telegramUser: TelegramUser;
  const isDemo = body.isDemo === true;

  if (isDemo) {
    if (!isDemoModeEnabled()) {
      return NextResponse.json({ error: "Demo mode is disabled" }, { status: 403 });
    }

    telegramUser = {
      id: 9000000001,
      first_name: "Demo",
      last_name: "User",
      username: "demo_user",
      language_code: "ru",
      photo_url: undefined,
    };
  } else {
    const verification = verifyTelegramInitData(body.initData ?? "");

    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error || "Invalid Telegram data" },
        { status: 401 }
      );
    }

    if (!verification.user) {
      return NextResponse.json({ error: "Invalid Telegram data" }, { status: 401 });
    }

    telegramUser = verification.user;
  }

  const authResult = await authenticateTelegramUser(telegramUser);

  if (authResult.error || !authResult.user) {
    return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
  }

  const user = authResult.user;
  const isNewUser = authResult.isNewUser;

  const telegramIdBigInt = BigInt(telegramUser.id);

  let localUser = await db.appUser.findUnique({
    where: { telegramId: telegramIdBigInt },
    include: { profile: true },
  });

  if (!localUser) {
    localUser = await db.appUser.create({
      data: {
        telegramId: telegramIdBigInt,
        telegramUsername: telegramUser.username,
        telegramFirstName: telegramUser.first_name,
        telegramLastName: telegramUser.last_name,
        telegramLanguageCode: telegramUser.language_code,
        telegramPhotoUrl: telegramUser.photo_url,
        authProvider: "telegram",
        lastLoginAt: new Date(),
      },
      include: { profile: true },
    });

    await db.userProfile.create({
      data: { userId: localUser.id },
    });
  } else {
    await db.appUser.update({
      where: { id: localUser.id },
      data: {
        telegramUsername: telegramUser.username,
        telegramFirstName: telegramUser.first_name,
        telegramLastName: telegramUser.last_name,
        lastLoginAt: new Date(),
      },
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dailyState = await db.dailyState.findFirst({
    where: {
      userId: localUser.id,
      date: today,
    },
  });

  const response = NextResponse.json({
    success: true,
    user: {
      id: localUser.id,
      telegramId: localUser.telegramId?.toString(),
      username: localUser.telegramUsername,
      firstName: localUser.telegramFirstName,
      lastName: localUser.telegramLastName,
      photoUrl: localUser.telegramPhotoUrl,
      language: localUser.language,
      day: localUser.day,
      streak: localUser.streak,
      points: localUser.points,
    },
    profile: localUser.profile,
    globalState: dailyState
      ? {
          mood: dailyState.mood,
          energy: dailyState.energy,
          trend: 0,
        }
      : null,
    isNewUser,
    isDemo,
    supabaseUserId: user.id,
  });

  return setAuthSession(response, localUser.id, isDemo ? "demo" : "telegram");
}
