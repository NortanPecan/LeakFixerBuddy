import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/weekly-report?userId=...&weekStart=YYYY-MM-DD
 * Returns a weekly summary with basic correlation hints (leaks).
 * weekStart defaults to last Monday.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const weekStartParam = searchParams.get('weekStart')

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  try {
    // Calculate week range
    const weekStart = weekStartParam ? new Date(weekStartParam) : getPrevMonday()
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)

    // Load all data for the week in parallel
    // GymWorkout is linked via GymPeriod (not directly to userId)
    // We load periods for this user and then their workouts
    const userPeriodIds = await db.gymPeriod.findMany({
      where: { userId },
      select: { id: true },
    }).catch(() => [] as { id: string }[])

    const periodIds = userPeriodIds.map(p => p.id)

    const [
      dailyStates,
      checkins,
      foodEntries,
      gymWorkouts,
      ritualCompletions,
      habitLogs,
      transactions,
    ] = await Promise.all([
      db.dailyState.findMany({
        where: { userId, date: { gte: weekStart, lt: weekEnd } },
        orderBy: { date: 'asc' },
      }),
      db.dailyCheckin.findMany({
        where: { userId, date: { gte: weekStart, lt: weekEnd } },
        orderBy: { date: 'asc' },
      }),
      db.foodEntry.findMany({
        where: { userId, date: { gte: weekStart, lt: weekEnd } },
        orderBy: { date: 'asc' },
      }),
      periodIds.length > 0
        ? db.gymWorkout.findMany({
            where: {
              periodId: { in: periodIds },
              date: { gte: weekStart, lt: weekEnd },
            },
            orderBy: { date: 'asc' },
            select: { date: true, completed: true, status: true },
          }).catch(() => [] as { date: Date; completed: boolean; status: string | null }[])
        : Promise.resolve([] as { date: Date; completed: boolean; status: string | null }[]),
      db.ritualCompletion.findMany({
        where: { userId, date: { gte: weekStart, lt: weekEnd } },
        select: { date: true, completed: true, ritualId: true },
      }).catch(() => [] as { date: Date; completed: boolean; ritualId: string }[]),
      db.habitLog.findMany({
        where: { userId, date: { gte: weekStart, lt: weekEnd } },
        select: { date: true, value: true, habitId: true },
      }).catch(() => [] as { date: Date; value: number; habitId: string }[]),
      db.transaction.findMany({
        where: { userId, date: { gte: weekStart, lt: weekEnd } },
        select: { date: true, amount: true, type: true },
      }).catch(() => [] as { date: Date; amount: number; type: string }[]),
    ])

    // Build per-day map
    const days: DayData[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      const dateStr = d.toISOString().split('T')[0]

      const state = dailyStates.find(s => s.date.toISOString().split('T')[0] === dateStr)
      const morningCheckin = checkins.find(c => c.date.toISOString().split('T')[0] === dateStr && c.type === 'morning')
      const eveningCheckin = checkins.find(c => c.date.toISOString().split('T')[0] === dateStr && c.type === 'evening')
      const foods = foodEntries.filter(f => f.date.toISOString().split('T')[0] === dateStr)
      const hadGym = gymWorkouts.some(w => {
        const wd = w.date.toISOString().split('T')[0]
        return wd === dateStr && (w.completed || w.status === 'completed')
      })
      const dayRituals = ritualCompletions.filter(r => r.date.toISOString().split('T')[0] === dateStr)
      const dayHabits = habitLogs.filter(h => h.date.toISOString().split('T')[0] === dateStr)
      const dayExpenses = transactions
        .filter(t => t.date.toISOString().split('T')[0] === dateStr && t.type === 'expense')
        .reduce((s, t) => s + Math.abs(Number(t.amount)), 0)

      days.push({
        date: dateStr,
        dayOfWeek: d.toLocaleDateString('ru', { weekday: 'short' }),
        mood: state?.mood ?? null,
        energy: state?.energy ?? null,
        morningEnergy: morningCheckin?.energy ?? null,
        eveningRating: eveningCheckin?.dayRating ?? null,
        totalCalories: foods.reduce((s, f) => s + (f.calories || 0), 0),
        foodCount: foods.length,
        hadGym,
        morningCheckinDone: !!morningCheckin,
        eveningCheckinDone: !!eveningCheckin,
        ritualsCompleted: dayRituals.filter(r => r.completed).length,
        ritualsTotal: dayRituals.length,
        habitsCompleted: dayHabits.length,
        expenses: dayExpenses,
      })
    }

    // Basic correlation hints (leaks)
    const leakHints = detectLeaks(days)

    // Summary stats
    const summary = {
      avgMood: avg(days.map(d => d.mood).filter((v): v is number => v !== null)),
      avgEnergy: avg(days.map(d => d.energy).filter((v): v is number => v !== null)),
      avgEveningRating: avg(days.map(d => d.eveningRating).filter((v): v is number => v !== null)),
      gymDays: days.filter(d => d.hadGym).length,
      checkinDays: days.filter(d => d.morningCheckinDone).length,
      totalCalories: days.reduce((s, d) => s + d.totalCalories, 0),
      avgCaloriesPerDay: avg(days.filter(d => d.foodCount > 0).map(d => d.totalCalories)),
      totalRitualsCompleted: days.reduce((s, d) => s + d.ritualsCompleted, 0),
      totalHabitsCompleted: days.reduce((s, d) => s + d.habitsCompleted, 0),
      totalExpenses: days.reduce((s, d) => s + d.expenses, 0),
      bestDay: days.reduce((best, d) => {
        const score = (d.mood || 0) + (d.eveningRating || 0)
        const bestScore = (best?.mood || 0) + (best?.eveningRating || 0)
        return score > bestScore ? d : best
      }, days[0]),
    }

    return NextResponse.json({
      success: true,
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd: weekEnd.toISOString().split('T')[0],
      days,
      summary,
      leakHints,
    })
  } catch (error) {
    console.error('[Weekly Report] Error:', error)
    return NextResponse.json({ error: 'Failed to generate weekly report' }, { status: 500 })
  }
}

