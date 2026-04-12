import { NextRequest, NextResponse } from "next/server";
import { authenticateTelegramUser, verifyTelegramInitData } from "@/lib/auth-telegram";
import { db } from "@/lib/db";
import { setAuthSession } from "@/lib/server-auth";

function isDemoModeEnabled() {
  return process.env.DEMO_MODE === "true";
}

/**
 * POST /api/auth/telegram
 * Authenticate user via Telegram WebApp
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { initData, isDemo } = body;

    let telegramUser;

    if (isDemo) {
      if (!isDemoModeEnabled()) {
        return NextResponse.json({ error: "Demo mode is disabled" }, { status: 403 });
      }

      // Demo mode - create fake Telegram user
      telegramUser = {
        id: 9000000001,
        first_name: "Demo",
        last_name: "User",
        username: "demo_user",
        language_code: "ru",
        photo_url: undefined,
      };
    } else {
      // Verify Telegram initData
      const verification = verifyTelegramInitData(initData);

      if (!verification.valid) {
        return NextResponse.json(
          { error: verification.error || "Invalid Telegram data" },
          { status: 401 }
        );
      }

      telegramUser = verification.user!;
    }

    // Authenticate with Supabase
    const authResult = await authenticateTelegramUser(telegramUser);

    if (authResult.error) {
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
    }

    const user = authResult.user!;
    const isNewUser = authResult.isNewUser;

    // Sync with local database (for Prisma compatibility)
    const telegramIdBigInt = BigInt(telegramUser.id);

    let localUser = await db.appUser.findUnique({
      where: { telegramId: telegramIdBigInt },
      include: { profile: true },
    });

    if (!localUser) {
      // Create local user
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

      // Create profile
      await db.userProfile.create({
        data: { userId: localUser.id },
      });
    } else {
      // Update last login
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

    // Get daily state for mood/energy
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
      isDemo: isDemo || false,
      supabaseUserId: user.id,
    });

    return setAuthSession(response, localUser.id, isDemo ? "demo" : "telegram");
  } catch (error) {
    console.error("Telegram auth error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/auth/telegram?demo=true
 * Demo authentication for testing
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const isDemo = searchParams.get("demo") === "true";

  if (!isDemo) {
    return NextResponse.json({ error: "Use POST with Telegram initData" }, { status: 400 });
  }

  if (!isDemoModeEnabled()) {
    return NextResponse.json({ error: "Demo mode is disabled" }, { status: 403 });
  }

  // Call POST with demo mode
  return POST(
    new NextRequest(request.url, {
      method: "POST",
      body: JSON.stringify({ isDemo: true }),
      headers: { "Content-Type": "application/json" },
    })
  );
}
