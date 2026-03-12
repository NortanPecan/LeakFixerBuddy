import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Fetch exercise history for a template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const periodId = searchParams.get('periodId')

    // Get all exercises linked to this template
    const where: {
      templateId: string
      workout?: { periodId: string }
    } = { templateId: id }

    if (periodId) {
      where.workout = { periodId }
    }

    const exercises = await db.gymExercise.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        workout: {
          select: {
            id: true,
            date: true,
            name: true,
            completed: true,
            status: true,
            periodId: true
          }
        },
        sets: {
          orderBy: { setNum: 'asc' }
        }
      }
    })

    // Format for display
    const history = exercises.map(ex => ({
      id: ex.id,
      date: ex.workout.date,
      workoutName: ex.workout.name,
      workoutId: ex.workout.id,
      completed: ex.workout.completed,
      status: ex.workout.status,
      repsScheme: ex.repsScheme,
      nextWeight: ex.nextWeight,
      sets: ex.sets.map(s => ({
        setNum: s.setNum,
        weight: s.weight,
        reps: s.reps,
        completed: s.completed
      })),
      // Get weight from first set or from exercise
      weight: ex.sets[0]?.weight || null
    }))

    return NextResponse.json({ history })
  } catch (error) {
    console.error('Fetch exercise history error:', error)
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
  }
}
