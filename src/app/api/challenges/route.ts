import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { calculateStreak, type CompletionEntry } from '@/lib/streak-utils'

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

      // Calculate currentStreak: count consecutive days from today backwards
      currentStreak = 0
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      for (let i = 0; i < expectedDays; i++) {
        const checkDate = new Date(today)
        checkDate.setDate(checkDate.getDate() - i)
        const dateStr = checkDate.toISOString().split('T')[0]
        
        if (completedDaysSet.has(dateStr)) {
          currentStreak++
        } else if (checkDate >= startDate) {
          // Only break if the date is within the challenge period
          break
        }
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
  } else if (challenge.type === 'tracker') {
    const metric = (config.metric as string) || ''
    const target = (config.target as number) || 1
    const startDate = new Date(challenge.startDate)
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + challenge.duration)
    endDate.setHours(23, 59, 59, 999)
    const today = new Date()
    const effectiveEnd = today < endDate ? today : endDate

    if (metric === 'water_streak') {
      const fds = await db.fitnessDaily.findMany({
        where: { userId, date: { gte: startDate, lte: effectiveEnd } },
        select: { water: true, waterTarget: true },
      })
      const daysMetTarget = fds.filter(fd => (fd.water ?? 0) >= (fd.waterTarget ?? 2000)).length
      daysCompleted = daysMetTarget
      progress = Math.min(100, Math.round((daysMetTarget / target) * 100))
    } else if (metric === 'gym_count') {
      const count = await db.gymWorkout.count({
        where: { period: { userId }, status: 'completed', date: { gte: startDate, lte: effectiveEnd } },
      })
      daysCompleted = count
      progress = Math.min(100, Math.round((count / target) * 100))
    } else if (metric === 'ritual_rate') {
      const rituals = await db.ritual.findMany({ where: { userId, status: 'active' }, select: { id: true } })
      const ritualIds = rituals.map(r => r.id)
      if (ritualIds.length > 0) {
        const completions = await db.ritualCompletion.findMany({
          where: { ritualId: { in: ritualIds }, date: { gte: startDate, lte: effectiveEnd }, completed: true },
        })
        const daysWithCompletions = new Set(completions.map(c => c.date.toISOString().split('T')[0])).size
        daysCompleted = daysWithCompletions
        progress = Math.min(100, Math.round((daysWithCompletions / target) * 100))
      }
    } else if (metric === 'no_food_bad') {
      const totalDays = Math.max(1, Math.ceil((effectiveEnd.getTime() - startDate.getTime()) / 86400000))
      const badDays = await db.foodEntry.findMany({
        where: { userId, quality: 'bad', date: { gte: startDate, lte: effectiveEnd } },
        select: { date: true },
      })
      const badDaySet = new Set(badDays.map(f => new Date(f.date).toISOString().split('T')[0]))
      daysCompleted = totalDays - badDaySet.size
      progress = Math.min(100, Math.round((daysCompleted / target) * 100))
    } else if (metric === 'sleep_avg') {
      const states = await db.dailyState.findMany({
        where: { userId, date: { gte: startDate, lte: effectiveEnd }, sleepHours: { not: null } },
        select: { sleepHours: true },
      })
      if (states.length > 0) {
        const avg = states.reduce((s, d) => s + (d.sleepHours ?? 0), 0) / states.length
        daysCompleted = Math.round(avg * 10) / 10
        progress = Math.min(100, Math.round((avg / target) * 100))
      }
    } else if (metric === 'mood_avg') {
      const states = await db.dailyState.findMany({
        where: { userId, date: { gte: startDate, lte: effectiveEnd }, mood: { not: null } },
        select: { mood: true },
      })
      if (states.length > 0) {
        const avg = states.reduce((s, d) => s + (d.mood ?? 0), 0) / states.length
        daysCompleted = Math.round(avg * 10) / 10
        progress = Math.min(100, Math.round((avg / target) * 100))
      }
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
      
      // Calculate currentStreak: count consecutive days from today backwards
      currentStreak = 0
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      for (let i = 0; i < periodDays; i++) {
        const checkDate = new Date(today)
        checkDate.setDate(checkDate.getDate() - i)
        const dateStr = checkDate.toISOString().split('T')[0]
        
        if (completedDaysSet.has(dateStr)) {
          currentStreak++
        } else if (checkDate >= startDate) {
          break
        }
      }
    }
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

  // When transitioning to completed: award achievement + send TG notification
  if (newStatus === 'completed' && challenge.status === 'active') {
    // CHALLENGE_FIRST achievement
    try {
      await db.achievement.create({
        data: {
          userId: challenge.userId,
          code: 'CHALLENGE_FIRST',
          metadata: JSON.stringify({ challengeId: challenge.id, challengeName: challenge.name }),
        },
      })
    } catch { /* already exists — ignore */ }

    // TG congratulation
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN
      if (botToken) {
        const user = await db.user.findUnique({
          where: { id: challenge.userId },
          select: { telegramId: true },
        })
        if (user?.telegramId) {
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: user.telegramId,
              text: `🏆 <b>Челлендж завершён!</b>\n\n<b>${challenge.name}</b>\n\n🎉 Отличная работа! Ты выполнил поставленную цель.`,
              parse_mode: 'HTML',
            }),
          })
        }
      }
    } catch { /* non-critical */ }
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

      // Tracker history: last 7 days per metric
      let trackerDays: Array<{ date: string; value: number | null; met: boolean }> = []
      if (challengeWithProgress.type === 'tracker') {
        try {
          const tcfg = JSON.parse(challenge.config || '{}') as Record<string, unknown>
          const metric = tcfg.metric as string
          const target = (tcfg.target as number) || 1
          const uid = challenge.userId

          for (let i = 6; i >= 0; i--) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            d.setHours(0, 0, 0, 0)
            const dEnd = new Date(d)
            dEnd.setHours(23, 59, 59, 999)
            const dateStr = d.toISOString().split('T')[0]

            let value: number | null = null
            let met = false

            if (metric === 'water_streak') {
              const fd = await db.fitnessDaily.findFirst({ where: { userId: uid, date: d } })
              value = fd?.water ?? null
              met = fd ? (fd.water ?? 0) >= (fd.waterTarget ?? 2000) : false
            } else if (metric === 'gym_count') {
              const cnt = await db.gymWorkout.count({
                where: { period: { userId: uid }, status: 'completed', date: { gte: d, lte: dEnd } },
              })
              value = cnt
              met = cnt > 0
            } else if (metric === 'ritual_rate') {
              const rits = await db.ritual.findMany({ where: { userId: uid, status: 'active' }, select: { id: true } })
              if (rits.length > 0) {
                const comps = await db.ritualCompletion.findMany({
                  where: { ritualId: { in: rits.map(r => r.id) }, date: d, completed: true },
                })
                value = comps.length
                met = comps.length > 0
              }
            } else if (metric === 'no_food_bad') {
              const badCnt = await db.foodEntry.count({
                where: { userId: uid, quality: 'bad', date: { gte: d, lte: dEnd } },
              })
              value = badCnt
              met = badCnt === 0
            } else if (metric === 'sleep_avg') {
              const st = await db.dailyState.findFirst({ where: { userId: uid, date: d } })
              value = st?.sleepHours ?? null
              met = (st?.sleepHours ?? 0) >= target
            } else if (metric === 'mood_avg') {
              const st = await db.dailyState.findFirst({ where: { userId: uid, date: d } })
              value = st?.mood ?? null
              met = (st?.mood ?? 0) >= target
            }

            trackerDays.push({ date: dateStr, value, met })
          }
        } catch { /* ignore */ }
      }

      return NextResponse.json({
        success: true,
        challenge: {
          ...challengeWithProgress,
          linkedRituals,
          linkedSkills,
          linkedTraits,
          trackerDays,
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
      userId, name, title, description, type, category, zone, directionId, chainId, 
      config, startDate, duration, endDate, status 
    } = body

    if (!userId || !name) {
      return NextResponse.json({ error: 'userId and name are required' }, { status: 400 })
    }

    const activeCount = await db.challenge.count({ where: { userId, status: 'active' } })
    if (activeCount >= 3) {
      return NextResponse.json({ error: 'Максимум 3 активных челленджа', code: 'LIMIT_REACHED' }, { status: 400 })
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
        title,
        description,
        type: type || 'custom',
        category: category || 'general',
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

// PATCH /api/challenges - Update challenge or manually mark a day
// Special: { id, markDay: true } → increment ChallengeProgress.daysCompleted by 1
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, title, description, category, directionId, config, status, progress, startDate, endDate, markDay } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    // Manual day mark — used for custom challenges without ritual linking
    if (markDay) {
      const challenge = await db.challenge.findUnique({ where: { id } })
      if (!challenge) return NextResponse.json({ error: 'Not found' }, { status: 404 })

      // Dedup: only one mark per calendar day
      const todayStr = new Date().toISOString().split('T')[0]
      const existing = await db.challengeProgress.findFirst({ where: { challengeId: id } })
      if (existing) {
        const lastChecked = existing.lastCheckedAt.toISOString().split('T')[0]
        if (lastChecked === todayStr) {
          return NextResponse.json({ success: true, challenge, daysCompleted: existing.daysCompleted, alreadyMarked: true })
        }
        await db.challengeProgress.update({
          where: { id: existing.id },
          data: { daysCompleted: { increment: 1 }, currentStreak: { increment: 1 }, lastCheckedAt: new Date() },
        })
      } else {
        await db.challengeProgress.create({ data: { challengeId: id, daysCompleted: 1, currentStreak: 1 } })
      }
      const daysCompleted = existing ? existing.daysCompleted + 1 : 1
      const newProgress = Math.min(100, Math.round((daysCompleted / challenge.duration) * 100))
      const newStatus   = newProgress >= 100 ? 'completed' : challenge.status
      const updated = await db.challenge.update({
        where: { id },
        data: { progress: newProgress, status: newStatus },
      })

      // When completing: award CHALLENGE_FIRST + TG notification (same as calculateChallengeProgress)
      if (newStatus === 'completed' && challenge.status === 'active') {
        try {
          await db.achievement.create({
            data: {
              userId: challenge.userId,
              code: 'CHALLENGE_FIRST',
              metadata: JSON.stringify({ challengeId: challenge.id, challengeName: challenge.name }),
            },
          })
        } catch { /* already exists */ }
        try {
          const botToken = process.env.TELEGRAM_BOT_TOKEN
          if (botToken) {
            const tgUser = await db.user.findUnique({ where: { id: challenge.userId }, select: { telegramId: true } })
            if (tgUser?.telegramId) {
              await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: tgUser.telegramId,
                  text: `🏆 <b>Челлендж завершён!</b>\n\n<b>${challenge.name}</b>\n\n🎉 Отличная работа! Ты выполнил поставленную цель.`,
                  parse_mode: 'HTML',
                }),
              })
            }
          }
        } catch { /* non-critical */ }
      }

      return NextResponse.json({ success: true, challenge: updated, daysCompleted })
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (category !== undefined) updateData.category = category
    if (directionId !== undefined) updateData.directionId = directionId || null
    if (config !== undefined) updateData.config = typeof config === 'object' ? JSON.stringify(config) : config
    if (status !== undefined) updateData.status = status
    if (progress !== undefined) updateData.progress = progress
    if (startDate !== undefined) updateData.startDate = new Date(startDate)
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null

    const challenge = await db.challenge.update({
      where: { id },
      data: updateData,
      include: { direction: { select: { id: true, title: true, color: true } } },
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
