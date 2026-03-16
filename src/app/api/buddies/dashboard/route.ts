import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/buddies/dashboard?userId=xxx&buddyId=xxx
// Returns the buddy's shared stats (public data)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const buddyId = searchParams.get('buddyId')

    if (!userId || !buddyId) {
      return NextResponse.json({ error: 'userId and buddyId required' }, { status: 400 })
    }

    // Verify they are actually buddies
    const buddyRelation = await db.buddy.findFirst({
      where: {
        OR: [
          { userId, partnerId: buddyId, status: 'accepted' },
          { userId: buddyId, partnerId: userId, status: 'accepted' }
        ]
      }
    })

    if (!buddyRelation) {
      return NextResponse.json({ error: 'Not buddies' }, { status: 403 })
    }

    // Get buddy user info
    const buddyUser = await db.appUser.findUnique({
      where: { id: buddyId },
      select: {
        id: true,
        telegramFirstName: true,
        telegramLastName: true,
        telegramUsername: true,
        telegramPhotoUrl: true,
        firstName: true,
        lastName: true,
        photoUrl: true,
        username: true,
        day: true,
        streak: true,
        points: true,
      }
    })

    if (!buddyUser) {
      return NextResponse.json({ error: 'Buddy not found' }, { status: 404 })
    }

    const buddyName = buddyUser.telegramFirstName
      ? `${buddyUser.telegramFirstName}${buddyUser.telegramLastName ? ` ${buddyUser.telegramLastName}` : ''}`
      : buddyUser.firstName
        ? `${buddyUser.firstName}${buddyUser.lastName ? ` ${buddyUser.lastName}` : ''}`
        : buddyUser.telegramUsername || buddyUser.username || 'Бадди'

    // Active rituals count
    const activeRituals = await db.ritual.count({
      where: { userId: buddyId, status: 'active' }
    })

    // Today's ritual completions
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayCompletions = await db.ritualCompletion.count({
      where: {
        userId: buddyId,
        date: { gte: today, lt: tomorrow },
        completed: true
      }
    })

    // Active gym period
    const gymPeriod = await db.gymPeriod.findFirst({
      where: { userId: buddyId, isActive: true },
      select: { name: true, currentDay: true, totalCycles: true }
    })

    // Latest weight (from Measurement model)
    const latestWeight = await db.measurement.findFirst({
      where: { userId: buddyId, type: 'weight' },
      orderBy: { date: 'desc' },
      select: { value: true, date: true }
    })

    // This week's workout count (via period relation)
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)

    const buddyPeriods = await db.gymPeriod.findMany({
      where: { userId: buddyId },
      select: { id: true }
    })
    const periodIds = buddyPeriods.map(p => p.id)

    const weekWorkouts = periodIds.length > 0
      ? await db.gymWorkout.count({
          where: {
            periodId: { in: periodIds },
            status: 'completed',
            date: { gte: weekStart }
          }
        })
      : 0

    // Active challenges
    const activeChallenges = await db.challenge.count({
      where: { userId: buddyId, status: 'active' }
    })

    // Streak history (last 7 days)
    const last7Days: { date: string; completions: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      d.setHours(0, 0, 0, 0)
      const next = new Date(d)
      next.setDate(next.getDate() + 1)

      const completions = await db.ritualCompletion.count({
        where: {
          userId: buddyId,
          date: { gte: d, lt: next },
          completed: true
        }
      })
      last7Days.push({ date: d.toISOString().split('T')[0], completions })
    }

    return NextResponse.json({
      success: true,
      buddy: {
        id: buddyUser.id,
        name: buddyName,
        photoUrl: buddyUser.telegramPhotoUrl || buddyUser.photoUrl,
        day: buddyUser.day,
        streak: buddyUser.streak,
        points: buddyUser.points,
      },
      stats: {
        activeRituals,
        todayCompletions,
        weekWorkouts,
        activeChallenges,
        gymPeriod: gymPeriod ? `${gymPeriod.name} (день ${gymPeriod.currentDay})` : null,
        latestWeight: latestWeight ? {
          weight: latestWeight.value,
          date: latestWeight.date
        } : null,
        last7Days
      }
    })
  } catch (error) {
    console.error('Buddy dashboard error:', error)
    return NextResponse.json({ error: 'Failed to load buddy dashboard' }, { status: 500 })
  }
}