interface DayData {
  date: string
  dayOfWeek: string
  mood: number | null
  energy: number | null
  morningEnergy: number | null
  eveningRating: number | null
  totalCalories: number
  foodCount: number
  hadGym: boolean
  morningCheckinDone: boolean
  eveningCheckinDone: boolean
  ritualsCompleted: number
  ritualsTotal: number
  habitsCompleted: number
  expenses: number
}

interface LeakHint {
  type: string
  severity: 'info' | 'warning' | 'critical'
  message: string
  emoji: string
  days?: string[]
}

function detectLeaks(days: DayData[]): LeakHint[] {
  const hints: LeakHint[] = []

  // Hint 1: Gym → mood next day correlation
  const gymDays = days.filter(d => d.hadGym)
  if (gymDays.length >= 2) {
    const gymMoodNextDay: number[] = []
    gymDays.forEach(gd => {
      const idx = days.findIndex(d => d.date === gd.date)
      if (idx < days.length - 1 && days[idx + 1].mood !== null) {
        gymMoodNextDay.push(days[idx + 1].mood!)
      }
    })
    const noGymDays = days.filter(d => !d.hadGym && d.mood !== null)
    const avgGymNextMood = avg(gymMoodNextDay)
    const avgNoGymMood = avg(noGymDays.map(d => d.mood!))
    if (avgGymNextMood > avgNoGymMood + 0.8) {
      hints.push({
        type: 'gym_mood',
        severity: 'info',
        emoji: '💪',
        message: `На следующий день после зала настроение в среднем на ${(avgGymNextMood - avgNoGymMood).toFixed(1)} баллов выше. Зал работает!`,
      })
    }
  }

  // Hint 2: Low energy days pattern
  const lowEnergyDays = days.filter(d => d.morningEnergy !== null && d.morningEnergy <= 4)
  if (lowEnergyDays.length >= 2) {
    hints.push({
      type: 'low_energy',
      severity: lowEnergyDays.length >= 3 ? 'critical' : 'warning',
      emoji: '🪫',
      message: `${lowEnergyDays.length} дня с низкой утренней энергией (≤4). Проверь сон и восстановление.`,
      days: lowEnergyDays.map(d => d.dayOfWeek),
    })
  }

  // Hint 3: Evening rating vs morning energy
  const daysWithBoth = days.filter(d => d.morningEnergy !== null && d.eveningRating !== null)
  if (daysWithBoth.length >= 3) {
    const highMorning = daysWithBoth.filter(d => d.morningEnergy! >= 7)
    const lowMorning = daysWithBoth.filter(d => d.morningEnergy! <= 4)
    if (highMorning.length > 0 && lowMorning.length > 0) {
      const avgHighEvening = avg(highMorning.map(d => d.eveningRating!))
      const avgLowEvening = avg(lowMorning.map(d => d.eveningRating!))
      if (avgHighEvening > avgLowEvening + 1) {
        hints.push({
          type: 'energy_to_day_quality',
          severity: 'info',
          emoji: '⚡',
          message: `Когда утренняя энергия высокая — день оценивается лучше (${avgHighEvening.toFixed(1)} vs ${avgLowEvening.toFixed(1)}). Следи за утренним состоянием.`,
        })
      }
    }
  }

  // Hint 4: No gym this week
  if (gymDays.length === 0) {
    hints.push({
      type: 'no_gym',
      severity: 'warning',
      emoji: '🏋️',
      message: 'На этой неделе не было ни одной тренировки. Даже короткая зарядка меняет день.',
    })
  }

  // Hint 5: Checkin streak broken
  const missedCheckins = days.filter(d => {
    const dateObj = new Date(d.date)
    const dayHour = new Date().getHours()
    // Only flag past days
    return dateObj < new Date() && !d.morningCheckinDone
  })
  if (missedCheckins.length >= 3) {
    hints.push({
      type: 'missed_checkins',
      severity: 'warning',
      emoji: '📋',
      message: `Пропущено ${missedCheckins.length} утренних чекапов. Без данных сложно находить паттерны.`,
    })
  }

  // Hint 6: Calorie variance
  const caloriesDays = days.filter(d => d.totalCalories > 0)
  if (caloriesDays.length >= 3) {
    const avgCals = avg(caloriesDays.map(d => d.totalCalories))
    const highDays = caloriesDays.filter(d => d.totalCalories > avgCals * 1.4)
    if (highDays.length >= 2) {
      hints.push({
        type: 'calorie_spikes',
        severity: 'info',
        emoji: '🍔',
        message: `${highDays.length} дня с резким скачком калорий (>${Math.round(avgCals * 1.4)} ккал при среднем ${Math.round(avgCals)}). Проверь триггеры.`,
        days: highDays.map(d => d.dayOfWeek),
      })
    }
  }

  // Hint 7: Ritual consistency leak
  const daysWithRituals = days.filter(d => d.ritualsTotal > 0)
  if (daysWithRituals.length >= 3) {
    const lowRitualDays = daysWithRituals.filter(d => d.ritualsTotal > 0 && (d.ritualsCompleted / d.ritualsTotal) < 0.5)
    if (lowRitualDays.length >= 3) {
      hints.push({
        type: 'ritual_consistency',
        severity: lowRitualDays.length >= 5 ? 'critical' : 'warning',
        emoji: '🔥',
        message: `${lowRitualDays.length} дней из ${daysWithRituals.length} — ритуалы выполнены менее чем на 50%. Системная утечка в привычках.`,
        days: lowRitualDays.map(d => d.dayOfWeek),
      })
    }
  }

  // Hint 8: Habits not tracked
  const totalHabitLogs = days.reduce((s, d) => s + d.habitsCompleted, 0)
  if (totalHabitLogs === 0 && days.some(d => new Date(d.date) < new Date())) {
    hints.push({
      type: 'no_habits',
      severity: 'info',
      emoji: '🔄',
      message: 'Привычки на этой неделе не отмечались. Трекинг привычек помогает выявлять паттерны.',
    })
  }

  // Hint 9: Rituals → day quality correlation
  const daysWithRitualsAndRating = days.filter(d => d.ritualsTotal > 0 && d.eveningRating !== null)
  if (daysWithRitualsAndRating.length >= 3) {
    const highRitualDays = daysWithRitualsAndRating.filter(d => d.ritualsTotal > 0 && (d.ritualsCompleted / d.ritualsTotal) >= 0.8)
    const lowRitualDays2 = daysWithRitualsAndRating.filter(d => d.ritualsTotal > 0 && (d.ritualsCompleted / d.ritualsTotal) < 0.5)
    if (highRitualDays.length > 0 && lowRitualDays2.length > 0) {
      const avgHighRating = avg(highRitualDays.map(d => d.eveningRating!))
      const avgLowRating = avg(lowRitualDays2.map(d => d.eveningRating!))
      if (avgHighRating > avgLowRating + 1.5) {
        hints.push({
          type: 'rituals_quality',
          severity: 'info',
          emoji: '🔥',
          message: `В дни когда ритуалы выполнены на 80%+ — день оценивается на ${(avgHighRating - avgLowRating).toFixed(1)} балла выше. Ритуалы работают!`,
        })
      }
    }
  }

  return hints
}

function avg(nums: number[]): number {
  if (!nums.length) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function getPrevMonday(): Date {
  const d = new Date()
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  d.setDate(d.getDate() + diff)
  return d
}
