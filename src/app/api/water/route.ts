import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getStartOfDay, getEndOfDay } from '@/lib/date-utils'

// GET /api/water?userId=xxx - Get water for today
// GET /api/water?userId=xxx&date=YYYY-MM-DD - Get water for specific date
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const dateParam = searchParams.get('date')

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  try {
    const targetDate = dateParam ? new Date(dateParam) : new Date()
    const startOfTargetDay = getStartOfDay(targetDate)
    const endOfTargetDay = getEndOfDay(targetDate)

    // Find or create fitness daily record
    let fitnessDaily = await db.fitnessDaily.findFirst({
      where: {
        userId,
        date: {
          gte: startOfTargetDay,
          lt: endOfTargetDay
        }
      }
    })

    if (!fitnessDaily) {
      // Get user's water baseline from profile
      const profile = await db.userProfile.findUnique({
        where: { userId }
      })

      fitnessDaily = await db.fitnessDaily.create({
        data: {
          userId,
          date: startOfTargetDay,
          water: 0,
          waterTarget: profile?.waterBaseline || 2000
        }
      })
    }

    return NextResponse.json({
      success: true,
      water: {
        current: fitnessDaily.water,
        target: fitnessDaily.waterTarget,
        percentage: Math.round((fitnessDaily.water / fitnessDaily.waterTarget) * 100)
      }
    })
  } catch (error) {
    console.error('Error fetching water:', error)
    return NextResponse.json({ error: 'Failed to fetch water' }, { status: 500 })
  }
}

// PATCH /api/water - Update water intake
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, date, amount, target } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const targetDate = date ? new Date(date) : new Date()
    const startOfTargetDay = getStartOfDay(targetDate)
    const endOfTargetDay = getEndOfDay(targetDate)

    // Find or create fitness daily record
    let fitnessDaily = await db.fitnessDaily.findFirst({
      where: {
        userId,
        date: {
          gte: startOfTargetDay,
          lt: endOfTargetDay
        }
      }
    })

    if (!fitnessDaily) {
      const profile = await db.userProfile.findUnique({
        where: { userId }
      })

      fitnessDaily = await db.fitnessDaily.create({
        data: {
          userId,
          date: startOfTargetDay,
          water: amount || 0,
          waterTarget: target || profile?.waterBaseline || 2000
        }
      })
    } else {
      const updateData: Record<string, unknown> = { water: amount }
      if (target !== undefined) {
        updateData.waterTarget = target
      }

      fitnessDaily = await db.fitnessDaily.update({
        where: { id: fitnessDaily.id },
        data: updateData
      })
    }

    return NextResponse.json({
      success: true,
      water: {
        current: fitnessDaily.water,
        target: fitnessDaily.waterTarget,
        percentage: Math.round((fitnessDaily.water / fitnessDaily.waterTarget) * 100)
      }
    })
  } catch (error) {
    console.error('Error updating water:', error)
    return NextResponse.json({ error: 'Failed to update water' }, { status: 500 })
  }
}
