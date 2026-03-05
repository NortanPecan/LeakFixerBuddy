import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Get user's habits with today's logs
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

    // Calculate streak for each habit
    const habitsWithStats = await Promise.all(habits.map(async (habit) => {
      // Get logs for this habit (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      thirtyDaysAgo.setHours(0, 0, 0, 0)

      const logs = await db.habitLog.findMany({
        where: {
          habitId: habit.id,
          completed: true,
          date: { gte: thirtyDaysAgo }
        },
        orderBy: { date: 'desc' }
      })

      // Calculate streak
      let streak = 0
      const todayDate = new Date()
      todayDate.setHours(0, 0, 0, 0)

      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(todayDate)
        checkDate.setDate(checkDate.getDate() - i)

        const logForDate = logs.find(l => {
          const logDate = new Date(l.date)
          logDate.setHours(0, 0, 0, 0)
          return logDate.getTime() === checkDate.getTime()
        })

        if (logForDate?.completed) {
          streak++
        } else if (i > 0) {
          break
        }
      }

      // Find today's log
      const todayLog = todayLogs.find(l => l.habitId === habit.id)

      return {
        id: habit.id,
        name: habit.name,
        icon: habit.icon || '✨',
        color: habit.color || '#10b981',
        target: habit.target || 1,
        streak,
        completed: todayLog?.count || 0,
        isCompleted: todayLog?.completed || false
      }
    }))

    return NextResponse.json({
      habits: habitsWithStats
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
    const { userId, name, icon, color, frequency, target } = body

    if (!userId || !name) {
      return NextResponse.json(
        { error: 'User ID and name required' },
        { status: 400 }
      )
    }

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
