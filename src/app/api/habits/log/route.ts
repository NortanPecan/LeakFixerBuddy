import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Log habit completion
 * POST /api/habits/log
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { habitId, userId, completed = true, count = 1, note } = body

    if (!habitId || !userId) {
      return NextResponse.json(
        { error: 'Habit ID and User ID required' },
        { status: 400 }
      )
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Check if log exists for today
    const existingLog = await db.habitLog.findFirst({
      where: {
        habitId,
        date: { gte: today }
      }
    })

    let log
    if (existingLog) {
      // Update existing log
      log = await db.habitLog.update({
        where: { id: existingLog.id },
        data: {
          completed,
          count: completed ? (existingLog.count + 1) : 0,
          note
        }
      })
    } else {
      // Create new log
      log = await db.habitLog.create({
        data: {
          habitId,
          userId,
          completed,
          count: completed ? count : 0,
          note,
          date: today
        }
      })
    }

    // Get habit to check target
    const habit = await db.habit.findUnique({
      where: { id: habitId }
    })

    const isCompleted = habit ? log.count >= (habit.target || 1) : completed

    return NextResponse.json({
      success: true,
      log: {
        id: log.id,
        habitId: log.habitId,
        completed: log.completed,
        count: log.count,
        isCompleted
      }
    })
  } catch (error) {
    console.error('Log habit error:', error)
    return NextResponse.json(
      { error: 'Failed to log habit' },
      { status: 500 }
    )
  }
}
