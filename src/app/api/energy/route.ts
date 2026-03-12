import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { normalizeToDate, getStartOfDay, getEndOfDay, parseDateKey } from '@/lib/date-utils'

import { getStartOfDay as getStartOfDayOld, getEndOfDay as getEndOfDayOld } from '@/lib/date-utils'

// Work activity multipliers
const WORK_ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,   // Сидячая работа
  mixed: 1.4,       // На ногах весь день
  physical: 1.6,    // Физическая работа
  variable: 1.3     // График меняется
}

const DEFAULT_MULTIPLIER = 1.3

// Calculate BMR using Mifflin-St Jeor formula
function calculateBMR(weight: number, height: number, age: number, sex: string): number {
  const sexOffset = sex.toLowerCase() === 'female' || sex.toLowerCase() === 'f' || sex.toLowerCase() === 'жен' ? -161 : 5
  return Math.round(10 * weight + 6.25 * height - 5 * age + sexOffset)
}

// GET /api/energy?userId=xxx - Get energy summary for today
// GET /api/energy?userId=xxx&date=YYYY-MM-DD - Get energy for specific date
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const dateParam = searchParams.get('date')

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  try {
    const targetDate = dateParam ? parseDateKey(dateParam) : normalizeToDate(new Date())
    const startOfTargetDay = getStartOfDay(targetDate)
    const endOfTargetDay = getEndOfDay(targetDate)

    // Get user profile
    const profile = await db.userProfile.findUnique({
      where: { userId }
    })

    // Get food entries for the target date
    const foodEntries = await db.foodEntry.findMany({
      where: {
        userId,
        date: {
          gte: startOfTargetDay,
          lt: endOfTargetDay
        }
      }
    })

    // Calculate calories eaten
    const caloriesEaten = foodEntries.reduce((sum, entry) => sum + (entry.calories || 0), 0)

    // Default values if profile is incomplete
    const defaults = {
      bmr: 1800,
      tdee: 2200,
      workMultiplier: DEFAULT_MULTIPLIER
    }

    // If profile is incomplete, return defaults
    if (!profile || !profile.weight || !profile.height || !profile.age) {
      return NextResponse.json({
        success: true,
        date: targetDate.toISOString().split('T')[0],
        energy: {
          bmr: profile?.targetCalories || defaults.bmr,
          tdee: profile?.targetCalories || defaults.tdee,
          workMultiplier: defaults.workMultiplier,
          caloriesEaten,
          foodEntriesCount: foodEntries.length,
          balance: caloriesEaten - (profile?.targetCalories || defaults.tdee),
          targetCalories: profile?.targetCalories || defaults.tdee,
          hasProfileData: false,
          missingFields: {
            weight: !profile?.weight,
            height: !profile?.height,
            age: !profile?.age,
            sex: !profile?.sex
          }
        }
      })
    }

    // Calculate BMR
    const bmr = calculateBMR(
      profile.weight,
      profile.height,
      profile.age,
      profile.sex || 'male'
    )

    // Get work activity multiplier
    const workMultiplier = profile.workProfile
      ? WORK_ACTIVITY_MULTIPLIERS[profile.workProfile] || DEFAULT_MULTIPLIER
      : DEFAULT_MULTIPLIER

    // Calculate TDEE (Total Daily Energy Expenditure)
    const tdee = Math.round(bmr * workMultiplier)

    // Target calories (user override or TDEE)
    const targetCalories = profile.targetCalories || tdee

    // Balance = eaten - target
    const balance = caloriesEaten - targetCalories

    // Determine balance status
    let balanceStatus: 'deficit' | 'surplus' | 'balanced' = 'balanced'
    if (balance < -300) {
      balanceStatus = 'deficit'
    } else if (balance > 300) {
      balanceStatus = 'surplus'
    }

    return NextResponse.json({
      success: true,
      date: targetDate.toISOString().split('T')[0],
      energy: {
        bmr,
        tdee,
        workMultiplier,
        caloriesEaten,
        foodEntriesCount: foodEntries.length,
        balance,
        targetCalories,
        balanceStatus,
        hasProfileData: true,
        profile: {
          weight: profile.weight,
          height: profile.height,
          age: profile.age,
          sex: profile.sex,
          workProfile: profile.workProfile
        }
      }
    })
  } catch (error) {
    console.error('Error calculating energy:', error)
    return NextResponse.json({ error: 'Failed to calculate energy' }, { status: 500 })
  }
}
