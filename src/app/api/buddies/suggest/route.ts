import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/buddies/suggest?userId=...
 *
 * Smart buddy matching: finds users with similar activity patterns and progress level.
 * Scoring algorithm:
 * 1. Same day range (± 7 days) → +3 points
 * 2. Similar streak (within 30%) → +2 points
 * 3. Has rituals/habits/gym data → +1 point each
 * 4. Already has no active buddy → preferred
 *
 * Returns top 5 candidates with match scores.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  try {
    // Get current user's profile
    const currentUser = await db.appUser.findUnique({
      where: { id: userId },
      select: { id: true, day: true, streak: true },
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get all existing buddy relationships for current user
    const existingBuddies = await db.buddy.findMany({
      where: {
        OR: [
          { userId },
          { partnerId: userId },
        ],
      },
      select: { userId: true, partnerId: true, status: true },
    })

    const excludeIds = new Set<string>([userId])
    existingBuddies.forEach(b => {
      if (b.status !== 'rejected') {
        excludeIds.add(b.userId === userId ? b.partnerId : b.userId)
      }
    })

    // Get all other users
    const candidates = await db.appUser.findMany({
      where: {
        id: { notIn: Array.from(excludeIds) },
      },
      select: {
        id: true,
        day: true,
        streak: true,
        telegramFirstName: true,
        telegramLastName: true,
        telegramUsername: true,
        telegramPhotoUrl: true,
        firstName: true,
        lastName: true,
        username: true,
        photoUrl: true,
      },
      take: 100,
    })

    // Score each candidate
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    // Get activity counts for all candidates in last 7 days
    const candidateIds = candidates.map(c => c.id)

    const [ritualActivity, gymActivity, habitActivity] = await Promise.all([
      db.ritualCompletion.groupBy({
        by: ['userId'],
        where: {
          userId: { in: candidateIds },
          date: { gte: sevenDaysAgo },
          completed: true,
        },
        _count: { id: true },
      }),
      db.gymPeriod.findMany({
        where: { userId: { in: candidateIds } },
        select: { userId: true },
      }),
      db.habitLog.groupBy({
        by: ['userId'],
        where: {
          userId: { in: candidateIds },
          date: { gte: sevenDaysAgo },
        },
        _count: { id: true },
      }),
    ])

    // Also check current user's activity to find similar pattern
    const [myRituals, myGym, myHabits] = await Promise.all([
      db.ritualCompletion.count({
        where: { userId, date: { gte: sevenDaysAgo }, completed: true },
      }),
      db.gymPeriod.count({ where: { userId } }),
      db.habitLog.count({ where: { userId, date: { gte: sevenDaysAgo } } }),
    ])

    const ritualMap = new Map(ritualActivity.map(r => [r.userId, r._count.id]))
    const gymMap = new Set(gymActivity.map(g => g.userId))
    const habitMap = new Map(habitActivity.map(h => [h.userId, h._count.id]))

    // Score and rank
    const scored = candidates
      .map(candidate => {
        let score = 0
        const reasons: string[] = []

        // Day range match (± 7 days)
        const dayDiff = Math.abs((candidate.day || 1) - (currentUser.day || 1))
        if (dayDiff <= 7) {
          score += 3
          reasons.push(`День ${candidate.day || 1} (близко к вашему)`)
        } else if (dayDiff <= 14) {
          score += 1
        }

        // Streak similarity (within 30%)
        const myStreak = currentUser.streak || 0
        const theirStreak = candidate.streak || 0
        if (myStreak > 0 && theirStreak > 0) {
          const ratio = Math.min(myStreak, theirStreak) / Math.max(myStreak, theirStreak)
          if (ratio >= 0.7) {
            score += 2
            reasons.push(`Стрик ${theirStreak} дн.`)
          } else if (ratio >= 0.4) {
            score += 1
          }
        }

        // Activity pattern similarity
        const hasRituals = (ritualMap.get(candidate.id) || 0) > 0
        const hasGym = gymMap.has(candidate.id)
        const hasHabits = (habitMap.get(candidate.id) || 0) > 0

        if (myRituals > 0 && hasRituals) {
          score += 1
          reasons.push('Ритуалы')
        }
        if (myGym > 0 && hasGym) {
          score += 1
          reasons.push('Тренировки')
        }
        if (myHabits > 0 && hasHabits) {
          score += 1
          reasons.push('Привычки')
        }

        // Name
        const name = candidate.telegramFirstName
          ? `${candidate.telegramFirstName}${candidate.telegramLastName ? ` ${candidate.telegramLastName}` : ''}`
          : candidate.firstName
            ? `${candidate.firstName}${candidate.lastName ? ` ${candidate.lastName}` : ''}`
            : candidate.telegramUsername || candidate.username || 'Пользователь'

        return {
          id: candidate.id,
          name,
          username: candidate.telegramUsername || candidate.username,
          photoUrl: candidate.telegramPhotoUrl || candidate.photoUrl,
          day: candidate.day || 1,
          streak: candidate.streak || 0,
          score,
          reasons: reasons.slice(0, 3),
        }
      })
      .filter(c => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)

    return NextResponse.json({
      suggestions: scored,
      currentUserDay: currentUser.day,
    })
  } catch (error) {
    console.error('[Buddy Suggest] Error:', error)
    return NextResponse.json({ error: 'Failed to get suggestions' }, { status: 500 })
  }
}

// Also check users who haven't been active recently (30 days)
// to avoid suggesting people who left the app
