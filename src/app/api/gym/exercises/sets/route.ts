import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST - Add set to exercise
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { exerciseId, setNum, weight, reps, duration } = body

    if (!exerciseId) {
      return NextResponse.json({ error: 'exerciseId required' }, { status: 400 })
    }

    const set = await db.gymExerciseSet.create({
      data: {
        exerciseId,
        setNum: setNum || 1,
        weight: weight ? parseFloat(weight) : null,
        reps: reps ? parseInt(reps) : null,
        duration: duration ? parseInt(duration) : null,
        completed: false,
      },
    })

    return NextResponse.json({ set })
  } catch (error) {
    console.error('Create set error:', error)
    return NextResponse.json({ error: 'Failed to create set' }, { status: 500 })
  }
}

// PATCH - Update set
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { setId, weight, reps, duration, completed, notes } = body

    if (!setId) {
      return NextResponse.json({ error: 'setId required' }, { status: 400 })
    }

    const updateData: {
      weight?: number | null
      reps?: number | null
      duration?: number | null
      completed?: boolean
      notes?: string | null
    } = {}

    if (weight !== undefined) updateData.weight = weight ? parseFloat(weight) : null
    if (reps !== undefined) updateData.reps = reps ? parseInt(reps) : null
    if (duration !== undefined) updateData.duration = duration ? parseInt(duration) : null
    if (completed !== undefined) updateData.completed = completed
    if (notes !== undefined) updateData.notes = notes

    const set = await db.gymExerciseSet.update({
      where: { id: setId },
      data: updateData,
    })

    return NextResponse.json({ set })
  } catch (error) {
    console.error('Update set error:', error)
    return NextResponse.json({ error: 'Failed to update set' }, { status: 500 })
  }
}

// DELETE - Remove set
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const setId = searchParams.get('setId')

    if (!setId) {
      return NextResponse.json({ error: 'setId required' }, { status: 400 })
    }

    await db.gymExerciseSet.delete({
      where: { id: setId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete set error:', error)
    return NextResponse.json({ error: 'Failed to delete set' }, { status: 500 })
  }
}
