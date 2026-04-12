import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  formatDateKey,
  getStartOfDay,
  getStartOfNextDay,
  normalizeToDate,
  parseDateKey,
} from '@/lib/date-utils'
import { requireSelf } from '@/lib/server-auth'

const WORK_ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  mixed: 1.4,
  physical: 1.6,
  variable: 1.3,
}

const DEFAULT_MULTIPLIER = 1.3

function calculateBMR(weight: number, height: number, age: number, sex: string): number {
  const normalizedSex = sex.toLowerCase()
  const sexOffset = normalizedSex === 'female' || normalizedSex === 'f' ? -161 : 5
  return Math.round(10 * weight + 6.25 * height - 5 * age + sexOffset)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const dateParam = searchParams.get('date')

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  const auth = requireSelf(request, userId)
  if ('error' in auth) return auth.error

  try {
    const targetDate = dateParam ? parseDateKey(dateParam) : normalizeToDate(new Date())
    const startOfTargetDay = getStartOfDay(targetDate)
    const startOfNextDay = getStartOfNextDay(targetDate)

    const profile = await db.userProfile.findUnique({
      where: { userId },
    })

    const foodEntries = await db.foodEntry.findMany({
      where: {
        userId,
        date: {
          gte: startOfTargetDay,
          lt: startOfNextDay,
        },
      },
    })

    const caloriesEaten = foodEntries.reduce((sum, entry) => sum + (entry.calories || 0), 0)

    const defaults = {
      bmr: 1800,
      tdee: 2200,
      workMultiplier: DEFAULT_MULTIPLIER,
    }

    if (!profile || !profile.weight || !profile.height || !profile.age) {
      return NextResponse.json({
        success: true,
        date: formatDateKey(targetDate),
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
            sex: !profile?.sex,
          },
        },
      })
    }

    const bmr = calculateBMR(
      profile.weight,
      profile.height,
      profile.age,
      profile.sex || 'male'
    )

    const workMultiplier = profile.workProfile
      ? WORK_ACTIVITY_MULTIPLIERS[profile.workProfile] || DEFAULT_MULTIPLIER
      : DEFAULT_MULTIPLIER

    const tdee = Math.round(bmr * workMultiplier)
    const targetCalories = profile.targetCalories || tdee
    const balance = caloriesEaten - targetCalories

    let balanceStatus: 'deficit' | 'surplus' | 'balanced' = 'balanced'
    if (balance < -300) {
      balanceStatus = 'deficit'
    } else if (balance > 300) {
      balanceStatus = 'surplus'
    }

    return NextResponse.json({
      success: true,
      date: formatDateKey(targetDate),
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
          workProfile: profile.workProfile,
        },
      },
    })
  } catch (error) {
    console.error('Error calculating energy:', error)
    return NextResponse.json({ error: 'Failed to calculate energy' }, { status: 500 })
  }
}
