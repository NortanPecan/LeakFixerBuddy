import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { callAI } from "@/lib/ai-provider";
import { requireSelf } from "@/lib/server-auth";

const DAILY_TIP_SYSTEM = `Ты персональный коуч по саморазвитию. Пишешь на русском языке.
Тебе дают данные о пользователе за последнюю неделю.
Напиши короткий персонализированный совет на сегодня (2-3 предложения максимум).
Совет должен быть конкретным, actionable и основанным на данных пользователя.
Не используй банальные фразы. Не начинай с "Совет:" или "Рекомендация:".
Учитывай что человек уже делает хорошо и где можно улучшить.
Ответь ТОЛЬКО текстом совета, без заголовков и bullet points.`;

async function buildUserContext(userId: string): Promise<string> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [
    profile,
    userProfile,
    fitnessDays,
    dailyStates,
    ritualCompletions,
    activeRituals,
    gymWorkouts,
  ] = await Promise.all([
    db.appUser.findUnique({
      where: { id: userId },
      select: { streak: true, points: true, day: true, firstName: true },
    }),
    db.userProfile.findUnique({ where: { userId } }),
    db.fitnessDaily.findMany({ where: { userId, date: { gte: sevenDaysAgo } } }),
    db.dailyState.findMany({ where: { userId, date: { gte: sevenDaysAgo } } }),
    db.ritualCompletion.findMany({
      where: { userId, date: { gte: sevenDaysAgo }, completed: true },
    }),
    db.ritual.count({ where: { userId, status: "active" } }),
    db.gymWorkout.findMany({
      where: { period: { userId }, date: { gte: sevenDaysAgo }, status: "completed" },
    }),
  ]);

  const avgMood = dailyStates.length
    ? Math.round((dailyStates.reduce((s, d) => s + (d.mood ?? 5), 0) / dailyStates.length) * 10) /
      10
    : null;
  const avgEnergy = dailyStates.length
    ? Math.round((dailyStates.reduce((s, d) => s + (d.energy ?? 5), 0) / dailyStates.length) * 10) /
      10
    : null;
  // FitnessDaily has no calories field; omit from daily-tip context
  const avgCalories: number | null = null;
  const avgWater = fitnessDays.length
    ? Math.round(fitnessDays.reduce((s, d) => s + (d.water ?? 0), 0) / fitnessDays.length)
    : null;
  const ritualRate =
    activeRituals > 0 ? Math.round((ritualCompletions.length / (activeRituals * 7)) * 100) : null;

  const leakProfile = (userProfile?.leakProfile as string[] | null) ?? [];

  const lines = [
    `Пользователь: ${profile?.firstName ?? "Аноним"}, стрик ${profile?.streak ?? 0} дней, день в приложении: ${profile?.day ?? 1}`,
    avgMood !== null ? `Среднее настроение за неделю: ${avgMood}/10` : null,
    avgEnergy !== null ? `Средняя энергия: ${avgEnergy}/10` : null,
    avgCalories !== null ? `Среднее потребление калорий: ${avgCalories} ккал/день` : null,
    avgWater !== null ? `Среднее потребление воды: ${avgWater} мл/день` : null,
    ritualRate !== null ? `Выполнение ритуалов: ${ritualRate}% за неделю` : null,
    `Тренировок за неделю: ${gymWorkouts.length}`,
    leakProfile.length ? `Основные проблемные зоны: ${leakProfile.slice(0, 3).join(", ")}` : null,
    userProfile?.targetWeight
      ? `Цель по весу: ${userProfile.targetWeight} кг (сейчас ${userProfile.weight ?? "?"} кг)`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  return lines || "Новый пользователь, данных пока мало.";
}

// ─── GET /api/ai/daily-tip?userId=xxx ─────────────────────────────────────────
// Returns today's tip (cached in ai_logs) or generates a new one
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const auth = requireSelf(request, userId);
  if ("error" in auth) return auth.error;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Check cache: already generated today?
  const cached = await db.aiLog.findFirst({
    where: {
      userId,
      callType: "daily_tip",
      success: true,
      createdAt: { gte: todayStart },
    },
    orderBy: { createdAt: "desc" },
  });

  if (cached) {
    return NextResponse.json({
      tip: cached.response,
      provider: cached.provider,
      cached: true,
      createdAt: cached.createdAt,
    });
  }

  // Generate new tip
  try {
    const userContext = await buildUserContext(userId);
    const result = await callAI(DAILY_TIP_SYSTEM, userContext, {
      userId,
      callType: "daily_tip",
    });

    return NextResponse.json({
      tip: result.text,
      provider: result.provider,
      cached: false,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("[daily-tip]", error);
    return NextResponse.json({ error: "AI недоступен" }, { status: 503 });
  }
}

// ─── POST /api/ai/daily-tip ────────────────────────────────────────────────────
// Force-regenerate tip (for cron job)
export async function POST(request: NextRequest) {
  // Cron auth
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { userId?: string };
    const { userId } = body;

    if (userId) {
      // Single user
      const userContext = await buildUserContext(userId);
      const result = await callAI(DAILY_TIP_SYSTEM, userContext, { userId, callType: "daily_tip" });
      return NextResponse.json({ success: true, tip: result.text, provider: result.provider });
    }

    // All active users (last 7 days activity)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const activeUsers = await db.appUser.findMany({
      where: {
        updatedAt: { gte: sevenDaysAgo },
        // Skip users who already got a tip today
        NOT: {
          aiLogs: {
            some: { callType: "daily_tip", success: true, createdAt: { gte: todayStart } },
          },
        },
      },
      select: { id: true },
      take: 100,
    });

    let generated = 0;
    let failed = 0;
    for (const u of activeUsers) {
      try {
        const userContext = await buildUserContext(u.id);
        await callAI(DAILY_TIP_SYSTEM, userContext, { userId: u.id, callType: "daily_tip" });
        generated++;
        // Small delay to avoid rate limiting
        await new Promise((r) => setTimeout(r, 200));
      } catch {
        failed++;
      }
    }

    return NextResponse.json({ success: true, generated, failed, total: activeUsers.length });
  } catch (error) {
    console.error("[daily-tip POST]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
