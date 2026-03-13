import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { normalizeToDate, formatDateKey, parseDateKey, getDayOfWeek } from '@/lib/date-utils'

/**
 * Get fitness data for a date
 * GET /api/fitness?userId=<id>&date=<YYYY-MM-DD>
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const dateParam = searchParams.get('date')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    const targetDate = dateParam ? parseDateKey(dateParam) : normalizeToDate(new Date())

    // Get fitness daily data
    const fitnessDay = await db.fitnessDaily.findFirst({
      where: {
        userId,
        date: targetDate
      }
    })

    // Get daily state (mood, energy)
    const dailyState = await db.dailyState.findFirst({
      where: {
        userId,
        date: targetDate
      }
    })

    // Get measurements for date
    const measurements = await db.measurement.findMany({
      where: {
        userId,
        date: targetDate
      }
    })

    // Parse JSON fields
    let activities: unknown[] = []
    let foods: unknown[] = []
    let supplements: unknown[] = []

    if (fitnessDay?.activities) {
      try {
        activities = JSON.parse(fitnessDay.activities)
      } catch { /* ignore */ }
    }

    if (fitnessDay?.foods) {
      try {
        foods = JSON.parse(fitnessDay.foods)
      } catch { /* ignore */ }
    }

    if (fitnessDay?.supplements) {
      try {
        supplements = JSON.parse(fitnessDay.supplements)
      } catch { /* ignore */ }
    }

    return NextResponse.json({
      date: formatDateKey(targetDate),
      data: {
        activities,
        foods,
        water: {
          currentMl: fitnessDay?.water || 0,
          targetMl: fitnessDay?.waterTarget || 2000
        },
        supplements,
        mood: dailyState?.mood,
        energy: dailyState?.energy,
        workDay: fitnessDay?.gymState ? JSON.parse(fitnessDay.gymState) : null
      },
      measurements: measurements.map(m => ({
        id: m.id,
        type: m.type,
        value: m.value,
        unit: m.unit,
        note: m.note
      }))
    })
  } catch (error) {
    console.error('Get fitness error:', error)
    return NextResponse.json(
      { error: 'Failed to get fitness data' },
      { status: 500 }
    )
  }
}

/**
 * Save fitness data for a date
 * POST /api/fitness
 * Body: { userId, date: "YYYY-MM-DD", data: { water, mood, energy, ... } }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, date, data } = body

    if (!userId || !date) {
      return NextResponse.json(
        { error: 'User ID and date required' },
        { status: 400 }
      )
    }

    const targetDate = parseDateKey(date)

    // Upsert fitness daily using unique constraint
    const existingDay = await db.fitnessDaily.findFirst({
      where: { userId, date: targetDate }
    })

    const fitnessData = {
      userId,
      date: targetDate,
      water: data.water?.currentMl ?? data.water ?? 0,
      waterTarget: data.water?.targetMl ?? data.waterTarget ?? 2000,
      activities: data.activities ? JSON.stringify(data.activities) : null,
      foods: data.foods ? JSON.stringify(data.foods) : null,
      supplements: data.supplements ? JSON.stringify(data.supplements) : null,
      mood: data.mood,
      energy: data.energy,
    }

    if (existingDay) {
      await db.fitnessDaily.update({
        where: { id: existingDay.id },
        data: fitnessData
      })
    } else {
      await db.fitnessDaily.create({
        data: fitnessData
      })
    }

    // Upsert daily state (mood, energy)
    if (data.mood !== undefined || data.energy !== undefined) {
      const existingState = await db.dailyState.findFirst({
        where: { userId, date: targetDate }
      })

      const stateData = {
        userId,
        date: targetDate,
        mood: data.mood,
        energy: data.energy,
      }

      if (existingState) {
        await db.dailyState.update({
          where: { id: existingState.id },
          data: stateData
        })
      } else {
        await db.dailyState.create({
          data: stateData
        })
      }
    }

    return NextResponse.json({
      success: true,
      date: formatDateKey(targetDate),
      saved: true
    })
  } catch (error) {
    console.error('Save fitness error:', error)
    return NextResponse.json(
      { error: 'Failed to save fitness data' },
      { status: 500 }
    )
  }
}
