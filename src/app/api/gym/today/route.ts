import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'

// GET - Fetch today's workout plan (v1.3 enhanced)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    // Get active period
    const activePeriod = await db.gymPeriod.findFirst({
      where: { userId, isActive: true }
    })

    if (!activePeriod) {
      return NextResponse.json({ 
        hasActivePeriod: false, 
        message: 'Нет активного периода' 
      })
    }

    // Get today's date (start of day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Find today's workout (v1.3: include workoutTemplate)
    const todayWorkout = await db.gymWorkout.findFirst({
      where: {
        periodId: activePeriod.id,
        date: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        workoutTemplate: true,
        exercises: {
          orderBy: { order: 'asc' },
          include: {
            template: true,
            workoutTemplateExercise: {
              include: {
                exerciseTemplate: true
              }
            },
            sets: {
              orderBy: { setNum: 'asc' }
            }
          }
        }
      }
    })

    // If no workout today, find next upcoming workout
    let nextWorkout: Prisma.GymWorkoutGetPayload<{ include: { workoutTemplate: true } }> | null = null
    if (!todayWorkout) {
      nextWorkout = await db.gymWorkout.findFirst({
        where: {
          periodId: activePeriod.id,
          date: { gte: today },
          completed: false,
          status: 'planned'
        },
        orderBy: { date: 'asc' },
        include: {
          workoutTemplate: true
        }
      })
    }

    // Get last cycle notes for exercises (if todayWorkout exists)
    let lastCycleNotes: Record<string, string> = {}
    if (todayWorkout && todayWorkout.cycleNumber && todayWorkout.cycleNumber > 1) {
      // Find the same workout from previous cycle
      const previousWorkout = await db.gymWorkout.findFirst({
        where: {
          periodId: activePeriod.id,
          workoutTemplateId: todayWorkout.workoutTemplateId,
          cycleNumber: todayWorkout.cycleNumber - 1
        },
        include: {
          exercises: {
            select: {
              workoutTemplateExerciseId: true,
              cycleNote: true
            }
          }
        }
      })
      
      if (previousWorkout) {
        for (const ex of previousWorkout.exercises) {
          if (ex.workoutTemplateExerciseId && ex.cycleNote) {
            lastCycleNotes[ex.workoutTemplateExerciseId] = ex.cycleNote
          }
        }
      }
    }

    // Calculate progress
    const completedWorkouts = await db.gymWorkout.count({
      where: {
        periodId: activePeriod.id,
        completed: true
      }
    })

    const totalWorkouts = activePeriod.totalCycles * activePeriod.workoutsPerCycle
    const progressPercent = totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0

    // Parse day schedule
    let daySchedule: unknown[] = []
    if (activePeriod.daySchedule) {
      try {
        daySchedule = JSON.parse(activePeriod.daySchedule)
      } catch {
        daySchedule = []
      }
    }

    // Parse additional activities if present
    let additionalActivities: unknown[] = []
    if (todayWorkout?.additionalActivities) {
      try {
        additionalActivities = JSON.parse(todayWorkout.additionalActivities)
      } catch {
        additionalActivities = []
      }
    }

    // Format response (v1.3 structure)
    const response = {
      hasActivePeriod: true,
      period: {
        id: activePeriod.id,
        name: activePeriod.name,
        type: activePeriod.type,
        currentCycle: todayWorkout?.cycleNumber || activePeriod.currentCycle,
        totalCycles: activePeriod.totalCycles,
        workoutsPerCycle: activePeriod.workoutsPerCycle,
        progressPercent,
        completedWorkouts,
        totalWorkouts,
        daySchedule
      },
      todayWorkout: todayWorkout ? {
        id: todayWorkout.id,
        date: todayWorkout.date,
        workoutNum: todayWorkout.workoutNum,
        cycleNumber: todayWorkout.cycleNumber,
        status: todayWorkout.status,
        completed: todayWorkout.completed,
        wellbeing: todayWorkout.wellbeing,
        wellbeingNote: todayWorkout.wellbeingNote,
        additionalActivities,
        template: todayWorkout.workoutTemplate ? {
          id: todayWorkout.workoutTemplate.id,
          name: todayWorkout.workoutTemplate.name,
          muscleGroups: todayWorkout.workoutTemplate.muscleGroups 
            ? JSON.parse(todayWorkout.workoutTemplate.muscleGroups) 
            : []
        } : null,
        exercises: todayWorkout.exercises.map(ex => {
          // Get technique notes from exercise template
          let techniqueNotes: string | null = null
          if (ex.template?.techniqueNotes) {
            techniqueNotes = ex.template.techniqueNotes
          } else if (ex.workoutTemplateExercise?.exerciseTemplate?.techniqueNotes) {
            techniqueNotes = ex.workoutTemplateExercise.exerciseTemplate.techniqueNotes
          }

          // Get last cycle note
          const lastCycleNote = ex.workoutTemplateExerciseId 
            ? lastCycleNotes[ex.workoutTemplateExerciseId] || null
            : null

          return {
            id: ex.id,
            name: ex.name,
            muscleGroup: ex.muscleGroup,
            order: ex.order,
            weight: ex.weight,
            repsScheme: ex.repsScheme,
            nextWeight: ex.nextWeight,
            templateId: ex.templateId,
            techniqueNotes,
            cycleNote: ex.cycleNote || null,
            lastCycleNote,
            sets: ex.sets.map(s => ({
              id: s.id,
              setNum: s.setNum,
              weight: s.weight,
              reps: s.reps,
              completed: s.completed
            }))
          }
        })
      } : null,
      nextWorkout: nextWorkout ? {
        id: nextWorkout.id,
        date: nextWorkout.date,
        name: nextWorkout.name,
        workoutNum: nextWorkout.workoutNum,
        cycleNumber: nextWorkout.cycleNumber,
        template: nextWorkout.workoutTemplate ? {
          id: nextWorkout.workoutTemplate.id,
          name: nextWorkout.workoutTemplate.name,
          muscleGroups: nextWorkout.workoutTemplate.muscleGroups 
            ? JSON.parse(nextWorkout.workoutTemplate.muscleGroups) 
            : []
        } : null
      } : null,
      isToday: !!todayWorkout
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Fetch today workout error:', error)
    return NextResponse.json({ error: 'Failed to fetch today workout' }, { status: 500 })
  }
}

