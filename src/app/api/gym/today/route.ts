import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Fetch today's workout plan
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

    // Find today's workout
    const todayWorkout = await db.gymWorkout.findFirst({
      where: {
        periodId: activePeriod.id,
        date: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        exercises: {
          orderBy: { order: 'asc' },
          include: {
            template: true,
            sets: {
              orderBy: { setNum: 'asc' }
            }
          }
        }
      }
    })

    // If no workout today, find next upcoming workout
    let nextWorkout = null
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
          exercises: {
            orderBy: { order: 'asc' },
            include: {
              template: true,
              sets: {
                orderBy: { setNum: 'asc' }
              }
            }
          }
        }
      })
    }

    // Calculate progress
    const completedWorkouts = await db.gymWorkout.count({
      where: {
        periodId: activePeriod.id,
        completed: true
      }
    })

    const totalWorkouts = activePeriod.totalCycles * activePeriod.workoutsPerCycle
    const progressPercent = Math.round((completedWorkouts / totalWorkouts) * 100)

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

    // Format response
    const response = {
      hasActivePeriod: true,
      period: {
        id: activePeriod.id,
        name: activePeriod.name,
        type: activePeriod.type,
        currentCycle: activePeriod.currentCycle,
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
        name: todayWorkout.name,
        workoutNum: todayWorkout.workoutNum,
        muscleGroups: todayWorkout.muscleGroups ? JSON.parse(todayWorkout.muscleGroups) : [],
        status: todayWorkout.status,
        completed: todayWorkout.completed,
        wellbeing: todayWorkout.wellbeing,
        wellbeingNote: todayWorkout.wellbeingNote,
        additionalActivities,
        exercises: todayWorkout.exercises.map(ex => ({
          id: ex.id,
          name: ex.name,
          muscleGroup: ex.muscleGroup,
          templateId: ex.templateId,
          repsScheme: ex.repsScheme,
          nextWeight: ex.nextWeight,
          template: ex.template ? {
            id: ex.template.id,
            name: ex.template.name,
            currentWeight: ex.template.currentWeight,
            nextWeight: ex.template.nextWeight,
            defaultScheme: ex.template.defaultScheme,
            techniqueNotes: ex.template.techniqueNotes
          } : null,
          sets: ex.sets.map(s => ({
            id: s.id,
            setNum: s.setNum,
            weight: s.weight,
            reps: s.reps,
            completed: s.completed
          }))
        }))
      } : null,
      nextWorkout: nextWorkout ? {
        id: nextWorkout.id,
        date: nextWorkout.date,
        name: nextWorkout.name,
        workoutNum: nextWorkout.workoutNum,
        muscleGroups: nextWorkout.muscleGroups ? JSON.parse(nextWorkout.muscleGroups) : []
      } : null,
      isToday: !!todayWorkout
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Fetch today workout error:', error)
    return NextResponse.json({ error: 'Failed to fetch today workout' }, { status: 500 })
  }
}

// POST - Save workout completion and update next weights
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      workoutId,
      completed,
      wellbeing,
      wellbeingNote,
      additionalActivities,
      exercises
    } = body

    if (!workoutId) {
      return NextResponse.json({ error: 'workoutId required' }, { status: 400 })
    }

    // Update workout
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
        if (ex.nextWeight !== undefined || ex.repsScheme) {
          await db.gymExercise.update({
            where: { id: ex.id },
            data: {
              nextWeight: ex.nextWeight,
              repsScheme: ex.repsScheme,
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

    return NextResponse.json({ success: true, workout })
  } catch (error) {
    console.error('Save workout completion error:', error)
    return NextResponse.json({ error: 'Failed to save workout' }, { status: 500 })
  }
}

// PATCH - Update specific exercise (for nextWeight updates)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { exerciseId, weight, repsScheme, nextWeight, updateTemplate } = body

    if (!exerciseId) {
      return NextResponse.json({ error: 'exerciseId required' }, { status: 400 })
    }

    // Update exercise
    const exercise = await db.gymExercise.update({
      where: { id: exerciseId },
      data: {
        repsScheme: repsScheme ?? undefined,
        nextWeight: nextWeight ?? undefined,
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
