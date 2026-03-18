import { db } from '@/lib/db'

export type ChallengeInput = {
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
}

export async function calculateChallengeProgress(challenge: ChallengeInput, userId: string) {
  let progress = challenge.progress
  let daysCompleted = 0
  let currentStreak = 0

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
    try {
      await db.achievement.create({
        data: {
          userId: challenge.userId,
          code: 'CHALLENGE_FIRST',
          metadata: JSON.stringify({ challengeId: challenge.id, challengeName: challenge.name }),
        },
      })
    } catch { /* already exists — ignore */ }

    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN
      if (botToken) {
        const user = await db.appUser.findUnique({
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
