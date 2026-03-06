import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface DayScheduleItem {
  type: 'workout' | 'rest'
  dayNum: number
  workoutNum?: number
  name?: string
  muscleGroups?: string[]
}

// GET - Fetch gym periods for user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const periods = await db.gymPeriod.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { workouts: true }
        }
      }
    })

    return NextResponse.json({ periods })
  } catch (error) {
    console.error('Fetch gym periods error:', error)
    return NextResponse.json({ error: 'Failed to fetch periods' }, { status: 500 })
  }
}

// PATCH - Update period (daySchedule, etc.)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { periodId, daySchedule } = body

    if (!periodId) {
      return NextResponse.json({ error: 'periodId required' }, { status: 400 })
    }

    // Update the period's daySchedule
    const period = await db.gymPeriod.update({
      where: { id: periodId },
      data: {
        daySchedule: daySchedule ? JSON.stringify(daySchedule) : undefined,
        updatedAt: new Date()
      }
    })

    // If daySchedule changed, update future workouts accordingly
    if (daySchedule && Array.isArray(daySchedule)) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      // Get all future uncompleted workouts
      const futureWorkouts = await db.gymWorkout.findMany({
        where: {
          periodId,
          date: { gte: today },
          completed: false
        },
        orderBy: { date: 'asc' }
      })
      
      // Update workout names and muscle groups based on new schedule
      for (const workout of futureWorkouts) {
        // Calculate which day in cycle this workout falls on
        const startDate = new Date(period.startDate)
        const daysSinceStart = Math.floor((new Date(workout.date).getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        const dayInCycle = (daysSinceStart % period.cycleLength)
        
        // Find the schedule item for this day
        const scheduleItem = daySchedule.find((item: DayScheduleItem) => item.dayNum - 1 === dayInCycle)
        
        if (scheduleItem && scheduleItem.type === 'workout') {
          await db.gymWorkout.update({
            where: { id: workout.id },
            data: {
              name: scheduleItem.name || workout.name,
              muscleGroups: JSON.stringify(scheduleItem.muscleGroups || [])
            }
          })
        }
      }
    }

    return NextResponse.json({ success: true, period })
  } catch (error) {
    console.error('Update gym period error:', error)
    return NextResponse.json({ error: 'Failed to update period' }, { status: 500 })
  }
}

// POST - Create new gym period
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      userId, 
      name, 
      type, 
      cycleLength, 
      workoutsPerCycle, 
      totalCycles, 
      workoutDays,
      daySchedule: clientDaySchedule // Accept daySchedule from client
    } = body

    if (!userId || !name) {
      return NextResponse.json({ error: 'userId and name required' }, { status: 400 })
    }

    // Deactivate other periods for this user
    await db.gymPeriod.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false }
    })

    const cycleLen = cycleLength || 7
    const workoutsPerCyc = workoutsPerCycle || 4

    // Use client-provided daySchedule if available, otherwise generate
    let daySchedule: DayScheduleItem[]
    
    if (clientDaySchedule && Array.isArray(clientDaySchedule) && clientDaySchedule.length > 0) {
      // Use the schedule from client - preserve exact order
      daySchedule = clientDaySchedule.map((item: DayScheduleItem, idx: number) => ({
        ...item,
        dayNum: idx + 1 // Ensure dayNum matches position
      }))
    } else {
      // Fallback: generate day schedule (legacy behavior)
      daySchedule = generateDaySchedule(cycleLen, workoutsPerCyc, type, workoutDays)
    }

    // Create the period
    const period = await db.gymPeriod.create({
      data: {
        userId,
        name,
        type: type || 'split',
        cycleLength: cycleLen,
        workoutsPerCycle: workoutsPerCyc,
        totalCycles: totalCycles || 8,
        currentCycle: 1,
        currentDay: 1,
        isActive: true,
        daySchedule: JSON.stringify(daySchedule)
      }
    })

    // Create initial cycle
    await db.gymCycle.create({
      data: {
        periodId: period.id,
        cycleNum: 1
      }
    })

    // Generate workout schedule for all cycles based on daySchedule
    const workouts = []
    const startDate = new Date()
    const totalCyc = totalCycles || 8
    
    for (let cycle = 1; cycle <= totalCyc; cycle++) {
      // Calculate start date of this cycle
      const cycleStartDate = new Date(startDate)
      cycleStartDate.setDate(cycleStartDate.getDate() + ((cycle - 1) * cycleLen))
      
      // Create workouts based on day schedule - preserve order
      for (const dayItem of daySchedule) {
        if (dayItem.type === 'workout' && dayItem.workoutNum) {
          // Calculate workout date based on position in schedule (dayNum = position)
          const workoutDate = new Date(cycleStartDate)
          workoutDate.setDate(workoutDate.getDate() + (dayItem.dayNum - 1))
          
          workouts.push({
            periodId: period.id,
            date: workoutDate,
            dayOfWeek: workoutDate.getDay() || 7,
            workoutNum: dayItem.workoutNum,
            name: dayItem.name || `Тренировка ${dayItem.workoutNum}`,
            muscleGroups: JSON.stringify(dayItem.muscleGroups || []),
            completed: false
          })
        }
      }
    }

    await db.gymWorkout.createMany({ data: workouts })

    return NextResponse.json({ period, daySchedule })
  } catch (error) {
    console.error('Create gym period error:', error)
    return NextResponse.json({ error: 'Failed to create period' }, { status: 500 })
  }
}

