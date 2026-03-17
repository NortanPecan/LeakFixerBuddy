import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { safeParseFloat } from '@/lib/network-utils'

// GET - Get today's weight and summary
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Get today's weight measurements
    const todayMeasurements = await db.measurement.findMany({
      where: {
        userId,
        type: 'weight',
        date: {
          gte: today,
          lt: tomorrow
        }
      },
      orderBy: { date: 'desc' }
    })

    // Calculate today's average
    const todayAvg = todayMeasurements.length > 0
      ? todayMeasurements.reduce((sum, m) => sum + m.value, 0) / todayMeasurements.length
      : null

    // Get yesterday's average for comparison
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayEnd = new Date(today)

    const yesterdayMeasurements = await db.measurement.findMany({
      where: {
        userId,
        type: 'weight',
        date: {
          gte: yesterday,
          lt: yesterdayEnd
        }
      }
    })

    const yesterdayAvg = yesterdayMeasurements.length > 0
      ? yesterdayMeasurements.reduce((sum, m) => sum + m.value, 0) / yesterdayMeasurements.length
      : null

    // Get week ago average
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)
    const weekAgoEnd = new Date(weekAgo)
    weekAgoEnd.setDate(weekAgoEnd.getDate() + 1)

    const weekAgoMeasurements = await db.measurement.findMany({
      where: {
        userId,
        type: 'weight',
        date: {
          gte: weekAgo,
          lt: weekAgoEnd
        }
      }
    })

    const weekAgoAvg = weekAgoMeasurements.length > 0
      ? weekAgoMeasurements.reduce((sum, m) => sum + m.value, 0) / weekAgoMeasurements.length
      : null

    // Get user profile for goal
    const profile = await db.userProfile.findUnique({
      where: { userId },
      select: {
        weight: true,
        targetWeight: true,
        weightStart: true,
        weightStartAt: true,
        weightDeadline: true
      }
    })

    const currentWeight = todayAvg || profile?.weight
    const targetWeight = profile?.targetWeight
    const weightStart = profile?.weightStart
    const weightStartAt = profile?.weightStartAt
    const weightDeadline = profile?.weightDeadline

    // Calculate changes
    const changeToday = todayAvg && yesterdayAvg ? todayAvg - yesterdayAvg : null
    const changeWeek = todayAvg && weekAgoAvg ? todayAvg - weekAgoAvg : null
    const toGoal = currentWeight && targetWeight ? targetWeight - currentWeight : null

    // Calculate progress
    let progress: number | null = null
    if (weightStart && targetWeight && currentWeight) {
      const totalToLose = weightStart - targetWeight
      const lost = weightStart - currentWeight
      progress = totalToLose !== 0 ? Math.min(100, Math.max(0, (lost / totalToLose) * 100)) : 0
    }

    return NextResponse.json({
      today: todayMeasurements,
      todayAvg,
      changeToday,
      changeWeek,
      currentWeight,
      targetWeight,
      weightStart,
      weightStartAt,
      weightDeadline,
      toGoal,
      progress
    })
  } catch (error) {
    console.error('Get weight error:', error)
    return NextResponse.json({ error: 'Failed to get weight' }, { status: 500 })
  }
}

// POST - Add weight measurement
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, value, note } = body

    if (!userId || value === undefined || value === null) {
      return NextResponse.json({ error: 'userId and value required' }, { status: 400 })
    }

    const parsedWeight = safeParseFloat(value)
    if (parsedWeight === null) {
      return NextResponse.json({ error: 'value must be a valid number' }, { status: 400 })
    }

    // Create measurement
    const measurement = await db.measurement.create({
      data: {
        userId,
        type: 'weight',
        value: parsedWeight,
        unit: 'kg',
        note
      }
    })

    // Update profile weight if it's the first measurement or user wants to update
    const profile = await db.userProfile.findUnique({
      where: { userId }
    })

    if (profile) {
      // Set weightStart if not set
      if (!profile.weightStart) {
        await db.userProfile.update({
          where: { userId },
          data: {
            weight: parsedWeight,
            weightStart: parsedWeight,
            weightStartAt: new Date()
          }
        })
      } else {
        // Just update current weight
        await db.userProfile.update({
          where: { userId },
          data: { weight: parsedWeight }
        })
      }
    }

    return NextResponse.json({ measurement })
  } catch (error) {
    console.error('Add weight error:', error)
    return NextResponse.json({ error: 'Failed to add weight' }, { status: 500 })
  }
}

// DELETE - Remove weight measurement
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const measurementId = searchParams.get('id')

    if (!measurementId) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    await db.measurement.delete({
      where: { id: measurementId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete weight error:', error)
    return NextResponse.json({ error: 'Failed to delete weight' }, { status: 500 })
  }
}