// POST - Save workout completion (v1.3 with quick complete mode, v1.6 with cycleNote)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      workoutId,
      mode, // 'quickComplete' | 'detailed'
      completed,
      wellbeing,
      wellbeingNote,
      additionalActivities,
      exercises,
      cycleNote // v1.6: workout note to save as cycle note for next cycle
    } = body

    if (!workoutId) {
      return NextResponse.json({ error: 'workoutId required' }, { status: 400 })
    }

    // Get current workout
    const currentWorkout = await db.gymWorkout.findUnique({
      where: { id: workoutId },
      include: {
        exercises: {
          include: {
            template: true,
            workoutTemplateExercise: true
          }
        }
      }
    })

    if (!currentWorkout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    // Quick complete mode: mark as completed, set nextWeight if missing
    if (mode === 'quickComplete') {
      // Update exercises: set nextWeight = weight if missing
      for (const exercise of currentWorkout.exercises) {
        if (exercise.weight && !exercise.nextWeight) {
          await db.gymExercise.update({
            where: { id: exercise.id },
            data: {
              nextWeight: exercise.weight,
              updatedAt: new Date()
            }
          })
        }
      }

      const workout = await db.gymWorkout.update({
        where: { id: workoutId },
        data: {
          completed: true,
          status: 'completed',
          updatedAt: new Date()
        }
      })

      // Update period progress
      await updatePeriodProgress(currentWorkout.periodId)

      return NextResponse.json({ 
        success: true, 
        workout,
        mode: 'quickComplete',
        message: 'Тренировка завершена по плану'
      })
    }

    // Detailed mode: existing logic with exercises updates
    const workout = await db.gymWorkout.update({
      where: { id: workoutId },
      data: {
        completed: completed ?? true,
        status: completed ? 'completed' : 'planned',
        wellbeing: wellbeing ?? undefined,
        wellbeingNote: wellbeingNote ?? undefined,
        additionalActivities: additionalActivities ? JSON.stringify(additionalActivities) : undefined,
        updatedAt: new Date()
      }
    })

    // Update exercises and templates
    if (exercises && Array.isArray(exercises)) {
      for (const ex of exercises) {
        // Update exercise
        if (ex.nextWeight !== undefined || ex.repsScheme || ex.cycleNote) {
          await db.gymExercise.update({
            where: { id: ex.id },
            data: {
              nextWeight: ex.nextWeight,
              repsScheme: ex.repsScheme,
              cycleNote: ex.cycleNote,
              updatedAt: new Date()
            }
          })
        }

        // Update template if linked
        if (ex.templateId && ex.nextWeight !== undefined) {
          await db.gymExerciseTemplate.update({
            where: { id: ex.templateId },
            data: {
              currentWeight: ex.weight,
              nextWeight: ex.nextWeight,
              updatedAt: new Date()
            }
          })
        }

        // Update sets
        if (ex.sets && Array.isArray(ex.sets)) {
          for (const set of ex.sets) {
            await db.gymExerciseSet.update({
              where: { id: set.id },
              data: {
                weight: set.weight,
                reps: set.reps,
                completed: set.completed ?? true
              }
            })
          }
        }
      }
    }

    // v1.6: Save cycleNote for all exercises (workout note for next cycle)
    if (cycleNote && currentWorkout.exercises.length > 0) {
      for (const exercise of currentWorkout.exercises) {
        await db.gymExercise.update({
          where: { id: exercise.id },
          data: {
            cycleNote: cycleNote,
            updatedAt: new Date()
          }
        })
      }
    }

    // Update period progress
    if (completed) {
      await updatePeriodProgress(currentWorkout.periodId)
    }

    return NextResponse.json({ success: true, workout })
  } catch (error) {
    console.error('Save workout completion error:', error)
    return NextResponse.json({ error: 'Failed to save workout' }, { status: 500 })
  }
}

