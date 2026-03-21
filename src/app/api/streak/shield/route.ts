import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSelf } from '@/lib/server-auth'

const SHIELD_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function isShieldAvailable(streakShieldUsedAt: Date | null): boolean {
  if (!streakShieldUsedAt) return true
  return Date.now() - streakShieldUsedAt.getTime() > SHIELD_COOLDOWN_MS
}

/**
 * GET /api/streak/shield?userId=xxx
 * Check shield availability
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }
  await requireSelf(request, userId)

  try {
    const user = await db.appUser.findUnique({
      where: { id: userId },
      select: { streak: true, streakShieldUsedAt: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const available = isShieldAvailable(user.streakShieldUsedAt)
    const rechargesAt = user.streakShieldUsedAt
      ? new Date(user.streakShieldUsedAt.getTime() + SHIELD_COOLDOWN_MS).toISOString()
      : null

    return NextResponse.json({
      success: true,
      streak: user.streak,
      shieldAvailable: available,
      streakShieldUsedAt: user.streakShieldUsedAt?.toISOString() ?? null,
      rechargesAt,
    })
  } catch (error) {
    console.error('[Shield GET] Error:', error)
    return NextResponse.json({ error: 'Failed to check shield' }, { status: 500 })
  }
}

/**
 * POST /api/streak/shield
 * Manually activate streak shield
 * Body: { userId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }
    await requireSelf(request, userId)

    const user = await db.appUser.findUnique({
      where: { id: userId },
      select: { streak: true, streakShieldUsedAt: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!isShieldAvailable(user.streakShieldUsedAt)) {
      const rechargesAt = new Date(
        user.streakShieldUsedAt!.getTime() + SHIELD_COOLDOWN_MS
      ).toISOString()
      return NextResponse.json(
        { error: 'Shield is on cooldown', rechargesAt },
        { status: 409 }
      )
    }

    const updated = await db.appUser.update({
      where: { id: userId },
      data: { streakShieldUsedAt: new Date() },
      select: { streak: true, streakShieldUsedAt: true },
    })

    return NextResponse.json({
      success: true,
      streak: updated.streak,
      streakShieldUsedAt: updated.streakShieldUsedAt?.toISOString() ?? null,
    })
  } catch (error) {
    console.error('[Shield POST] Error:', error)
    return NextResponse.json({ error: 'Failed to activate shield' }, { status: 500 })
  }
}
