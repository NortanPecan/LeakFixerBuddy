import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Fetch workouts for a period
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const periodId = searchParams.get('periodId')

    if (!periodId) {
      return NextResponse.json({ error: 'periodId required' }, { status: 400 })
    }

    const workouts = await db.gymWorkout.findMany({
      where: { periodId },
      orderBy: { date: 'asc' }
    })

    return NextResponse.json({ workouts })
  } catch (error) {
    console.error('Fetch workouts error:', error)
    return NextResponse.json({ error: 'Failed to fetch workouts' }, { status: 500 })
  }
}

// PATCH - Update workout (mark as completed)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { workoutId, completed, duration, notes } = body

    if (!workoutId) {
      return NextResponse.json({ error: 'workoutId required' }, { status: 400 })
    }

    const workout = await db.gymWorkout.update({
      where: { id: workoutId },
      data: {
        completed: completed ?? true,
        duration,
        notes
      }
    })

    // Update period progress if workout completed
    if (completed) {
      const period = await db.gymPeriod.findUnique({
        where: { id: workout.periodId },
        include: {
          workouts: {
            where: { completed: true }
          }
        }
      })

      if (period) {
        const completedCount = period.workouts.length
        const workoutsPerCycle = period.workoutsPerCycle

        // Check if we should advance to next cycle
        if (completedCount > 0 && completedCount % workoutsPerCycle === 0) {
          const newCycle = Math.floor(completedCount / workoutsPerCycle) + 1
          await db.gymPeriod.update({
            where: { id: period.id },
            data: {
              currentCycle: Math.min(newCycle, period.totalCycles),
              currentDay: 1
            }
          })

          // Create new cycle if not at the end
          if (newCycle <= period.totalCycles) {
            await db.gymCycle.create({
              data: {
                periodId: period.id,
                cycleNum: newCycle
              }
            })
          }
        }
      }
    }

    return NextResponse.json({ workout })
  } catch (error) {
    console.error('Update workout error:', error)
    return NextResponse.json({ error: 'Failed to update workout' }, { status: 500 })
  }
}