// Helper: Update period progress and transfer weights to new cycle
async function updatePeriodProgress(periodId: string) {
  const period = await db.gymPeriod.findUnique({
    where: { id: periodId },
    include: {
      workouts: {
        where: { completed: true }
      }
    }
  })

  if (!period) return

  const completedCount = period.workouts.length
  const workoutsPerCycle = period.workoutsPerCycle

  // Check if we should advance to next cycle
  if (completedCount > 0 && completedCount % workoutsPerCycle === 0) {
    const newCycle = Math.floor(completedCount / workoutsPerCycle) + 1
    const previousCycle = newCycle - 1
    
    await db.gymPeriod.update({
      where: { id: period.id },
      data: {
        currentCycle: Math.min(newCycle, period.totalCycles),
        currentDay: 1
      }
    })

    // Create new cycle if not at the end
    if (newCycle <= period.totalCycles) {
      const existingCycle = await db.gymCycle.findFirst({
        where: { periodId: period.id, cycleNum: newCycle }
      })
      
      if (!existingCycle) {
        await db.gymCycle.create({
          data: {
            periodId: period.id,
            cycleNum: newCycle
          }
        })
      }
      
      // v1.7: Transfer weights/reps/sets to new cycle
      await transferWeightsToNewCycle(periodId, previousCycle, newCycle)
    }
  }
}

