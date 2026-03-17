import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/stats/history - Get historical stats for charts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const days = parseInt(searchParams.get('days') || '30')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    // Get daily stats for the period
    const [ritualCompletions, habitLogs, dailyStates, tasks, checkins, foodEntries, fitnessDaily, weightMeasurements] = await Promise.all([
      // Ritual completions
      db.ritualCompletion.findMany({
        where: {
          userId,
          date: { gte: startDate }
        },
        select: {
          date: true,
          completed: true,
          ritualId: true
        }
      }),
      
      // Habit logs
      db.habitLog.findMany({
        where: {
          userId,
          date: { gte: startDate }
        },
        select: {
          date: true,
          completed: true,
          habitId: true
        }
      }),
      
      // Daily states (mood, energy)
      db.dailyState.findMany({
        where: {
          userId,
          date: { gte: startDate }
        },
        select: {
          date: true,
          mood: true,
          energy: true,
          stress: true,
          sleepHours: true
        }
      }),



      // Completed tasks
      db.task.findMany({
        where: {
          userId,
          status: 'done',
          updatedAt: { gte: startDate }
        },
        select: {
          date: true,
          updatedAt: true
        }
      }),

      // Daily checkins (morning energy + evening rating)
      db.dailyCheckin.findMany({
        where: {
          userId,
          date: { gte: startDate }
        },
        select: {
          date: true,
          type: true,
          energy: true,
          dayRating: true,
        }
      }).catch(() => [] as { date: Date; type: string; energy: number | null; dayRating: number | null }[]),

      // Food entries for calorie history
      db.foodEntry.findMany({
        where: { userId, date: { gte: startDate } },
        select: { date: true, calories: true }
      }).catch(() => [] as { date: Date; calories: number | null }[]),

      // FitnessDaily for water history
      db.fitnessDaily.findMany({
        where: { userId, date: { gte: startDate } },
        select: { date: true, water: true, waterTarget: true }
      }).catch(() => [] as { date: Date; water: number | null; waterTarget: number | null }[]),

      // Weight measurements
      db.measurement.findMany({
        where: { userId, type: 'weight', date: { gte: startDate } },
        select: { date: true, value: true },
        orderBy: { date: 'asc' }
      }).catch(() => [] as { date: Date; value: number }[]),
    ])

    // Group by date
    const dateMap = new Map<string, {
      date: string
      ritualsTotal: number
      ritualsCompleted: number
      habitsTotal: number
      habitsCompleted: number
      tasksCompleted: number
      mood: number | null
      energy: number | null
      stress: number | null
      sleepHours: number | null
      morningEnergy: number | null
      eveningRating: number | null
      calories: number
      water: number | null
      waterTarget: number | null
      weight: number | null
    }>()

    // Initialize all dates
    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      dateMap.set(dateStr, {
        date: dateStr,
        ritualsTotal: 0,
        ritualsCompleted: 0,
        habitsTotal: 0,
        habitsCompleted: 0,
        tasksCompleted: 0,
        mood: null,
        energy: null,
        stress: null,
        sleepHours: null,
        morningEnergy: null,
        eveningRating: null,
        calories: 0,
        water: null,
        waterTarget: null,
        weight: null,
      })
    }

    // Process ritual completions
    ritualCompletions.forEach(rc => {
      const dateStr = rc.date.toISOString().split('T')[0]
      const entry = dateMap.get(dateStr)
      if (entry) {
        entry.ritualsTotal++
        if (rc.completed) entry.ritualsCompleted++
      }
    })

    // Process habit logs
    habitLogs.forEach(hl => {
      const dateStr = hl.date.toISOString().split('T')[0]
      const entry = dateMap.get(dateStr)
      if (entry) {
        entry.habitsTotal++
        if (hl.completed) entry.habitsCompleted++
      }
    })

    // Process daily states
    dailyStates.forEach(ds => {
      const dateStr = ds.date.toISOString().split('T')[0]
      const entry = dateMap.get(dateStr)
      if (entry) {
        entry.mood = ds.mood
        entry.energy = ds.energy
        entry.stress = ds.stress
        entry.sleepHours = ds.sleepHours
      }
    })

    // Process checkins
    checkins.forEach(c => {
      const dateStr = c.date.toISOString().split('T')[0]
      const entry = dateMap.get(dateStr)
      if (entry) {
        if (c.type === 'morning' && c.energy !== null) entry.morningEnergy = c.energy
        if (c.type === 'evening' && c.dayRating !== null) entry.eveningRating = c.dayRating
      }
    })

    // Process tasks
    tasks.forEach(t => {
      const dateStr = (t.date || t.updatedAt).toISOString().split('T')[0]
      const entry = dateMap.get(dateStr)
      if (entry) {
        entry.tasksCompleted++
      }
    })

    // Process food entries (sum calories per day)
    foodEntries.forEach(fe => {
      const dateStr = fe.date.toISOString().split('T')[0]
      const entry = dateMap.get(dateStr)
      if (entry) {
        entry.calories += fe.calories || 0
      }
    })

    // Process water (fitnessDaily)
    fitnessDaily.forEach(fd => {
      const dateStr = fd.date.toISOString().split('T')[0]
      const entry = dateMap.get(dateStr)
      if (entry) {
        entry.water = fd.water
        entry.waterTarget = fd.waterTarget
      }
    })

    // Process weight measurements (use latest per day)
    weightMeasurements.forEach(wm => {
      const dateStr = wm.date.toISOString().split('T')[0]
      const entry = dateMap.get(dateStr)
      if (entry) {
        entry.weight = wm.value
      }
    })

    // Calculate streaks
    let currentStreak = 0
    let maxStreak = 0
    let tempStreak = 0

    const sortedDates = Array.from(dateMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))

    sortedDates.forEach(([_, entry]) => {
      const hasActivity = entry.ritualsCompleted > 0 || entry.habitsCompleted > 0 || entry.tasksCompleted > 0
      if (hasActivity) {
        tempStreak++
        maxStreak = Math.max(maxStreak, tempStreak)
      } else {
        tempStreak = 0
      }
    })

    // Calculate current streak from today backwards
    const today = new Date().toISOString().split('T')[0]
    for (let i = sortedDates.length - 1; i >= 0; i--) {
      const [dateStr, entry] = sortedDates[i]
      if (dateStr > today) continue
      
      const hasActivity = entry.ritualsCompleted > 0 || entry.habitsCompleted > 0 || entry.tasksCompleted > 0
      if (hasActivity && dateStr <= today) {
        currentStreak++
      } else if (dateStr < today) {
        break
      }
    }

    // Convert to arrays for charts
    const history = sortedDates.map(([_, entry]) => ({
      date: entry.date,
      ritualsTotal: entry.ritualsTotal,
      ritualsCompleted: entry.ritualsCompleted,
      ritualsRate: entry.ritualsTotal > 0
        ? Math.round((entry.ritualsCompleted / entry.ritualsTotal) * 100)
        : 0,
      habitsTotal: entry.habitsTotal,
      habitsCompleted: entry.habitsCompleted,
      habitsRate: entry.habitsTotal > 0
        ? Math.round((entry.habitsCompleted / entry.habitsTotal) * 100)
        : 0,
      tasksCompleted: entry.tasksCompleted,
      mood: entry.mood,
      energy: entry.energy,
      stress: entry.stress,
      sleepHours: entry.sleepHours,
      morningEnergy: entry.morningEnergy,
      eveningRating: entry.eveningRating,
      calories: entry.calories > 0 ? entry.calories : null,
      water: entry.water,
      waterTarget: entry.waterTarget,
      weight: entry.weight,
      overallScore: calculateOverallScore(entry)
    }))

    // Weekly summary
    const weeklySummary = getWeeklySummary(history)

    return NextResponse.json({
      history,
      streaks: {
        current: currentStreak,
        max: maxStreak
      },
      weeklySummary,
      totals: {
        totalRituals: history.reduce((sum, h) => sum + h.ritualsCompleted, 0),
        totalHabits: history.reduce((sum, h) => sum + h.habitsCompleted, 0),
        totalTasks: history.reduce((sum, h) => sum + h.tasksCompleted, 0),
        avgMood: calculateAvg(history.map(h => h.mood).filter(Boolean)),
        avgEnergy: calculateAvg(history.map(h => h.energy).filter(Boolean)),
        avgMorningEnergy: calculateAvg(history.map(h => h.morningEnergy).filter(Boolean)),
        avgEveningRating: calculateAvg(history.map(h => h.eveningRating).filter(Boolean))
      }
    })
  } catch (error) {
    console.error('Error fetching stats history:', error)
    return NextResponse.json({ error: 'Failed to fetch stats history' }, { status: 500 })
  }
}

