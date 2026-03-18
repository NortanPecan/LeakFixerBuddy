import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { normalizeToDate } from '@/lib/date-utils'

// ─── Day score formula (mirrors DailySummaryScreen) ───────────────────────────
// rituals 25%, water 20%, mood 20%, energy 15%, morning checkin 10%, evening 10%

async function calcDayScore(userId: string, date: Date): Promise<number | null> {
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  const [fitnessDaily, dailyState, ritualCompletions, activeRituals, checkins] =
    await Promise.all([
      db.fitnessDaily.findFirst({ where: { userId, date: startOfDay } }),
      db.dailyState.findFirst({ where: { userId, date: startOfDay } }),
      db.ritualCompletion.findMany({
        where: { userId, date: startOfDay, completed: true },
      }),
      db.ritual.findMany({ where: { userId, status: 'active' } }),
      db.dailyCheckin
        .findMany({ where: { userId, date: startOfDay } })
        .catch(() => []),
    ])

  let score = 0
  let weight = 0

  // Rituals 25%
  if (activeRituals.length > 0) {
    score += (ritualCompletions.length / activeRituals.length) * 25
    weight += 25
  }

  // Water 20%
  if (fitnessDaily) {
    const target = fitnessDaily.waterTarget ?? 2000
    const waterPct = Math.min(1, (fitnessDaily.water ?? 0) / target)
    score += waterPct * 20
    weight += 20
  }

  // Mood 20%
  if (dailyState?.mood) {
    score += ((dailyState.mood - 1) / 9) * 20
    weight += 20
  }

  // Energy 15%
  if (dailyState?.energy) {
    score += ((dailyState.energy - 1) / 9) * 15
    weight += 15
  }

  // Morning checkin 10%
  const morningDone = checkins.some((c: { type: string }) => c.type === 'morning')
  if (morningDone) score += 10
  weight += 10

  // Evening checkin 10%
  const eveningDone = checkins.some((c: { type: string }) => c.type === 'evening')
  if (eveningDone) score += 10
  weight += 10

  if (weight === 0) return null
  return Math.round((score / weight) * 100)
}

// ─── Achievement definitions ──────────────────────────────────────────────────

const ACHIEVEMENTS = [
  {
    code: 'GREAT_DAY_FIRST',
    label: 'Отличный день!',
    emoji: '🌟',
    desc: 'Первый раз набрать 80+ баллов за день',
    check: async (userId: string, todayScore: number | null) => {
      if (!todayScore || todayScore < 80) return false
      const existing = await db.achievement.findUnique({
        where: { userId_code: { userId, code: 'GREAT_DAY_FIRST' } },
      })
      return !existing
    },
  },
  {
    code: 'QUALITY_WEEK',
    label: 'Неделя качества',
    emoji: '🏆',
    desc: '7 дней подряд с результатом 70+ баллов',
    check: async (userId: string, todayScore: number | null) => {
      if (!todayScore || todayScore < 70) return false
      const dates: Date[] = []
      for (let i = 0; i < 7; i++) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        dates.push(normalizeToDate(d))
      }
      for (const d of dates) {
        const s = await calcDayScore(userId, d)
        if (!s || s < 70) return false
      }
      const existing = await db.achievement.findUnique({
        where: { userId_code: { userId, code: 'QUALITY_WEEK' } },
      })
      return !existing
    },
  },
  {
    code: 'STREAK_7',
    label: '7 дней подряд',
    emoji: '🔥',
    desc: 'Использовать приложение 7 дней без перерыва',
    check: async (userId: string, _todayScore: number | null) => {
      const existing = await db.achievement.findUnique({
        where: { userId_code: { userId, code: 'STREAK_7' } },
      })
      if (existing) return false
      const user = await db.user.findUnique({ where: { id: userId }, select: { streak: true } })
      return (user?.streak ?? 0) >= 7
    },
  },
  {
    code: 'STREAK_30',
    label: '30 дней подряд',
    emoji: '💎',
    desc: 'Использовать приложение 30 дней без перерыва',
    check: async (userId: string, _todayScore: number | null) => {
      const existing = await db.achievement.findUnique({
        where: { userId_code: { userId, code: 'STREAK_30' } },
      })
      if (existing) return false
      const user = await db.user.findUnique({ where: { id: userId }, select: { streak: true } })
      return (user?.streak ?? 0) >= 30
    },
  },
  {
    code: 'GYM_10',
    label: '10 тренировок',
    emoji: '💪',
    desc: 'Завершить 10 тренировок в зале',
    check: async (userId: string, _todayScore: number | null) => {
      const existing = await db.achievement.findUnique({
        where: { userId_code: { userId, code: 'GYM_10' } },
      })
      if (existing) return false
      const count = await db.gymWorkout.count({
        where: { period: { userId }, status: 'completed' },
      })
      return count >= 10
    },
  },
  {
    code: 'WATER_WEEK',
    label: 'Водная неделя',
    emoji: '💧',
    desc: '7 дней подряд выполнять норму воды',
    check: async (userId: string, _todayScore: number | null) => {
      const existing = await db.achievement.findUnique({
        where: { userId_code: { userId, code: 'WATER_WEEK' } },
      })
      if (existing) return false
      const dates: Date[] = []
      for (let i = 0; i < 7; i++) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        dates.push(normalizeToDate(d))
      }
      for (const d of dates) {
        const fd = await db.fitnessDaily.findFirst({ where: { userId, date: d } })
        if (!fd) return false
        const target = fd.waterTarget ?? 2000
        if ((fd.water ?? 0) < target) return false
      }
      return true
    },
  },
]

// ─── Route ────────────────────────────────────────────────────────────────────

// POST /api/achievements/check — check & award achievements for a user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const today = normalizeToDate(new Date())
    const todayScore = await calcDayScore(userId, today)

    const newAchievements: { code: string; label: string; emoji: string; desc: string }[] = []

    for (const achDef of ACHIEVEMENTS) {
      const earned = await achDef.check(userId, todayScore)
      if (earned) {
        try {
          await db.achievement.create({
            data: { userId, code: achDef.code, metadata: JSON.stringify({ score: todayScore, date: today.toISOString() }) },
          })
          newAchievements.push({ code: achDef.code, label: achDef.label, emoji: achDef.emoji, desc: achDef.desc })
        } catch {
          // Already exists (race condition) — skip
        }
      }
    }

    return NextResponse.json({ success: true, newAchievements, dayScore: todayScore })
  } catch (error) {
    console.error('[achievements/check] error:', error)
    return NextResponse.json({ error: 'Failed to check achievements' }, { status: 500 })
  }
}

// GET /api/achievements/check?userId=xxx — list all achievements
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const achievements = await db.achievement.findMany({
      where: { userId },
      orderBy: { obtainedAt: 'desc' },
    })

    return NextResponse.json({ success: true, achievements })
  } catch (error) {
    console.error('[achievements/check GET] error:', error)
    return NextResponse.json({ error: 'Failed to get achievements' }, { status: 500 })
  }
}
