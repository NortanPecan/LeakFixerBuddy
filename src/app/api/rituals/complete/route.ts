import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { normalizeToDate, parseDateKey, formatDateKey } from '@/lib/date-utils'
import { calculateStreak, type CompletionEntry } from '@/lib/streak-utils'

// POST - Mark ritual as complete/incomplete for a date
// Body: { ritualId, userId, date?: string, completed: boolean, note?: string, mood?: string }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ritualId, userId, date, completed = true, note, mood } = body

    if (!ritualId || !userId) {
      return NextResponse.json({ error: 'ritualId and userId required' }, { status: 400 })
    }

    // Get the ritual to check attributes
    const ritual = await db.ritual.findUnique({
      where: { id: ritualId }
    })

    if (!ritual) {
      return NextResponse.json({ error: 'Ritual not found' }, { status: 404 })
    }

    // Parse date or use today - normalize to start of day
    const targetDate = date ? parseDateKey(date) : normalizeToDate(new Date())

    // Upsert completion using unique constraint
    const completion = await db.ritualCompletion.upsert({
      where: {
        ritualId_date: {
          ritualId,
          date: targetDate
        }
      },
      update: {
        completed,
        note,
        mood
      },
      create: {
        ritualId,
        userId,
        date: targetDate,
        completed,
        note,
        mood
      }
    })

    // Update user attributes if completed
    if (completed && ritual.attributes) {
      const attributes = JSON.parse(ritual.attributes as string) as string[]
      for (const attr of attributes) {
        await db.userAttribute.upsert({
          where: {
            userId_key: {
              userId,
              key: attr
            }
          },
          update: {
            points: { increment: 10 }
          },
          create: {
            userId,
            key: attr,
            points: 10,
            level: 1
          }
        })
      }

      // Update level if points threshold reached
      const attrRecords = await db.userAttribute.findMany({
        where: { userId }
      })
      
      for (const attrRecord of attrRecords) {
        const newLevel = Math.floor(attrRecord.points / 100) + 1
        if (newLevel > attrRecord.level) {
          await db.userAttribute.update({
            where: { id: attrRecord.id },
            data: { level: newLevel }
          })
        }
      }
    }

    // Check achievements
    if (completed) {
      await checkAchievements(userId, ritualId)
    }

    // Auto-increment ChallengeProgress for active challenges linked to this ritual
    if (completed) {
      await incrementLinkedChallenges(userId, ritualId).catch(() => {/* non-critical */})
    }

    return NextResponse.json({
      success: true,
      completion: {
        ...completion,
        date: formatDateKey(completion.date)
      }
    })
  } catch (error) {
    console.error('Complete ritual error:', error)
    return NextResponse.json({ error: 'Failed to complete ritual' }, { status: 500 })
  }
}

// GET - Get completions for a ritual
// /api/rituals/complete?ritualId=xxx&days=30
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ritualId = searchParams.get('ritualId')
    const userId = searchParams.get('userId')
    const days = parseInt(searchParams.get('days') || '30')

    if (!ritualId) {
      return NextResponse.json({ error: 'ritualId required' }, { status: 400 })
    }

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    const completions = await db.ritualCompletion.findMany({
      where: {
        ritualId,
        date: { gte: startDate }
      },
      orderBy: { date: 'asc' }
    })

    // Get ritual to check scheduled days
    const ritual = await db.ritual.findUnique({
      where: { id: ritualId }
    })

    // Calculate streak using the utility
    let streak = 0
    let maxStreak = 0
    let completionRate = 0
    let scheduledDays = days
    let completedScheduledDays = 0

    if (ritual) {
      const ritualDays = JSON.parse(ritual.days as string) as number[]

      // Convert completions to the format expected by streak utils
      const completionEntries: CompletionEntry[] = completions.map(c => ({
        date: c.date,
        completed: c.completed
      }))

      const streakResult = calculateStreak(completionEntries, ritualDays, days)
      streak = streakResult.streak
      maxStreak = streakResult.maxStreak
      completionRate = streakResult.completionRate
      scheduledDays = streakResult.scheduledDays
      completedScheduledDays = streakResult.completedScheduledDays
    }

    const stats = {
      streak,
      maxStreak,
      completedDays: completedScheduledDays,
      scheduledDays,
      totalDays: days,
      completionRate
    }

    return NextResponse.json({
      success: true,
      completions: completions.map(c => ({
        ...c,
        date: formatDateKey(c.date)
      })),
      stats
    })
  } catch (error) {
    console.error('Fetch completions error:', error)
    return NextResponse.json({ error: 'Failed to fetch completions' }, { status: 500 })
  }
}

// Auto-increment ChallengeProgress for challenges linked to this ritual
async function incrementLinkedChallenges(userId: string, ritualId: string) {
  const activeChallenges = await db.challenge.findMany({
    where: { userId, status: 'active', type: 'ritual' },
    select: { id: true, config: true, duration: true },
  })

  for (const ch of activeChallenges) {
    try {
      const config = JSON.parse(ch.config || '{}') as { selectedRitualIds?: string[]; linkedRitualIds?: string[] }
      const linked = config.selectedRitualIds ?? config.linkedRitualIds ?? []
      // Empty means track all rituals; non-empty means only specific ones
      if (linked.length > 0 && !linked.includes(ritualId)) continue

      // Upsert ChallengeProgress — at most one increment per calendar day
      const todayStr = new Date().toISOString().split('T')[0]
      const existing = await db.challengeProgress.findFirst({ where: { challengeId: ch.id } })
      if (existing) {
        const lastChecked = existing.lastCheckedAt.toISOString().split('T')[0]
        if (lastChecked === todayStr) continue // already counted today

        await db.challengeProgress.update({
          where: { id: existing.id },
          data: {
            daysCompleted: { increment: 1 },
            currentStreak: { increment: 1 },
            lastCheckedAt: new Date(),
          },
        })
        // Mark challenge completed if goal reached
        if (existing.daysCompleted + 1 >= ch.duration) {
          await db.challenge.update({ where: { id: ch.id }, data: { status: 'completed', progress: 100 } })
        }
      } else {
        await db.challengeProgress.create({
          data: { challengeId: ch.id, daysCompleted: 1, currentStreak: 1 },
        })
      }
    } catch {
      // Per-challenge errors are non-critical
    }
  }
}

// Check and award achievements
async function checkAchievements(userId: string, ritualId: string) {
  try {
    // Get total completions for this ritual
    const completions = await db.ritualCompletion.count({
      where: { ritualId, completed: true }
    })

    // Streak achievements
    const streakAchievements = [
      { code: 'RITUAL_STREAK_3', threshold: 3 },
      { code: 'RITUAL_STREAK_7', threshold: 7 },
      { code: 'RITUAL_STREAK_30', threshold: 30 },
    ]

    for (const achievement of streakAchievements) {
      if (completions >= achievement.threshold) {
        await db.achievement.upsert({
          where: { userId_code: { userId, code: achievement.code } },
          update: {},
          create: { userId, code: achievement.code }
        })
      }
    }
  } catch (error) {
    console.error('Check achievements error:', error)
  }
}
