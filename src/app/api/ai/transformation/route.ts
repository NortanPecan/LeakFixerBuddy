/**
 * GET /api/ai/transformation?userId=xxx
 *
 * Compares user metrics for first 30 days vs last 30 days,
 * generates an AI narrative "How I changed".
 * Cached for 7 days in ai_logs (callType='transformation').
 * Returns 422 if user has fewer than 30 days in the app.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { callAI } from "@/lib/ai-provider";
import { requireSelf } from "@/lib/server-auth";

const TRANSFORMATION_SYSTEM = `Ты персональный коуч по саморазвитию в приложении LeakFixer Buddy.
Тебе дают сравнение показателей пользователя: первые 30 дней vs последние 30 дней.
Напиши короткий нарратив «Как я изменился» — 3-5 предложений на русском языке.
Структура: конкретные изменения цифрами, что улучшилось больше всего, мотивирующее заключение.
Правила: конкретные числа из данных, без markdown-разметки, эмодзи допустимы, вдохновляющий тон.
Ответь ТОЛЬКО нарративом, без заголовков.`;

function avg(arr: number[]): number | null {
  return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const auth = requireSelf(request, userId);
  if ("error" in auth) return auth.error;

  // Cache: 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const cached = await db.aiLog.findFirst({
    where: { userId, callType: "transformation", success: true, createdAt: { gte: sevenDaysAgo } },
    orderBy: { createdAt: "desc" },
  });
  if (cached) {
    return NextResponse.json({
      narrative: cached.response,
      cached: true,
      createdAt: cached.createdAt,
    });
  }

  // Need at least 30 days of data
  const user = await db.appUser.findUnique({
    where: { id: userId },
    select: { day: true, createdAt: true, firstName: true, streak: true },
  });
  if (!user || (user.day ?? 0) < 30) {
    return NextResponse.json(
      { error: "insufficient_data", message: "Нужно минимум 30 дней в приложении" },
      { status: 422 }
    );
  }

  const createdAt = user.createdAt;
  const first30End = new Date(createdAt);
  first30End.setDate(first30End.getDate() + 30);
  first30End.setHours(23, 59, 59, 999);

  const last30Start = new Date();
  last30Start.setDate(last30Start.getDate() - 30);
  last30Start.setHours(0, 0, 0, 0);

  const [
    first30States,
    last30States,
    first30Gym,
    last30Gym,
    first30Rituals,
    last30Rituals,
    first30Fitness,
    last30Fitness,
    activeRituals,
    firstWeight,
    lastWeight,
  ] = await Promise.all([
    db.dailyState.findMany({ where: { userId, date: { gte: createdAt, lte: first30End } } }),
    db.dailyState.findMany({ where: { userId, date: { gte: last30Start } } }),
    db.gymWorkout.count({
      where: { period: { userId }, date: { gte: createdAt, lte: first30End }, status: "completed" },
    }),
    db.gymWorkout.count({
      where: { period: { userId }, date: { gte: last30Start }, status: "completed" },
    }),
    db.ritualCompletion.count({
      where: { userId, date: { gte: createdAt, lte: first30End }, completed: true },
    }),
    db.ritualCompletion.count({ where: { userId, date: { gte: last30Start }, completed: true } }),
    db.fitnessDaily.findMany({ where: { userId, date: { gte: createdAt, lte: first30End } } }),
    db.fitnessDaily.findMany({ where: { userId, date: { gte: last30Start } } }),
    db.ritual.count({ where: { userId, status: "active" } }),
    db.measurement.findFirst({ where: { userId, type: "weight" }, orderBy: { date: "asc" } }),
    db.measurement.findFirst({ where: { userId, type: "weight" }, orderBy: { date: "desc" } }),
  ]);

  const avgMoodFirst = avg(first30States.map((d) => d.mood).filter((v): v is number => v !== null));
  const avgMoodLast = avg(last30States.map((d) => d.mood).filter((v): v is number => v !== null));
  const avgEnergyFirst = avg(
    first30States.map((d) => d.energy).filter((v): v is number => v !== null)
  );
  const avgEnergyLast = avg(
    last30States.map((d) => d.energy).filter((v): v is number => v !== null)
  );
  const avgCalFirst: number | null = null; // FitnessDaily has no calories field
  const avgCalLast: number | null = null;
  const ritualRateFirst =
    activeRituals > 0 ? Math.round((first30Rituals / (activeRituals * 30)) * 100) : null;
  const ritualRateLast =
    activeRituals > 0 ? Math.round((last30Rituals / (activeRituals * 30)) * 100) : null;
  const weightDelta =
    firstWeight && lastWeight && firstWeight.id !== lastWeight.id
      ? lastWeight.value - firstWeight.value
      : null;

  const f = (n: number | null) => (n !== null ? n.toFixed(1) : "—");

  const lines = [
    `Пользователь: ${user.firstName ?? "Аноним"}, в приложении ${user.day} дней, стрик: ${user.streak}`,
    `--- Первые 30 дней ---`,
    avgMoodFirst !== null ? `Настроение: ${f(avgMoodFirst)}/10` : null,
    avgEnergyFirst !== null ? `Энергия: ${f(avgEnergyFirst)}/10` : null,
    `Тренировок: ${first30Gym}`,
    ritualRateFirst !== null ? `Ритуалы: ${ritualRateFirst}%` : null,
    avgCalFirst !== null ? `Среднее ккал: ${Math.round(avgCalFirst)}` : null,
    `--- Последние 30 дней ---`,
    avgMoodLast !== null ? `Настроение: ${f(avgMoodLast)}/10` : null,
    avgEnergyLast !== null ? `Энергия: ${f(avgEnergyLast)}/10` : null,
    `Тренировок: ${last30Gym}`,
    ritualRateLast !== null ? `Ритуалы: ${ritualRateLast}%` : null,
    avgCalLast !== null ? `Среднее ккал: ${Math.round(avgCalLast)}` : null,
    weightDelta !== null
      ? `Изменение веса: ${weightDelta > 0 ? "+" : ""}${weightDelta.toFixed(1)} кг`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const result = await callAI(TRANSFORMATION_SYSTEM, lines, {
      userId,
      callType: "transformation",
    });

    return NextResponse.json({
      narrative: result.text,
      cached: false,
      createdAt: new Date(),
      metrics: {
        moodFirst: avgMoodFirst !== null ? +avgMoodFirst.toFixed(1) : null,
        moodLast: avgMoodLast !== null ? +avgMoodLast.toFixed(1) : null,
        energyFirst: avgEnergyFirst !== null ? +avgEnergyFirst.toFixed(1) : null,
        energyLast: avgEnergyLast !== null ? +avgEnergyLast.toFixed(1) : null,
        gymFirst: first30Gym,
        gymLast: last30Gym,
        ritualRateFirst,
        ritualRateLast,
        weightDelta: weightDelta !== null ? +weightDelta.toFixed(1) : null,
        dayCount: user.day,
      },
    });
  } catch (error) {
    console.error("[transformation GET]", error);
    return NextResponse.json({ error: "AI недоступен" }, { status: 503 });
  }
}
