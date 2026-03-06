import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST - Reschedule workout to a specific date
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { workoutId, periodId, newDate } = body

    if (!workoutId || !periodId || !newDate) {
      return NextResponse.json({ error: 'workoutId, periodId and newDate required' }, { status: 400 })
    }

    // Get the workout to reschedule
    const workout = await db.gymWorkout.findUnique({
      where: { id: workoutId }
    })

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    const oldDate = new Date(workout.date)
    const targetDate = new Date(newDate)

    // Check if there's already a workout on the target date
    const existingWorkout = await db.gymWorkout.findFirst({
      where: {
        periodId,
        date: targetDate,
        id: { not: workoutId }
      }
    })

    if (existingWorkout) {
      // Swap: move existing workout to old date
      await db.gymWorkout.update({
        where: { id: existingWorkout.id },
        data: { date: oldDate }
      })
    }

    // Move the workout to the new date
    await db.gymWorkout.update({
      where: { id: workoutId },
      data: { date: targetDate }
    })

    return NextResponse.json({ 
      success: true,
      workoutId,
      newDate,
      swappedWith: existingWorkout?.id || null
    })
  } catch (error) {
    console.error('Reschedule workout error:', error)
    return NextResponse.json({ error: 'Failed to reschedule workout' }, { status: 500 })
  }
}
