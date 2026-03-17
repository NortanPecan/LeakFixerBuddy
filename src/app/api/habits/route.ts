import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { calculateHabitStreak, type CompletionEntry } from '@/lib/streak-utils'
import { z } from 'zod'

const CreateHabitSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1).max(100),
  icon: z.string().optional(),
  color: z.string().optional(),
  frequency: z.enum(['daily', 'weekly']).optional(),
  target: z.number().int().min(1).max(100).optional(),
})

const UpdateHabitSchema = z.object({
  habitId: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  target: z.number().int().min(1).max(100).optional(),
})

/**
 * Get user's habits with today's logs and weekly stats
 * GET /api/habits?userId=<id>
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    // Get all active habits for user
    const habits = await db.habit.findMany({
      where: { userId, active: true },
      orderBy: { createdAt: 'asc' }
    })

    // Get today's logs
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayLogs = await db.habitLog.findMany({
      where: {
        userId,
        date: { gte: today }
      }
    })

    // Get logs for the last 7 days for weekly stats
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6) // 6 days ago + today = 7 days
    sevenDaysAgo.setHours(0, 0, 0, 0)

    const weeklyLogs = await db.habitLog.findMany({
      where: {
        userId,
        date: { gte: sevenDaysAgo },
        completed: true
      },
      orderBy: { date: 'asc' }
    })

    // Build weekly stats array (7 days)
    const weeklyStats: { date: string; completed: number; total: number }[] = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(sevenDaysAgo)
      date.setDate(date.getDate() + i)
      date.setHours(0, 0, 0, 0)

      // Count completed habits for this date
      const completedForDate = weeklyLogs.filter(log => {
        const logDate = new Date(log.date)
        logDate.setHours(0, 0, 0, 0)
        return logDate.getTime() === date.getTime()
      }).length

      weeklyStats.push({
        date: date.toISOString().split('T')[0],
        completed: completedForDate,
        total: habits.length
      })
    }

    // Calculate streak for each habit
    const habitsWithStats = await Promise.all(habits.map(async (habit) => {
      // Get logs for this habit (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      thirtyDaysAgo.setHours(0, 0, 0, 0)

      const logs = await db.habitLog.findMany({
        where: {
          habitId: habit.id,
          date: { gte: thirtyDaysAgo }
        },
        orderBy: { date: 'desc' }
      })

      // Convert logs to completion entries for streak calculation
      const completionEntries: CompletionEntry[] = logs.map(l => ({
        date: l.date,
        completed: l.completed
      }))

      // Calculate streak using the utility
      // Note: habit.frequency can be 'daily' or 'weekly'
      const frequency = (habit.frequency as 'daily' | 'weekly') || 'daily'
      const streakResult = calculateHabitStreak(completionEntries, frequency, habit.target || 7, 30)

      // Find today's log
      const todayLog = todayLogs.find(l => l.habitId === habit.id)

      // Build last 7 days completion map
      const today7 = new Date()
      today7.setHours(0, 0, 0, 0)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today7)
        d.setDate(d.getDate() - (6 - i))
        const dateStr = d.toISOString().split('T')[0]
        const log = logs.find(l => l.date.toISOString().split('T')[0] === dateStr)
        return { date: dateStr, completed: log?.completed || false }
      })

      return {
        id: habit.id,
        name: habit.name,
        icon: habit.icon || '✨',
        color: habit.color || '#10b981',
        target: habit.target || 1,
        streak: streakResult.streak,
        completed: todayLog?.count || 0,
        isCompleted: todayLog?.completed || false,
        last7Days,
      }
    }))

    return NextResponse.json({
      habits: habitsWithStats,
      weeklyStats
    })
  } catch (error) {
    console.error('Get habits error:', error)
    return NextResponse.json(
      { error: 'Failed to get habits' },
      { status: 500 }
    )
  }
}

/**
 * Create a new habit
 * POST /api/habits
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = CreateHabitSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const { userId, name, icon, color, frequency, target } = parsed.data

    const habit = await db.habit.create({
      data: {
        userId,
        name,
        icon: icon || '✨',
        color: color || '#10b981',
        frequency: frequency || 'daily',
        target: target || 1,
        active: true
      }
    })

    return NextResponse.json({
      success: true,
      habit: {
        id: habit.id,
        name: habit.name,
        icon: habit.icon,
        color: habit.color,
        target: habit.target,
        streak: 0,
        completed: 0,
        isCompleted: false
      }
    })
  } catch (error) {
    console.error('Create habit error:', error)
    return NextResponse.json(
      { error: 'Failed to create habit' },
      { status: 500 }
    )
  }
}

/**
 * Update a habit
 * PATCH /api/habits
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = UpdateHabitSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const { habitId, name, icon, color, target } = parsed.data

    const habit = await db.habit.update({
      where: { id: habitId },
      data: {
        ...(name !== undefined && { name }),
        ...(icon !== undefined && { icon }),
        ...(color !== undefined && { color }),
        ...(target !== undefined && { target }),
      }
    })

    return NextResponse.json({
      success: true,
      habit: {
        id: habit.id,
        name: habit.name,
        icon: habit.icon,
        color: habit.color,
        target: habit.target,
      }
    })
  } catch (error) {
    console.error('Update habit error:', error)
    return NextResponse.json(
      { error: 'Failed to update habit' },
      { status: 500 }
    )
  }
}

/**
 * Delete a habit
 * DELETE /api/habits?habitId=<id>
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const habitId = searchParams.get('habitId')

    if (!habitId) {
      return NextResponse.json(
        { error: 'Habit ID required' },
        { status: 400 }
      )
    }

    // Delete habit (cascade deletes logs automatically via schema)
    await db.habit.delete({
      where: { id: habitId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete habit error:', error)
    return NextResponse.json(
      { error: 'Failed to delete habit' },
      { status: 500 }
    )
  }
}
