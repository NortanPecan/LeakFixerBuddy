import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import {
  formatDateKey,
  getStartOfDay,
  getStartOfNextDay,
} from '@/lib/date-utils'
import { calculateHabitStreak, type CompletionEntry } from '@/lib/streak-utils'
import { requireSelf } from '@/lib/server-auth'

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

type HabitFrequency = 'daily' | 'weekly'

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

    const auth = requireSelf(request, userId)
    if ('error' in auth) return auth.error

    const habits = await db.habit.findMany({
      where: { userId, active: true },
      orderBy: { createdAt: 'asc' },
    })

    const today = getStartOfDay(new Date())
    const tomorrow = getStartOfNextDay(today)

    const todayLogs = await db.habitLog.findMany({
      where: {
        userId,
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
    })

    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)

    const weeklyLogs = await db.habitLog.findMany({
      where: {
        userId,
        date: { gte: sevenDaysAgo, lt: tomorrow },
        completed: true,
      },
      orderBy: { date: 'asc' },
    })

    const weeklyStats: { date: string; completed: number; total: number }[] = []
    for (let index = 0; index < 7; index += 1) {
      const currentDate = new Date(sevenDaysAgo)
      currentDate.setDate(currentDate.getDate() + index)
      const dateKey = formatDateKey(currentDate)

      const completedForDate = weeklyLogs.filter((log) => (
        formatDateKey(log.date) === dateKey
      )).length

      weeklyStats.push({
        date: dateKey,
        completed: completedForDate,
        total: habits.length,
      })
    }

    const habitsWithStats = await Promise.all(habits.map(async (habit) => {
      const thirtyDaysAgo = new Date(today)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)

      const logs = await db.habitLog.findMany({
        where: {
          habitId: habit.id,
          date: { gte: thirtyDaysAgo, lt: tomorrow },
        },
        orderBy: { date: 'desc' },
      })

      const frequency: HabitFrequency = habit.frequency === 'weekly' ? 'weekly' : 'daily'
      const targetCount = habit.target || 1
      const completionEntries: CompletionEntry[] = logs.map((log) => ({
        date: log.date,
        completed: log.completed,
        count: log.count,
      }))

      const streakResult = calculateHabitStreak({
        completions: completionEntries,
        frequency,
        referenceDate: today,
        periodDays: 30,
        dailyTarget: frequency === 'daily' ? targetCount : 1,
        weeklyTarget: frequency === 'weekly' ? targetCount : 1,
      })

      const todayLog = todayLogs.find((log) => log.habitId === habit.id)

      const last7Days = Array.from({ length: 7 }, (_, index) => {
        const currentDate = new Date(today)
        currentDate.setDate(currentDate.getDate() - (6 - index))
        const dateKey = formatDateKey(currentDate)
        const log = logs.find((entry) => formatDateKey(entry.date) === dateKey)
        const completed = frequency === 'weekly'
          ? (log?.count ?? 0) > 0
          : (log?.count ?? 0) >= targetCount

        return { date: dateKey, completed }
      })

      return {
        id: habit.id,
        name: habit.name,
        icon: habit.icon || '*',
        color: habit.color || '#10b981',
        target: targetCount,
        streak: streakResult.streak,
        completed: todayLog?.count || 0,
        isCompleted: todayLog?.completed || false,
        last7Days,
        completionRate30d: streakResult.completionRate,
      }
    }))

    return NextResponse.json({
      habits: habitsWithStats,
      weeklyStats,
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

    const auth = requireSelf(request, userId)
    if ('error' in auth) return auth.error

    const habit = await db.habit.create({
      data: {
        userId,
        name,
        icon: icon || '*',
        color: color || '#10b981',
        frequency: frequency || 'daily',
        target: target || 1,
        active: true,
      },
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
        isCompleted: false,
      },
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

    const existingHabit = await db.habit.findUnique({
      where: { id: habitId },
      select: { userId: true },
    })

    if (!existingHabit) {
      return NextResponse.json(
        { error: 'Habit not found' },
        { status: 404 }
      )
    }

    const auth = requireSelf(request, existingHabit.userId)
    if ('error' in auth) return auth.error

    const habit = await db.habit.update({
      where: { id: habitId },
      data: {
        ...(name !== undefined && { name }),
        ...(icon !== undefined && { icon }),
        ...(color !== undefined && { color }),
        ...(target !== undefined && { target }),
      },
    })

    return NextResponse.json({
      success: true,
      habit: {
        id: habit.id,
        name: habit.name,
        icon: habit.icon,
        color: habit.color,
        target: habit.target,
      },
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

    const existingHabit = await db.habit.findUnique({
      where: { id: habitId },
      select: { userId: true },
    })

    if (!existingHabit) {
      return NextResponse.json(
        { error: 'Habit not found' },
        { status: 404 }
      )
    }

    const auth = requireSelf(request, existingHabit.userId)
    if ('error' in auth) return auth.error

    await db.habit.delete({
      where: { id: habitId },
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
