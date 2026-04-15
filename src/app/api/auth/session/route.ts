import { NextResponse } from "next/server";
import { apiHandler, InternalError, RATE_LIMITS } from "@/lib/api-handler";
import { db } from "@/lib/db";
import { getMoodStatusText } from "@/lib/mood-utils";
import { clearAuthSession, requireAuthenticatedUser } from "@/lib/server-auth";

function serializeUser(user: {
  id: string;
  telegramId?: bigint | null;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  photoUrl?: string | null;
  language: string;
  day: number;
  streak: number;
  points: number;
  streakShieldUsedAt?: Date | null;
}) {
  return {
    id: user.id,
    telegramId: user.telegramId ? user.telegramId.toString() : null,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    photoUrl: user.photoUrl,
    language: user.language,
    day: user.day,
    streak: user.streak,
    points: user.points,
    streakShieldUsedAt: user.streakShieldUsedAt?.toISOString() ?? null,
  };
}

export const GET = apiHandler(
  async ({ request }) => {
    const auth = requireAuthenticatedUser(request);
    if ("error" in auth) {
      return auth.error;
    }

    try {
      const user = await db.appUser.findUnique({
        where: { id: auth.session.userId },
        include: { profile: true },
      });

      if (!user) {
        return clearAuthSession(
          NextResponse.json({ error: "Session user not found" }, { status: 401 })
        );
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const [todayState, yesterdayState] = await Promise.all([
        db.dailyState.findFirst({ where: { userId: user.id, date: today } }),
        db.dailyState.findFirst({ where: { userId: user.id, date: yesterday } }),
      ]);

      const globalState = todayState?.mood
        ? {
            mood: todayState.mood,
            energy: todayState.energy || 5,
            trend: yesterdayState?.mood ? todayState.mood - yesterdayState.mood : 0,
            status: getMoodStatusText(todayState.mood),
          }
        : null;

      return NextResponse.json({
        success: true,
        user: serializeUser(user),
        profile: user.profile,
        globalState,
        isDemo: auth.session.mode === "demo",
        isOwner: false,
      });
    } catch (error) {
      console.error("[Auth Session] Error:", error);
      throw new InternalError("Failed to restore session");
    }
  },
  { auth: false, rateLimit: RATE_LIMITS.API, rateLimitKey: "auth:session" }
);

export const DELETE = apiHandler(
  async () => clearAuthSession(NextResponse.json({ success: true })),
  { auth: false, rateLimit: RATE_LIMITS.API, rateLimitKey: "auth:session-delete" }
);
