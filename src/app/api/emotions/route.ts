import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const VALID_EMOTIONS = ['joy', 'calm', 'excited', 'anxiety', 'anger', 'sad', 'tired', 'focused']

/**
 * GET /api/emotions?userId=...&date=YYYY-MM-DD
 * Returns emotion logs for the given day (default today)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const dateParam = searchParams.get('date')

  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const date = dateParam ? new Date(dateParam) : new Date()
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)

  try {
    const logs = await db.emotionLog.findMany({
      where: { userId, createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ success: true, logs })
  } catch (error) {
    console.error('[Emotions GET]', error)
    return NextResponse.json({ error: 'Failed to load emotions' }, { status: 500 })
  }
}

/**
 * POST /api/emotions
 * { userId, emotion, intensity?, note? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, emotion, intensity = 3, note } = body

    if (!userId || !emotion) {
      return NextResponse.json({ error: 'userId and emotion required' }, { status: 400 })
    }
    if (!VALID_EMOTIONS.includes(emotion)) {
      return NextResponse.json({ error: 'Invalid emotion' }, { status: 400 })
    }
    if (intensity < 1 || intensity > 5) {
      return NextResponse.json({ error: 'intensity must be 1-5' }, { status: 400 })
    }

    const log = await db.emotionLog.create({
      data: { userId, emotion, intensity, note: note || null },
    })
    return NextResponse.json({ success: true, log })
  } catch (error) {
    console.error('[Emotions POST]', error)
    return NextResponse.json({ error: 'Failed to save emotion' }, { status: 500 })
  }
}

/**
 * DELETE /api/emotions?id=...
 */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  try {
    await db.emotionLog.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Emotions DELETE]', error)
    return NextResponse.json({ error: 'Failed to delete emotion' }, { status: 500 })
  }
}
