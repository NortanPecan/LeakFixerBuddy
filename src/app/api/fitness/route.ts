import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Get fitness data for a date
 * GET /api/fitness?userId=<id>&date=<YYYY-MM-DD>
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const date = searchParams.get('date') || formatDateKey(new Date())

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    // Get fitness daily data
    const fitnessDay = await db.fitnessDaily.findFirst({
      where: {
        userId,
        date: new Date(date)
      }
    })

    // Get daily state (mood, energy)
    const dailyState = await db.dailyState.findFirst({
      where: {
        userId,
        date: new Date(date)
      }
    })

    // Get measurements for date
    const measurements = await db.measurement.findMany({
      where: {
        userId,
        date: new Date(date)
      }
    })

    // Parse JSON fields
    let activities = []
    let foods = []
    let supplements = []

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
      date,
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

    const dateObj = new Date(date)

    // Upsert fitness daily
    const existingDay = await db.fitnessDaily.findFirst({
      where: { userId, date: dateObj }
    })

    const fitnessData = {
      userId,
      date: dateObj,
      water: data.water?.currentMl || 0,
      waterTarget: data.water?.targetMl || 2000,
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
        where: { userId, date: dateObj }
      })

      const stateData = {
        userId,
        date: dateObj,
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
      date,
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
