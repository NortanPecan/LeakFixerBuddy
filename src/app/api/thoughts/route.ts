import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const TTL_HOURS = 48

/**
 * GET /api/thoughts?userId=...
 * Returns non-expired fleeting thoughts for user
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  try {
    const thoughts = await db.fleetingThought.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ success: true, thoughts })
  } catch (error) {
    console.error('[Thoughts GET]', error)
    return NextResponse.json({ error: 'Failed to load thoughts' }, { status: 500 })
  }
}

/**
 * POST /api/thoughts
 * { userId, text, ttlHours? } — default 48h expiry
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, text, ttlHours = TTL_HOURS } = body

    if (!userId || !text?.trim()) {
      return NextResponse.json({ error: 'userId and text required' }, { status: 400 })
    }

    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000)
    const thought = await db.fleetingThought.create({
      data: { userId, text: text.trim(), expiresAt },
    })
    return NextResponse.json({ success: true, thought })
  } catch (error) {
    console.error('[Thoughts POST]', error)
    return NextResponse.json({ error: 'Failed to save thought' }, { status: 500 })
  }
}

/**
 * DELETE /api/thoughts?id=...
 */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  try {
    await db.fleetingThought.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Thoughts DELETE]', error)
    return NextResponse.json({ error: 'Failed to delete thought' }, { status: 500 })
  }
}
