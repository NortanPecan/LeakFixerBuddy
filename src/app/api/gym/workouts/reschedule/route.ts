import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST - Reschedule workout to a specific date
// Options:
// - shiftCycle: false (default) - just move this workout, swap if target date is occupied
// - shiftCycle: true - move this workout AND shift all subsequent workouts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { workoutId, periodId, newDate, shiftCycle } = body

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

    if (shiftCycle) {
      // Shift mode: move this workout and all subsequent workouts
      const daysDiff = Math.floor((targetDate.getTime() - oldDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysDiff === 0) {
        return NextResponse.json({ success: true, message: 'Same date, no changes needed' })
      }

      // Get all workouts from this date onwards
      const subsequentWorkouts = await db.gymWorkout.findMany({
        where: {
          periodId,
          date: { gte: oldDate },
          completed: false
        },
        orderBy: { date: 'asc' }
      })

      // Shift all of them
      for (const w of subsequentWorkouts) {
        const wDate = new Date(w.date)
        wDate.setDate(wDate.getDate() + daysDiff)
        
        await db.gymWorkout.update({
          where: { id: w.id },
          data: { date: wDate }
        })
      }

      return NextResponse.json({ 
        success: true,
        workoutId,
        newDate,
        shiftedCount: subsequentWorkouts.length,
        mode: 'shift'
      })
    } else {
      // Single mode: just move this workout, swap if target is occupied
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
        swappedWith: existingWorkout?.id || null,
        mode: 'single'
      })
    }
  } catch (error) {
    console.error('Reschedule workout error:', error)
    return NextResponse.json({ error: 'Failed to reschedule workout' }, { status: 500 })
  }
}
