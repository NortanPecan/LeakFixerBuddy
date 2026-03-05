import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST - Add exercise to workout
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { workoutId, name, muscleGroup, order } = body

    if (!workoutId || !name) {
      return NextResponse.json({ error: 'workoutId and name required' }, { status: 400 })
    }

    const exercise = await db.gymExercise.create({
      data: {
        workoutId,
        name,
        muscleGroup,
        order: order || 0,
      },
    })

    return NextResponse.json({ exercise })
  } catch (error) {
    console.error('Create exercise error:', error)
    return NextResponse.json({ error: 'Failed to create exercise' }, { status: 500 })
  }
}

// DELETE - Remove exercise
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const exerciseId = searchParams.get('exerciseId')

    if (!exerciseId) {
      return NextResponse.json({ error: 'exerciseId required' }, { status: 400 })
    }

    // Delete all sets first
    await db.gymExerciseSet.deleteMany({
      where: { exerciseId },
    })

    await db.gymExercise.delete({
      where: { id: exerciseId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete exercise error:', error)
    return NextResponse.json({ error: 'Failed to delete exercise' }, { status: 500 })
  }
}
