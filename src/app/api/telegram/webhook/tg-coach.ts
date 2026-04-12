import { db } from "@/lib/db";
import { callAI } from "@/lib/ai-provider";

export const COACH_SYSTEM = `Ты персональный коуч по саморазвитию в приложении LeakFixer Buddy.
Тебе дают вопрос пользователя и его реальные данные за последние 30 дней.
Отвечай КОНКРЕТНО, опираясь на числа из данных — не общими фразами.
Ответ: 3-5 предложений, на русском языке, без markdown, эмодзи допустимы.
Если данных мало — честно скажи об этом и дай общий совет.`;

export async function runCoach(userId: string, question: string): Promise<string> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const [
    userRec,
    dailyStates,
    gymWorkouts,
    ritualCompletions,
    activeRituals,
    _fitnessDays,
    topLeak,
  ] = await Promise.all([
    db.appUser.findUnique({
      where: { id: userId },
      select: { streak: true, day: true, firstName: true },
    }),
    db.dailyState.findMany({ where: { userId, date: { gte: thirtyDaysAgo } } }),
    db.gymWorkout.findMany({
      where: { period: { userId }, date: { gte: thirtyDaysAgo }, status: "completed" },
    }),
    db.ritualCompletion.findMany({
      where: { userId, date: { gte: thirtyDaysAgo }, completed: true },
    }),
    db.ritual.count({ where: { userId, status: "active" } }),
    db.fitnessDaily.findMany({ where: { userId, date: { gte: thirtyDaysAgo } } }),
    db.userAiPattern.findFirst({
      where: { userId, NOT: { leakType: "tg_input_patterns" } },
      orderBy: { updatedAt: "desc" },
      select: { leakType: true, lastAnalysis: true },
    }),
  ]);

  type DS = (typeof dailyStates)[number];
  const avgMood = dailyStates.length
    ? (dailyStates.reduce((s: number, d: DS) => s + (d.mood ?? 5), 0) / dailyStates.length).toFixed(
        1
      )
    : null;
  const avgEnergy = dailyStates.length
    ? (
        dailyStates.reduce((s: number, d: DS) => s + (d.energy ?? 5), 0) / dailyStates.length
      ).toFixed(1)
    : null;
  const avgSleep = dailyStates.filter((d: DS) => d.sleepHours).length
    ? (
        dailyStates.reduce((s: number, d: DS) => s + (d.sleepHours ?? 0), 0) /
        dailyStates.filter((d: DS) => d.sleepHours).length
      ).toFixed(1)
    : null;
  const ritualRate =
    activeRituals > 0 ? Math.round((ritualCompletions.length / (activeRituals * 30)) * 100) : null;
  const avgCalories = null; // FitnessDaily has no calories field

  const context = [
    `Пользователь: ${userRec?.firstName ?? "Аноним"}, стрик ${userRec?.streak ?? 0} дней`,
    `Вопрос: ${question}`,
    `--- Данные за 30 дней ---`,
    avgMood !== null ? `Среднее настроение: ${avgMood}/10` : null,
    avgEnergy !== null ? `Средняя энергия: ${avgEnergy}/10` : null,
    avgSleep !== null ? `Средний сон: ${avgSleep} ч` : null,
    `Тренировок: ${gymWorkouts.length}`,
    ritualRate !== null ? `Ритуалы: ${ritualRate}%` : null,
    avgCalories !== null ? `Среднее ккал/день: ${avgCalories}` : null,
    topLeak?.leakType ? `Основная проблемная зона: ${topLeak.leakType.replace(/_/g, " ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const result = await callAI(COACH_SYSTEM, context, { userId, callType: "tg_coach" });
  return result.text;
}
