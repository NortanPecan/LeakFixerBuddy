import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

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

// POST - Create new gym period
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, name, type, cycleLength, workoutsPerCycle, totalCycles, workoutDays } = body

    if (!userId || !name) {
      return NextResponse.json({ error: 'userId and name required' }, { status: 400 })
    }

    // Deactivate other periods for this user
    await db.gymPeriod.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false }
    })

    // Create the period
    const period = await db.gymPeriod.create({
      data: {
        userId,
        name,
        type: type || 'split',
        cycleLength: cycleLength || 7,
        workoutsPerCycle: workoutsPerCycle || 4,
        totalCycles: totalCycles || 8,
        currentCycle: 1,
        currentDay: 1,
        isActive: true
      }
    })

    // Create initial cycle
    await db.gymCycle.create({
      data: {
        periodId: period.id,
        cycleNum: 1
      }
    })

    // Generate workout schedule for all cycles
    const workouts = []
    const startDate = new Date()
    const cycleLen = cycleLength || 7
    const workoutsPerCyc = workoutsPerCycle || 4
    const totalCyc = totalCycles || 8
    
    for (let cycle = 1; cycle <= totalCyc; cycle++) {
      for (let workoutNum = 1; workoutNum <= workoutsPerCyc; workoutNum++) {
        const dayOffset = Math.floor((workoutNum - 1) * (cycleLen / workoutsPerCyc))
        const workoutDate = new Date(startDate)
        workoutDate.setDate(workoutDate.getDate() + ((cycle - 1) * cycleLen) + dayOffset)
        
        // Get workout config from wizard
        const dayConfig = workoutDays?.find((d: { workoutNum: number }) => d.workoutNum === workoutNum)
        const workoutName = dayConfig?.name || getWorkoutName(type || 'split', workoutNum)
        const muscleGroups = dayConfig?.muscleGroups || []
        
        workouts.push({
          periodId: period.id,
          date: workoutDate,
          dayOfWeek: workoutDate.getDay() || 7,
          workoutNum,
          name: workoutName,
          muscleGroups: JSON.stringify(muscleGroups),
          completed: false
        })
      }
    }

    await db.gymWorkout.createMany({ data: workouts })

    return NextResponse.json({ period })
  } catch (error) {
    console.error('Create gym period error:', error)
    return NextResponse.json({ error: 'Failed to create period' }, { status: 500 })
  }
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
