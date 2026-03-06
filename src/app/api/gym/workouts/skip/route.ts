import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST - Skip workout and optionally shift future workouts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { workoutId, periodId, shiftSchedule } = body

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

    // Get the period to access daySchedule
    const period = await db.gymPeriod.findUnique({
      where: { id: periodId }
    })

    if (!period) {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 })
    }

    const workoutDate = new Date(workout.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Mark this workout as skipped (delete it or mark as skipped)
    // For now, we'll delete it since the shift will create a replacement on the last day
    await db.gymWorkout.delete({
      where: { id: workoutId }
    })

    if (shiftSchedule) {
      // Get all future workouts in this period (excluding the deleted one)
      const futureWorkouts = await db.gymWorkout.findMany({
        where: {
          periodId,
          date: { gt: workoutDate },
          completed: false
        },
        orderBy: { date: 'asc' }
      })

      // Shift each workout back by 1 day (to fill the gap)
      const shiftedWorkouts: { id: string; oldDate: Date; newDate: Date }[] = []
      
      for (const w of futureWorkouts) {
        const oldDate = new Date(w.date)
        const newDate = new Date(oldDate)
        newDate.setDate(newDate.getDate() - 1)
        
        await db.gymWorkout.update({
          where: { id: w.id },
          data: { date: newDate }
        })
        
        shiftedWorkouts.push({ id: w.id, oldDate, newDate })
      }

      // Create a rest day at the end of the cycle or a new workout
      // Based on the daySchedule, determine what should be on the last day
      const totalDays = period.totalCycles * period.cycleLength
      const startDate = new Date(period.startDate)
      const lastDayDate = new Date(startDate)
      lastDayDate.setDate(lastDayDate.getDate() + totalDays - 1)

      // Check if there's already a workout on the last day
      const existingLastWorkout = await db.gymWorkout.findFirst({
        where: {
          periodId,
          date: lastDayDate
        }
      })

      // The last day now needs a workout based on schedule
      // Find what should be there according to daySchedule
      if (period.daySchedule) {
        const daySchedule = JSON.parse(period.daySchedule)
        const lastDayInCycle = (totalDays - 1) % period.cycleLength
        const lastScheduleItem = daySchedule.find((item: { dayNum: number }) => item.dayNum - 1 === lastDayInCycle)
        
        if (lastScheduleItem?.type === 'workout' && !existingLastWorkout) {
          // Create a workout for the last day
          await db.gymWorkout.create({
            data: {
              periodId,
              date: lastDayDate,
              dayOfWeek: lastDayDate.getDay() || 7,
              workoutNum: lastScheduleItem.workoutNum || 1,
              name: lastScheduleItem.name || `Тренировка ${lastScheduleItem.workoutNum}`,
              muscleGroups: JSON.stringify(lastScheduleItem.muscleGroups || []),
              completed: false
            }
          })
        }
      }

      return NextResponse.json({ 
        success: true, 
        skippedWorkoutId: workoutId,
        shiftedWorkouts,
        message: 'Тренировка пропущена, расписание сдвинуто'
      })
    }

    return NextResponse.json({ 
      success: true, 
      skippedWorkoutId: workoutId,
      message: 'Тренировка пропущена'
    })
  } catch (error) {
    console.error('Skip workout error:', error)
    return NextResponse.json({ error: 'Failed to skip workout' }, { status: 500 })
  }
}
