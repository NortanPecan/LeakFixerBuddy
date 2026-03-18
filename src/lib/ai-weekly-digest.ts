/**
 * Shared weekly digest generator.
 * Used by:
 *  - GET /api/telegram/send-weekly-digest (cron batch)
 *  - Telegram webhook command «неделя» (on demand, single user)
 */

import { db } from '@/lib/db'
import { callAI } from '@/lib/ai-provider'

export const WEEKLY_DIGEST_SYSTEM = `Ты персональный коуч по саморазвитию в приложении LeakFixer Buddy.
Тебе дают статистику пользователя за прошедшую неделю.
Напиши краткое резюме недели: 3-4 предложения на русском языке.
Структура: 1) что было лучшим за неделю, 2) главная проблемная зона, 3) один конкретный совет на следующую неделю.
Правила: без markdown-разметки, эмодзи допустимы, используй конкретные цифры из данных, поддерживающий тон.
Ответь ТОЛЬКО текстом резюме, без заголовков.`

export const LEAK_LABELS: Record<string, string> = {
  low_energy: 'низкая энергия',
  chronic_low_energy: 'хронически низкая энергия',
  no_gym: 'нет тренировок',
  gym_dropout: 'прекратил ходить в зал',
  ritual_consistency: 'непоследовательность в ритуалах',
  ritual_erosion: 'угасание ритуалов',
  missed_checkins: 'пропущенные чек-апы',
  calorie_spikes: 'скачки калорий',
  sleep_deficit: 'недосып',
  expense_spike: 'всплески расходов',
  high_stress: 'высокий стресс',
  weekend_ritual_drop: 'провалы ритуалов в выходные',
}

export function getWeekStart(): Date {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export async function generateWeeklyDigest(userId: string, firstName: string): Promise<string | null> {
  const weekStart = getWeekStart()
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  sevenDaysAgo.setHours(0, 0, 0, 0)

  // Check cache first (within current week)
  const cached = await db.aiLog.findFirst({
    where: { userId, callType: 'weekly_digest', success: true, createdAt: { gte: weekStart } },
    select: { response: true },
  })
  if (cached) return cached.response

  // Collect stats
  const [user, fitnessDays, dailyStates, ritualCompletions, activeRituals, gymWorkouts, topLeak] =
    await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: { streak: true, day: true },
      }),
      db.fitnessDaily.findMany({ where: { userId, date: { gte: sevenDaysAgo } } }),
      db.dailyState.findMany({ where: { userId, date: { gte: sevenDaysAgo } } }),
      db.ritualCompletion.findMany({
        where: { userId, date: { gte: sevenDaysAgo }, completed: true },
      }),
      db.ritual.count({ where: { userId, status: 'active' } }),
      db.gymWorkout.findMany({
        where: { period: { userId }, date: { gte: sevenDaysAgo }, status: 'completed' },
      }),
      db.userAiPattern.findFirst({
        where: { userId, NOT: { leakType: 'tg_input_patterns' } },
        orderBy: { updatedAt: 'desc' },
        select: { leakType: true },
      }),
    ])

  const avgMood = dailyStates.length
    ? (dailyStates.reduce((s, d) => s + (d.mood ?? 5), 0) / dailyStates.length).toFixed(1)
    : null
  const avgEnergy = dailyStates.length
    ? (dailyStates.reduce((s, d) => s + (d.energy ?? 5), 0) / dailyStates.length).toFixed(1)
    : null
  const avgSleep = dailyStates.filter(d => d.sleepHours).length
    ? (
        dailyStates.reduce((s, d) => s + (d.sleepHours ?? 0), 0) /
        dailyStates.filter(d => d.sleepHours).length
      ).toFixed(1)
    : null
  const avgCalories = fitnessDays.length
    ? Math.round(fitnessDays.reduce((s, d) => s + (d.calories ?? 0), 0) / fitnessDays.length)
    : null
  const ritualRate =
    activeRituals > 0
      ? Math.round((ritualCompletions.length / (activeRituals * 7)) * 100)
      : null
  const topLeakLabel = topLeak?.leakType
    ? (LEAK_LABELS[topLeak.leakType] ?? topLeak.leakType.replace(/_/g, ' '))
    : null

  const lines = [
    `Пользователь: ${firstName}, стрик ${user?.streak ?? 0} дней (день ${user?.day ?? 1})`,
    avgMood !== null ? `Среднее настроение: ${avgMood}/10` : null,
    avgEnergy !== null ? `Средняя энергия: ${avgEnergy}/10` : null,
    avgSleep !== null ? `Средний сон: ${avgSleep} ч` : null,
    `Тренировок за неделю: ${gymWorkouts.length}`,
    ritualRate !== null ? `Ритуалы: ${ritualRate}%` : null,
    avgCalories !== null ? `Среднее ккал/день: ${avgCalories}` : null,
    topLeakLabel ? `Главный лик: ${topLeakLabel}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const context = lines || 'Новый пользователь, данных пока мало.'

  const result = await callAI(WEEKLY_DIGEST_SYSTEM, context, {
    userId,
    callType: 'weekly_digest',
  })

  return result.text
}