function calculateOverallScore(entry: {
  ritualsTotal: number
  ritualsCompleted: number
  habitsTotal: number
  habitsCompleted: number
  tasksCompleted: number
  mood: number | null
  energy: number | null
}): number {
  let score = 0
  let weight = 0

  // Rituals completion (30%)
  if (entry.ritualsTotal > 0) {
    score += (entry.ritualsCompleted / entry.ritualsTotal) * 30
    weight += 30
  }

  // Habits completion (30%)
  if (entry.habitsTotal > 0) {
    score += (entry.habitsCompleted / entry.habitsTotal) * 30
    weight += 30
  }

  // Tasks (20%)
  if (entry.tasksCompleted > 0) {
    score += Math.min(entry.tasksCompleted * 5, 20)
    weight += 20
  }

  // Mood (10%)
  if (entry.mood) {
    score += (entry.mood / 10) * 10
    weight += 10
  }

  // Energy (10%)
  if (entry.energy) {
    score += (entry.energy / 10) * 10
    weight += 10
  }

  return weight > 0 ? Math.round((score / weight) * 100) : 0
}

function calculateAvg(values: (number | null)[]): number | null {
  const validValues = values.filter((v): v is number => v !== null)
  if (validValues.length === 0) return null
  return Math.round(validValues.reduce((a, b) => a + b, 0) / validValues.length * 10) / 10
}

function getWeeklySummary(history: Array<{ date: string; overallScore: number; ritualsRate: number; habitsRate: number }>) {
  const weeks: Array<{ week: string; avgScore: number; avgRituals: number; avgHabits: number }> = []
  
  for (let i = 0; i < history.length; i += 7) {
    const weekData = history.slice(i, i + 7)
    const weekStart = new Date(weekData[0]?.date || new Date())
    const weekLabel = `${weekStart.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`
    
    weeks.push({
      week: weekLabel,
      avgScore: Math.round(weekData.reduce((s, d) => s + d.overallScore, 0) / weekData.length),
      avgRituals: Math.round(weekData.reduce((s, d) => s + d.ritualsRate, 0) / weekData.length),
      avgHabits: Math.round(weekData.reduce((s, d) => s + d.habitsRate, 0) / weekData.length)
    })
  }
  
  return weeks
}
