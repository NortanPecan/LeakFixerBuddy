import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { safeParseFloat, safeParseInt } from '@/lib/network-utils'

// POST - Add set to exercise (v1.5: with warmup support)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { exerciseId, setNum, weight, reps, duration, isWarmup, insertBefore } = body

    if (!exerciseId) {
      return NextResponse.json({ error: 'exerciseId required' }, { status: 400 })
    }

    // Get current exercise and its sets
    const exercise = await db.gymExercise.findUnique({
      where: { id: exerciseId },
      include: { sets: { orderBy: { setNum: 'asc' } } }
    })

    if (!exercise) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 })
    }

    const currentSets = exercise.sets
    const isWarmupSet = isWarmup ?? false

    // Determine the set number
    let finalSetNum: number

    if (insertBefore !== undefined) {
      // Insert before a specific set (for warmup sets)
      // Shift existing sets up
      await db.gymExerciseSet.updateMany({
        where: {
          exerciseId,
          setNum: { gte: insertBefore }
        },
        data: {
          setNum: { increment: 1 }
        }
      })
      finalSetNum = insertBefore
    } else if (isWarmupSet) {
      // Add warmup set at the beginning
      const warmupCount = currentSets.filter(s => s.isWarmup).length
      finalSetNum = warmupCount + 1
      
      // Shift all existing sets up
      await db.gymExerciseSet.updateMany({
        where: { exerciseId },
        data: { setNum: { increment: 1 } }
      })
    } else {
      // Add working set at the end
      const maxSetNum = currentSets.length > 0 
        ? Math.max(...currentSets.map(s => s.setNum)) 
        : 0
      finalSetNum = maxSetNum + 1
    }

    const set = await db.gymExerciseSet.create({
      data: {
        exerciseId,
        setNum: finalSetNum,
        weight: weight ? (safeParseFloat(weight) ?? exercise.weight) : exercise.weight,
        reps: reps ? (safeParseInt(reps) ?? exercise.targetReps) : exercise.targetReps,
        duration: duration ? safeParseInt(duration) : null,
        completed: false,
        isWarmup: isWarmupSet,
      },
    })

    return NextResponse.json({ set })
  } catch (error) {
    console.error('Create set error:', error)
    return NextResponse.json({ error: 'Failed to create set' }, { status: 500 })
  }
}

// PATCH - Update set (v1.5: with fillAll support)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { setId, weight, reps, duration, completed, notes, fillAll } = body

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

    if (weight !== undefined) updateData.weight = weight ? safeParseFloat(weight) : null
    if (reps !== undefined) updateData.reps = reps ? safeParseInt(reps) : null
    if (duration !== undefined) updateData.duration = duration ? safeParseInt(duration) : null
    if (completed !== undefined) updateData.completed = completed
    if (notes !== undefined) updateData.notes = notes

    const set = await db.gymExerciseSet.update({
      where: { id: setId },
      data: updateData,
    })

    // v1.5: Fill all sets with the same weight if requested
    if (fillAll && weight !== undefined) {
      // Get the exercise
      const exercise = await db.gymExercise.findFirst({
        where: { id: set.exerciseId }
      })
      
      if (exercise) {
        // Update all working sets (non-warmup) that don't have weight yet
        await db.gymExerciseSet.updateMany({
          where: {
            exerciseId: set.exerciseId,
            isWarmup: false,
            weight: null,
          },
          data: { weight: safeParseFloat(weight) }
        })
        
        // Also update exercise weight
        await db.gymExercise.update({
          where: { id: exercise.id },
          data: { weight: safeParseFloat(weight) }
        })
      }
    }

    // v1.4: Auto-set workout status to in_progress if it was planned
    const exercise = await db.gymExercise.findUnique({
      where: { id: set.exerciseId },
      include: { workout: true }
    })

    let workoutStatusChanged = false
    if (exercise?.workout && exercise.workout.status === 'planned') {
      await db.gymWorkout.update({
        where: { id: exercise.workout.id },
        data: { status: 'in_progress', updatedAt: new Date() }
      })
      workoutStatusChanged = true
    }

    return NextResponse.json({ set, workoutStatusChanged })
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

    // Get the set before deleting to renumber
    const set = await db.gymExerciseSet.findUnique({
      where: { id: setId }
    })

    if (!set) {
      return NextResponse.json({ error: 'Set not found' }, { status: 404 })
    }

    await db.gymExerciseSet.delete({
      where: { id: setId },
    })

    // Renumber remaining sets
    const remainingSets = await db.gymExerciseSet.findMany({
      where: { exerciseId: set.exerciseId },
      orderBy: { setNum: 'asc' }
    })

    for (let i = 0; i < remainingSets.length; i++) {
      if (remainingSets[i].setNum !== i + 1) {
        await db.gymExerciseSet.update({
          where: { id: remainingSets[i].id },
          data: { setNum: i + 1 }
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete set error:', error)
    return NextResponse.json({ error: 'Failed to delete set' }, { status: 500 })
  }
}
