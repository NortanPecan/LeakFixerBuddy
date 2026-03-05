import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Fetch workout with exercises
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const workout = await db.gymWorkout.findUnique({
      where: { id },
      include: {
        exercises: {
          orderBy: { order: 'asc' },
          include: {
            sets: {
              orderBy: { setNum: 'asc' },
            },
          },
        },
      },
    })

    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    // Parse muscle groups if stored as JSON string
    let muscleGroups: string[] = []
    if (workout.muscleGroups) {
      try {
        muscleGroups = JSON.parse(workout.muscleGroups)
      } catch {
        muscleGroups = []
      }
    }

    return NextResponse.json({
      workout: {
        ...workout,
        muscleGroups,
        exercises: workout.exercises.map(e => ({
          ...e,
          sets: e.sets,
        })),
      },
    })
  } catch (error) {
    console.error('Fetch workout error:', error)
    return NextResponse.json({ error: 'Failed to fetch workout' }, { status: 500 })
  }
}
