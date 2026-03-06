import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST - Skip workout and shift all future workouts by 1 day
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { workoutId, periodId } = body

    if (!workoutId || !periodId) {
      return NextResponse.json({ error: 'workoutId and periodId required' }, { status: 400 })
    }

    // Get the workout to skip
    const workout = await db.gymWorkout.findUnique({
      where: { id: workoutId }
    })

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    // Get all future workouts in this period (including current) ordered by date
    const futureWorkouts = await db.gymWorkout.findMany({
      where: {
        periodId,
        date: { gte: workout.date },
        completed: false
      },
      orderBy: { date: 'asc' }
    })

    // Shift each workout by 1 day
    const shiftedWorkouts: { id: string; newDate: Date }[] = []
    
    for (const w of futureWorkouts) {
      const newDate = new Date(w.date)
      newDate.setDate(newDate.getDate() + 1)
      
      await db.gymWorkout.update({
        where: { id: w.id },
        data: { date: newDate }
      })
      
      shiftedWorkouts.push({ id: w.id, newDate })
    }

    return NextResponse.json({ 
      success: true, 
      skippedWorkoutId: workoutId,
      shiftedWorkouts
    })
  } catch (error) {
    console.error('Skip workout error:', error)
    return NextResponse.json({ error: 'Failed to skip workout' }, { status: 500 })
  }
}
