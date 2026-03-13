import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST - Add exercise to workout with auto-creating sets
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      workoutId, 
      name, 
      muscleGroup, 
      order,
      templateId,
      targetReps,
      targetSets,
      weight,
      createSets = true // v1.5: auto-create sets
    } = body

    if (!workoutId || !name) {
      return NextResponse.json({ error: 'workoutId and name required' }, { status: 400 })
    }

    // Get template data if provided
    let finalTargetReps = targetReps
    let finalTargetSets = targetSets || 4
    let finalWeight = weight

    if (templateId) {
      const template = await db.gymExerciseTemplate.findUnique({
        where: { id: templateId }
      })
      if (template) {
        finalTargetReps = targetReps ?? template.defaultReps
        finalTargetSets = targetSets ?? template.defaultSets
        finalWeight = weight ?? template.currentWeight ?? template.nextWeight
      }
    }

    // Create exercise
    const exercise = await db.gymExercise.create({
      data: {
        workoutId,
        name,
        muscleGroup,
        order: order || 0,
        templateId,
        targetReps: finalTargetReps,
        targetSets: finalTargetSets,
        weight: finalWeight,
      },
    })

    // v1.5: Auto-create working sets
    if (createSets && finalTargetSets > 0) {
      const setsData = []
      for (let i = 1; i <= finalTargetSets; i++) {
        setsData.push({
          exerciseId: exercise.id,
          setNum: i,
          weight: finalWeight,
          reps: finalTargetReps,
          completed: false,
          isWarmup: false,
        })
      }
      await db.gymExerciseSet.createMany({ data: setsData })
    }

    // Return exercise with sets
    const exerciseWithSets = await db.gymExercise.findUnique({
      where: { id: exercise.id },
      include: { sets: { orderBy: { setNum: 'asc' } } }
    })

    return NextResponse.json({ exercise: exerciseWithSets })
  } catch (error) {
    console.error('Create exercise error:', error)
    return NextResponse.json({ error: 'Failed to create exercise' }, { status: 500 })
  }
}

// PATCH - Update exercise (reps, sets, etc.)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { exerciseId, targetReps, targetSets, weight, nextWeight, updateSets, includeInFutureCycles } = body

    if (!exerciseId) {
      return NextResponse.json({ error: 'exerciseId required' }, { status: 400 })
    }

    const updateData: {
      targetReps?: number | null
      targetSets?: number
      weight?: number | null
      nextWeight?: number | null
      includeInFutureCycles?: boolean
      updatedAt: Date
    } = { updatedAt: new Date() }

    if (targetReps !== undefined) updateData.targetReps = targetReps
    if (targetSets !== undefined) updateData.targetSets = targetSets
    if (weight !== undefined) updateData.weight = weight
    if (nextWeight !== undefined) updateData.nextWeight = nextWeight
    if (includeInFutureCycles !== undefined) updateData.includeInFutureCycles = includeInFutureCycles

    const exercise = await db.gymExercise.update({
      where: { id: exerciseId },
      data: updateData,
      include: { sets: { orderBy: { setNum: 'asc' } } }
    })

    // If updateSets is true, sync the number of sets
    if (updateSets && targetSets !== undefined) {
      const currentSets = exercise.sets.filter(s => !s.isWarmup)
      const currentCount = currentSets.length
      
      if (targetSets > currentCount) {
        // Add more sets
        const newSets = []
        for (let i = currentCount + 1; i <= targetSets; i++) {
          newSets.push({
            exerciseId,
            setNum: i,
            weight: exercise.weight,
            reps: exercise.targetReps,
            completed: false,
            isWarmup: false,
          })
        }
        await db.gymExerciseSet.createMany({ data: newSets })
      } else if (targetSets < currentCount) {
        // Remove extra sets (only non-completed ones)
        const setsToDelete = currentSets
          .filter(s => !s.completed && s.setNum > targetSets)
          .map(s => s.id)
        
        if (setsToDelete.length > 0) {
          await db.gymExerciseSet.deleteMany({
            where: { id: { in: setsToDelete } }
          })
        }
      }
    }

    return NextResponse.json({ exercise })
  } catch (error) {
    console.error('Update exercise error:', error)
    return NextResponse.json({ error: 'Failed to update exercise' }, { status: 500 })
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
