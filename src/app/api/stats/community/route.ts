import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSelf } from '@/lib/server-auth'

// GET /api/stats/community?userId=xxx
// Returns community percentile stats for the user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }
    await requireSelf(request, userId)

    const user = await db.appUser.findUnique({
      where: { id: userId },
      select: { streak: true, points: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Count users with streak >= user's streak
    const [totalUsers, usersWithHigherStreak, usersWithHigherPoints] = await Promise.all([
      db.appUser.count(),
      db.appUser.count({ where: { streak: { gte: user.streak } } }),
      db.appUser.count({ where: { points: { gte: user.points } } }),
    ])

    if (totalUsers === 0) {
      return NextResponse.json({ success: true, streakPercentile: 100, pointsPercentile: 100, totalUsers: 0 })
    }

    // Percentile = (users with lower value / total) * 100
    const streakPercentile = Math.round(((totalUsers - usersWithHigherStreak) / totalUsers) * 100)
    const pointsPercentile = Math.round(((totalUsers - usersWithHigherPoints) / totalUsers) * 100)

    return NextResponse.json({
      success: true,
      streak: user.streak,
      points: user.points,
      streakPercentile,
      pointsPercentile,
      totalUsers
    })
  } catch (error) {
    console.error('Community stats error:', error)
    return NextResponse.json({ error: 'Failed to get community stats' }, { status: 500 })
  }
}