// Generate day schedule (legacy fallback)
function generateDaySchedule(
  cycleLen: number, 
  workoutsPerCyc: number, 
  type: string, 
  workoutDays: { workoutNum: number; name: string; muscleGroups: string[] }[] | undefined
): DayScheduleItem[] {
  const daySchedule: DayScheduleItem[] = []
  
  // Distribute workout days and rest days
  const workoutInterval = cycleLen / workoutsPerCyc
  
  for (let dayNum = 1; dayNum <= cycleLen; dayNum++) {
    const position = (dayNum - 1) * workoutsPerCyc / cycleLen
    const nextPosition = dayNum * workoutsPerCyc / cycleLen
    const crossesWorkout = Math.floor(position) !== Math.floor(nextPosition) || 
      (Math.floor(position) < workoutsPerCyc && position >= Math.floor(position))
    
    if (crossesWorkout && daySchedule.filter(d => d.type === 'workout').length < workoutsPerCyc) {
      const workoutNum = daySchedule.filter(d => d.type === 'workout').length + 1
      const dayConfig = workoutDays?.find(d => d.workoutNum === workoutNum)
      
      daySchedule.push({
        type: 'workout',
        dayNum,
        workoutNum,
        name: dayConfig?.name || getWorkoutName(type || 'split', workoutNum),
        muscleGroups: dayConfig?.muscleGroups || []
      })
    } else {
      daySchedule.push({
        type: 'rest',
        dayNum
      })
    }
  }
  
  // Ensure we have exactly workoutsPerCyc workouts
  const currentWorkouts = daySchedule.filter(d => d.type === 'workout').length
  if (currentWorkouts < workoutsPerCyc) {
    for (let i = 0; i < daySchedule.length && currentWorkouts + i < workoutsPerCyc; i++) {
      if (daySchedule[i].type === 'rest') {
        const workoutNum = daySchedule.filter(d => d.type === 'workout').length + 1
        const dayConfig = workoutDays?.find(d => d.workoutNum === workoutNum)
        daySchedule[i] = {
          type: 'workout',
          dayNum: i + 1,
          workoutNum,
          name: dayConfig?.name || getWorkoutName(type || 'split', workoutNum),
          muscleGroups: dayConfig?.muscleGroups || []
        }
      }
    }
  }

  return daySchedule
}

function getWorkoutName(type: string, workoutNum: number): string {
  if (type === 'split') {
    const names = ['Грудь + Трицепс', 'Спина + Бицепс', 'Ноги', 'Плечи + Пресс']
    return names[(workoutNum - 1) % names.length] || `Тренировка ${workoutNum}`
  }
  if (type === 'fullbody') {
    return `Фулбоди ${workoutNum}`
  }
  if (type === 'ppl') {
    const names = ['Push (Толкай)', 'Pull (Тяни)', 'Legs (Ноги)']
    return names[(workoutNum - 1) % names.length] || `Тренировка ${workoutNum}`
  }
  if (type === 'upper_lower') {
    const names = ['Верх', 'Низ']
    return names[(workoutNum - 1) % names.length] || `Тренировка ${workoutNum}`
  }
  return `Тренировка ${workoutNum}`
}
