import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Helper to calculate progress for a challenge
async function calculateChallengeProgress(challenge: {
  id: string
  userId: string
  name: string
  description?: string | null
  type: string
  zone: string
  directionId?: string | null
  chainId?: string | null
  config: string
  duration: number
  progress: number
  startDate: Date
  endDate?: Date | null
  status: string
}, userId: string) {
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
    const selectedRitualIds = config.selectedRitualIds as string[] | undefined || []
    const expectedDays = challenge.duration || 30

    if (selectedRitualIds.length > 0) {
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
    } else {
      const startDate = new Date(challenge.startDate)
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + expectedDays)
      endDate.setHours(23, 59, 59, 999)

      const rituals = await db.ritual.findMany({
        where: { userId, status: 'active' },
        select: { id: true }
      })
      const ritualIds = rituals.map(r => r.id)

      const completions = await db.ritualCompletion.findMany({
        where: {
          ritualId: { in: ritualIds },
          date: { gte: startDate, lte: endDate }
        }
      })

      const completedDaysSet = new Set<string>()
      completions.forEach(c => {
        const dateStr = c.date.toISOString().split('T')[0]
        completedDaysSet.add(dateStr)
      })

      daysCompleted = completedDaysSet.size
      progress = Math.round((daysCompleted / expectedDays) * 100)
    }
  } else if (challenge.type === 'chain' && challenge.chainId) {
    const chain = await db.chain.findUnique({
      where: { id: challenge.chainId },
      include: { tasks: true }
    })

    if (chain) {
      const targetSteps = (config.targetSteps as number) || chain.tasks.length
      const completedSteps = chain.tasks.filter(t => t.status === 'done').length
      daysCompleted = completedSteps
      progress = Math.round((completedSteps / targetSteps) * 100)
    }
  } else if (challenge.type === 'custom') {
    const zone = (config.zone as string) || challenge.zone
    const targetCount = (config.targetCount as number) || 0
    const periodDays = (config.periodDays as number) || 30
    const actionType = (config.actionType as string) || 'actions'

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
      progress = targetCount > 0 ? Math.round((tasks.length / targetCount) * 100) : 0
    } else {
      const completedDaysSet = new Set<string>()
      tasks.forEach(t => {
        if (t.date) {
          const dateStr = new Date(t.date).toISOString().split('T')[0]
          completedDaysSet.add(dateStr)
        }
      })
      daysCompleted = completedDaysSet.size
      progress = targetCount > 0 ? Math.round((daysCompleted / targetCount) * 100) : 0
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
      data: { progress: progress ?? 0, status: newStatus }
    })
  }

  return {
    ...challenge,
    progress: progress ?? 0,
    progressPercentage: progress ?? 0,
    daysCompleted,
    currentStreak
  }
}

// GET /api/challenges?userId=xxx or /api/challenges?id=xxx
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const challengeId = searchParams.get('id')
  const status = searchParams.get('status')
  const directionId = searchParams.get('directionId')

  // Get single challenge by ID
  if (challengeId && !userId) {
    try {
      const challenge = await db.challenge.findUnique({
        where: { id: challengeId },
        include: {
          direction: true,
          progressDetails: true
        }
      })

      if (!challenge) {
        return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
      }

      const challengeWithProgress = await calculateChallengeProgress(challenge, challenge.userId)
      
      // Get linked entities from config
      let linkedRituals: unknown[] = []
      let linkedSkills: unknown[] = []
      let linkedTraits: unknown[] = []
      
      try {
        const config = JSON.parse(challenge.config || '{}')
        if (config.linkedRitualIds?.length) {
          linkedRituals = await db.ritual.findMany({
            where: { id: { in: config.linkedRitualIds } },
            select: { id: true, title: true, category: true }
          })
        }
        if (config.linkedSkillIds?.length) {
          linkedSkills = await db.skill.findMany({
            where: { id: { in: config.linkedSkillIds } },
            select: { id: true, name: true, level: true }
          })
        }
        if (config.linkedTraitIds?.length) {
          linkedTraits = await db.trait.findMany({
            where: { id: { in: config.linkedTraitIds } },
            select: { id: true, name: true, score: true }
          })
        }
      } catch {
        // ignore parse errors
      }

      return NextResponse.json({ 
        success: true, 
        challenge: {
          ...challengeWithProgress,
          linkedRituals,
          linkedSkills,
          linkedTraits
        }
      })
    } catch (error) {
      console.error('Error fetching challenge:', error)
      return NextResponse.json({ error: 'Failed to fetch challenge' }, { status: 500 })
    }
  }

  if (!userId) {
    return NextResponse.json({ error: 'userId or id is required' }, { status: 400 })
  }

  try {
    const where: Record<string, unknown> = { userId }
    if (status) where.status = status
    if (directionId) where.directionId = directionId

    const challenges = await db.challenge.findMany({
      where,
      orderBy: [
        { status: 'asc' },
        { createdAt: 'desc' }
      ],
      include: {
        direction: { select: { id: true, title: true, color: true } }
      }
    })

    // Calculate progress for each challenge
    const challengesWithProgress = await Promise.all(
      challenges.map(c => calculateChallengeProgress(c, userId))
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
    const { 
      userId, name, description, type, zone, directionId, chainId, 
      config, startDate, duration, endDate, status 
    } = body

    if (!userId || !name) {
      return NextResponse.json({ error: 'userId and name are required' }, { status: 400 })
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
        description,
        type: type || 'custom',
        zone: zone || 'general',
        directionId: directionId || null,
        chainId: chainId || null,
        config: typeof config === 'object' ? JSON.stringify(config) : (config || '{}'),
        startDate: start,
        duration: duration || 30,
        endDate: calculatedEndDate,
        status: status || 'active'
      },
      include: {
        direction: { select: { id: true, title: true, color: true } }
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
    const { id, name, description, directionId, config, status, progress, endDate } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (directionId !== undefined) updateData.directionId = directionId || null
    if (config !== undefined) updateData.config = typeof config === 'object' ? JSON.stringify(config) : config
    if (status !== undefined) updateData.status = status
    if (progress !== undefined) updateData.progress = progress
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null

    const challenge = await db.challenge.update({
      where: { id },
      data: updateData,
      include: {
        direction: { select: { id: true, title: true, color: true } }
      }
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