// v1.7: Transfer weights, reps, sets from previous cycle to new cycle
async function transferWeightsToNewCycle(periodId: string, previousCycle: number, newCycle: number) {
  // Get workouts from previous cycle
  const previousWorkouts = await db.gymWorkout.findMany({
    where: {
      periodId,
      cycleNumber: previousCycle
    },
    include: {
      exercises: {
        include: {
          sets: { orderBy: { setNum: 'asc' } }
        }
      }
    }
  })
  
  // Get workouts from new cycle
  const newWorkouts = await db.gymWorkout.findMany({
    where: {
      periodId,
      cycleNumber: newCycle
    },
    include: {
      exercises: true
    }
  })
  
  // Match workouts by workoutNum
  for (const prevWorkout of previousWorkouts) {
    const newWorkout = newWorkouts.find(w => w.workoutNum === prevWorkout.workoutNum)
    if (!newWorkout) continue
    
    // Match exercises by workoutTemplateExerciseId or name
    for (const prevEx of prevWorkout.exercises) {
      // Skip if not included in future cycles
      if (prevEx.includeInFutureCycles === false) continue
      
      const newEx = newWorkout.exercises.find(e => 
        (e.workoutTemplateExerciseId && e.workoutTemplateExerciseId === prevEx.workoutTemplateExerciseId) ||
        e.name === prevEx.name
      )
      
      if (!newEx) continue
      
      // Calculate next values from previous exercise
      const workingSets = prevEx.sets.filter(s => !s.isWarmup)
      const firstWorkingSet = workingSets[0]
      const newWeight = prevEx.nextWeight || firstWorkingSet?.weight || prevEx.weight
      const newTargetReps = prevEx.nextTargetReps || firstWorkingSet?.reps || prevEx.targetReps
      const newTargetSets = prevEx.nextTargetSets || workingSets.length || prevEx.targetSets
      
      // Update exercise with new values
      await db.gymExercise.update({
        where: { id: newEx.id },
        data: {
          weight: newWeight,
          targetReps: newTargetReps,
          targetSets: newTargetSets || 4,
          // Copy cycle note from previous (will be shown as lastCycleNote)
          updatedAt: new Date()
        }
      })
      
      // Update or create sets for new exercise
      const existingSets = await db.gymExerciseSet.findMany({
        where: { exerciseId: newEx.id },
        orderBy: { setNum: 'asc' }
      })
      
      const targetSetsCount = newTargetSets || 4
      
      // Update existing sets
      for (let i = 0; i < existingSets.length; i++) {
        const set = existingSets[i]
        if (!set.isWarmup) {
          await db.gymExerciseSet.update({
            where: { id: set.id },
            data: {
              weight: newWeight,
              reps: newTargetReps
            }
          })
        }
      }
      
      // Create additional sets if needed
      if (existingSets.length < targetSetsCount) {
        for (let i = existingSets.length; i < targetSetsCount; i++) {
          await db.gymExerciseSet.create({
            data: {
              exerciseId: newEx.id,
              setNum: i + 1,
              weight: newWeight,
              reps: newTargetReps,
              completed: false,
              isWarmup: false
            }
          })
        }
      }
      
      // Remove extra sets if target decreased
      if (existingSets.length > targetSetsCount) {
        const setsToDelete = existingSets
          .filter(s => !s.isWarmup && s.setNum > targetSetsCount)
          .map(s => s.id)
        
        if (setsToDelete.length > 0) {
          await db.gymExerciseSet.deleteMany({
            where: { id: { in: setsToDelete } }
          })
        }
      }
      
      // Update exercise template if linked
      if (newEx.templateId && newWeight) {
        await db.gymExerciseTemplate.update({
          where: { id: newEx.templateId },
          data: {
            currentWeight: newWeight,
            updatedAt: new Date()
          }
        })
      }
    }
  }
}

// PATCH - Update specific exercise (for nextWeight updates)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { exerciseId, weight, repsScheme, nextWeight, cycleNote, updateTemplate } = body

    if (!exerciseId) {
      return NextResponse.json({ error: 'exerciseId required' }, { status: 400 })
    }

    // Update exercise
    const exercise = await db.gymExercise.update({
      where: { id: exerciseId },
      data: {
        repsScheme: repsScheme ?? undefined,
        nextWeight: nextWeight ?? undefined,
        cycleNote: cycleNote ?? undefined,
        updatedAt: new Date()
      },
      include: { template: true }
    })

    // Update template if requested and linked
    if (updateTemplate && exercise.templateId && (weight !== undefined || nextWeight !== undefined)) {
      await db.gymExerciseTemplate.update({
        where: { id: exercise.templateId },
        data: {
          currentWeight: weight ?? undefined,
          nextWeight: nextWeight ?? undefined,
          updatedAt: new Date()
        }
      })
    }

    return NextResponse.json({ success: true, exercise })
  } catch (error) {
    console.error('Update exercise error:', error)
    return NextResponse.json({ error: 'Failed to update exercise' }, { status: 500 })
  }
}
