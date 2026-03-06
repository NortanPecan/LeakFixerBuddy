import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { parseDateKey, getStartOfDay, getEndOfDay, getDayOfWeek } from '@/lib/date-utils'

interface DailySummary {
  date: string
  water: {
    current: number
    target: number
    percentage: number
  }
  food: {
    calories: number
    protein: number
    fat: number
    carbs: number
    qualityBreakdown: {
      good: number
      neutral: number
      bad: number
    }
    entriesCount: number
  }
  rituals: {
    completed: number
    total: number
    percentage: number
  }
  state: {
    mood: number | null
    energy: number | null
  }
  supplements: {
    checked: number
    total: number
    percentage: number
  }
  // LeakFix preparation fields
  flags: {
    isOvereating: boolean
    isLowEnergy: boolean
    isBadMood: boolean
    isRitualsFailed: boolean
    isDehydrated: boolean
    hasNoData: boolean
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const dateStr = searchParams.get('date')

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const targetDate = dateStr ? parseDateKey(dateStr) : new Date()
    const dateKey = targetDate.toISOString().split('T')[0]
    const dayOfWeek = getDayOfWeek(targetDate)

    const startOfDay = getStartOfDay(targetDate)
    const endOfDay = getEndOfDay(targetDate)

    // Fetch all relevant data in parallel
    const [
      fitnessDaily,
      dailyState,
      foodEntries,
      ritualCompletions,
      activeRituals,
      supplementIntakes,
      activeSupplements
    ] = await Promise.all([
      // FitnessDaily for water
      db.fitnessDaily.findFirst({
        where: {
          userId,
          date: startOfDay
        }
      }),
      // DailyState for mood/energy
      db.dailyState.findFirst({
        where: {
          userId,
          date: startOfDay
        }
      }),
      // Food entries for the day
      db.foodEntry.findMany({
        where: {
          userId,
          date: {
            gte: startOfDay,
            lt: endOfDay
          }
        }
      }),
      // Ritual completions for the day
      db.ritualCompletion.findMany({
        where: {
          userId,
          date: startOfDay
        },
        include: {
          ritual: true
        }
      }),
      // Active rituals for this day of week
      db.ritual.findMany({
        where: {
          userId,
          status: 'active'
        }
      }),
      // Supplement intakes for the day
      db.supplementIntake.findMany({
        where: {
          userId,
          date: startOfDay
        }
      }),
      // Active supplements for this day of week
      db.supplement.findMany({
        where: {
          userId,
          isActive: true
        }
      })
    ])

    // Calculate water
    const water = {
      current: fitnessDaily?.water || 0,
      target: fitnessDaily?.waterTarget || 2000,
      percentage: fitnessDaily?.water 
        ? Math.round((fitnessDaily.water / (fitnessDaily.waterTarget || 2000)) * 100)
        : 0
    }

    // Calculate food
    const foodCalories = foodEntries.reduce((sum, e) => sum + (e.calories || 0), 0)
    const foodProtein = foodEntries.reduce((sum, e) => sum + (e.protein || 0), 0)
    const foodFat = foodEntries.reduce((sum, e) => sum + (e.fat || 0), 0)
    const foodCarbs = foodEntries.reduce((sum, e) => sum + (e.carbs || 0), 0)
    
    const qualityBreakdown = {
      good: foodEntries.filter(e => e.quality === 'good').length,
      neutral: foodEntries.filter(e => e.quality === 'neutral').length,
      bad: foodEntries.filter(e => e.quality === 'bad').length
    }

    const food = {
      calories: foodCalories,
      protein: foodProtein,
      fat: foodFat,
      carbs: foodCarbs,
      qualityBreakdown,
      entriesCount: foodEntries.length
    }

    // Calculate rituals
    // Filter rituals for today's day of week
    const todayRituals = activeRituals.filter(r => {
      try {
        const days = JSON.parse(r.days as string) as number[]
        return days.includes(dayOfWeek) || days.length === 0
      } catch {
        return true
      }
    })

    const completedRitualsCount = todayRituals.filter(r => {
      return ritualCompletions.some(rc => rc.ritualId === r.id && rc.completed)
    }).length

    const rituals = {
      completed: completedRitualsCount,
      total: todayRituals.length,
      percentage: todayRituals.length > 0 
        ? Math.round((completedRitualsCount / todayRituals.length) * 100)
        : 0
    }

    // State (mood/energy)
    const state = {
      mood: dailyState?.mood ?? null,
      energy: dailyState?.energy ?? null
    }

    // Calculate supplements
    // Filter supplements for today's day of week
    const todaySupplements = activeSupplements.filter(s => {
      try {
        const days = JSON.parse(s.days as string) as number[]
        return days.includes(dayOfWeek) || days.length === 0
      } catch {
        return true
      }
    })

    const checkedSupplementsCount = todaySupplements.filter(s => {
      return supplementIntakes.some(si => si.supplementId === s.id && si.checked)
    }).length

    const supplements = {
      checked: checkedSupplementsCount,
      total: todaySupplements.length,
      percentage: todaySupplements.length > 0
        ? Math.round((checkedSupplementsCount / todaySupplements.length) * 100)
        : 0
    }

    // Calculate flags for LeakFix analytics
    const flags = {
      isOvereating: foodCalories > 3000 || qualityBreakdown.bad > 2,
      isLowEnergy: state.energy !== null && state.energy < 4,
      isBadMood: state.mood !== null && state.mood < 4,
      isRitualsFailed: todayRituals.length > 0 && rituals.percentage < 50,
      isDehydrated: water.percentage < 50,
      hasNoData: !fitnessDaily && !dailyState && foodEntries.length === 0 && ritualCompletions.length === 0
    }

    const summary: DailySummary = {
      date: dateKey,
      water,
      food,
      rituals,
      state,
      supplements,
      flags
    }

    return NextResponse.json({
      success: true,
      summary
    })
  } catch (error) {
    console.error('Daily summary error:', error)
    return NextResponse.json(
      { error: 'Failed to get daily summary' },
      { status: 500 }
    )
  }
}
