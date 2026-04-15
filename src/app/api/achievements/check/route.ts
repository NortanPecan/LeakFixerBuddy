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
      // Check it's the first time
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
      // Check last 7 days all have score >= 70
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
      sevenDaysAgo.setHours(0, 0, 0, 0)

      // Get a streak counter by computing scores for last 7 days
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

      // Don't re-award if already earned today
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
    desc: 'Серия из 7 дней активности',
    check: async (userId: string, _todayScore: number | null) => {
      const user = await db.appUser.findUnique({ where: { id: userId }, select: { streak: true } })
      if (!user || user.streak < 7) return false
      const existing = await db.achievement.findUnique({
        where: { userId_code: { userId, code: 'STREAK_7' } },
      })
      return !existing
    },
  },
  {
    code: 'STREAK_30',
    label: 'Месяц силы',
    emoji: '💎',
    desc: 'Серия из 30 дней активности',
    check: async (userId: string, _todayScore: number | null) => {
      const user = await db.appUser.findUnique({ where: { id: userId }, select: { streak: true } })
      if (!user || user.streak < 30) return false
      const existing = await db.achievement.findUnique({
        where: { userId_code: { userId, code: 'STREAK_30' } },
      })
      return !existing
    },
  },
  {
    code: 'GYM_10',
    label: 'Железный',
    emoji: '💪',
    desc: '10 тренировок выполнено',
    check: async (userId: string, _todayScore: number | null) => {
      const count = await db.gymWorkout.count({
        where: { period: { userId }, status: 'completed' },
      })
      if (count < 10) return false
      const existing = await db.achievement.findUnique({
        where: { userId_code: { userId, code: 'GYM_10' } },
      })
      return !existing
    },
  },
  {
    code: 'WATER_WEEK',
    label: 'Водный марафон',
    emoji: '💧',
    desc: '7 дней подряд выполнена норма воды',
    check: async (userId: string, _todayScore: number | null) => {
      const records = await db.fitnessDaily.findMany({
        where: { userId, water: { gte: 0 } },
        orderBy: { date: 'desc' },
        take: 7,
        select: { date: true, water: true, waterTarget: true },
      })
      if (records.length < 7) return false
      // All 7 must meet their water target
      const allMet = records.every((r) => (r.water ?? 0) >= (r.waterTarget ?? 2000))
      if (!allMet) return false
      // Must be 7 consecutive days
      for (let i = 0; i < records.length - 1; i++) {
        const d1 = new Date(records[i].date)
        const d2 = new Date(records[i + 1].date)
        const diffDays = Math.round((d1.getTime() - d2.getTime()) / 86400000)
        if (diffDays !== 1) return false
      }
      const existing = await db.achievement.findUnique({
        where: { userId_code: { userId, code: 'WATER_WEEK' } },
      })
      return !existing
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
