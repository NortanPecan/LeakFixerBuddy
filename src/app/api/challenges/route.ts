import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/challenges?userId=xxx
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const status = searchParams.get('status')

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  try {
    const where: Record<string, unknown> = { userId }
    if (status) where.status = status

    const challenges = await db.challenge.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })

    // Calculate progress for each challenge
    const challengesWithProgress = await Promise.all(
      challenges.map(async (challenge) => {
        let progress = challenge.progress
        let daysCompleted = 0
        let currentStreak = 0
        
        // Parse config from JSON string
        let config: Record<string, unknown> = {}
        try {
          config = typeof challenge.config === 'string' 
            ? JSON.parse(challenge.config) 
            : (challenge.config as Record<string, unknown>)
        } catch {
          config = {}
        }

        if (challenge.type === 'ritual') {
          const selectedRitualIds = config.selectedRitualIds || []
          const expectedDays = challenge.duration || 30

          if (selectedRitualIds && selectedRitualIds.length > 0) {
            const startDate = new Date(challenge.startDate)
            const endDate = new Date(startDate)
            endDate.setDate(endDate.getDate() + expectedDays)
            endDate.setHours(23, 59, 59, 999)

            const completions = await db.ritualCompletion.findMany({
              where: {
                ritualId: { in: selectedRitualIds },
                date: { gte: startDate, lte: endDate }
              }
            })

            const completedDaysSet = new Set<string>()
            completions.forEach(c => {
              const dateStr = c.date.toISOString().split('T')[0]
              completedDaysSet.add(dateStr)
            })

            daysCompleted = completedDaysSet.size

            const sortedDays = Array.from(completedDaysSet).sort()
            currentStreak = 0
            let prevDate = ''
            
            for (const dateStr of sortedDays) {
              if (prevDate) {
                const diff = Math.floor(
                  (new Date(dateStr).getTime() - new Date(prevDate).getTime()) / (1000 * 60 * 60 * 24)
                )
                if (diff === 1) currentStreak++
                else currentStreak = 1
              }
              prevDate = dateStr
            }

            progress = Math.round((daysCompleted / expectedDays) * 100)
          }
        } else if (challenge.type === 'chain' && challenge.chainId) {
          const chain = await db.chain.findUnique({
            where: { id: challenge.chainId },
            include: { tasks: true }
          })

          if (chain) {
            const targetSteps = config.targetSteps || chain.tasks.length
            const completedSteps = chain.tasks.filter(t => t.status === 'done').length
            daysCompleted = completedSteps
            progress = Math.round((completedSteps / targetSteps) * 100)
          }
        } else if (challenge.type === 'custom') {
          const zone = config.zone
          const targetCount = config.targetCount || 0
          const periodDays = config.periodDays || 30
          const actionType = config.actionType || 'actions'

          const startDate = new Date(challenge.startDate)
          const endDate = new Date(startDate)
          endDate.setDate(endDate.getDate() + periodDays)
          endDate.setHours(23, 59, 59, 999)

          const tasks = await db.task.findMany({
            where: {
              userId,
              zone,
              status: 'done',
              date: { gte: startDate, lte: endDate }
            }
          })

          if (actionType === 'actions') {
            daysCompleted = tasks.length
            progress = Math.round((tasks.length / targetCount) * 100)
          } else {
            const completedDaysSet = new Set<string>()
            tasks.forEach(t => {
              if (t.date) {
                const dateStr = new Date(t.date).toISOString().split('T')[0]
                completedDaysSet.add(dateStr)
              }
            })
            daysCompleted = completedDaysSet.size
            progress = Math.round((daysCompleted / targetCount) * 100)
          }
          currentStreak = daysCompleted
        }

        let newStatus = challenge.status
        if (progress >= 100 && newStatus === 'active') newStatus = 'completed'

        const now = new Date()
        if (challenge.endDate && now > new Date(challenge.endDate) && newStatus === 'active') {
          newStatus = 'failed'
        }

        if (progress !== challenge.progress || newStatus !== challenge.status) {
          await db.challenge.update({
            where: { id: challenge.id },
            data: { progress, status: newStatus }
          })
        }

        return {
          ...challenge,
          progress,
          progressPercentage: progress,
          daysCompleted,
          currentStreak
        }
      })
    )

    return NextResponse.json({ success: true, challenges: challengesWithProgress })
  } catch (error) {
    console.error('Error fetching challenges:', error)
    return NextResponse.json({ error: 'Failed to fetch challenges' }, { status: 500 })
  }
}

// POST /api/challenges - Create challenge
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, name, type, zone, chainId, config, startDate, duration, endDate } = body

    if (!userId || !name || !type) {
      return NextResponse.json({ error: 'userId, name, and type are required' }, { status: 400 })
    }

    if (!['ritual', 'chain', 'custom'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    const start = startDate ? new Date(startDate) : new Date()
    let calculatedEndDate = endDate ? new Date(endDate) : null
    
    if (!calculatedEndDate && duration) {
      calculatedEndDate = new Date(start)
      calculatedEndDate.setDate(calculatedEndDate.getDate() + duration)
      calculatedEndDate.setHours(23, 59, 59, 999)
    }

    const challenge = await db.challenge.create({
      data: {
        userId,
        name,
        type,
        zone: zone || 'general',
        chainId,
        config: typeof config === 'object' ? JSON.stringify(config) : (config || '{}'),
        startDate: start,
        duration: duration || 30,
        endDate: calculatedEndDate,
        status: 'active'
      }
    })

    return NextResponse.json({ success: true, challenge })
  } catch (error) {
    console.error('Error creating challenge:', error)
    return NextResponse.json({ error: 'Failed to create challenge' }, { status: 500 })
  }
}

// PATCH /api/challenges - Update challenge
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const challenge = await db.challenge.update({
      where: { id },
      data
    })

    return NextResponse.json({ success: true, challenge })
  } catch (error) {
    console.error('Error updating challenge:', error)
    return NextResponse.json({ error: 'Failed to update challenge' }, { status: 500 })
  }
}

// DELETE /api/challenges?id=xxx
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  try {
    await db.challengeProgress.deleteMany({ where: { challengeId: id } })
    await db.challenge.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting challenge:', error)
    return NextResponse.json({ error: 'Failed to delete challenge' }, { status: 500 })
  }
}