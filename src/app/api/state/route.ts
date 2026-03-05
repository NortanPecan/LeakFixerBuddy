import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function getMoodStatus(mood: number): string {
  if (mood >= 9) return 'Пиковое состояние! 🚀'
  if (mood >= 7) return 'Хороший тон, есть ресурс'
  if (mood >= 5) return 'Нормально, можно лучше'
  if (mood >= 3) return 'Низкий ресурс, береги силы'
  return 'Кризис, нужна поддержка'
}

/**
 * Save or update daily state (mood, energy)
 * POST /api/state
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, date, mood, energy } = body

    if (!userId || !date) {
      return NextResponse.json({ error: 'userId and date required' }, { status: 400 })
    }

    const dateObj = new Date(date)

    // Upsert daily state
    const existing = await db.dailyState.findFirst({
      where: { userId, date: dateObj }
    })

    let state
    if (existing) {
      state = await db.dailyState.update({
        where: { id: existing.id },
        data: { mood, energy }
      })
    } else {
      state = await db.dailyState.create({
        data: { userId, date: dateObj, mood, energy }
      })
    }

    return NextResponse.json({
      success: true,
      state: {
        mood: state.mood,
        energy: state.energy,
        status: state.mood ? getMoodStatus(state.mood) : null
      }
    })
  } catch (error) {
    console.error('Save state error:', error)
    return NextResponse.json({ error: 'Failed to save state' }, { status: 500 })
  }
}

/**
 * Get daily state history
 * GET /api/state?userId=xxx&days=7
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const days = parseInt(searchParams.get('days') || '7')

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const states = await db.dailyState.findMany({
      where: {
        userId,
        date: { gte: startDate }
      },
      orderBy: { date: 'desc' }
    })

    return NextResponse.json({
      states: states.map(s => ({
        date: s.date,
        mood: s.mood,
        energy: s.energy,
        status: s.mood ? getMoodStatus(s.mood) : null
      }))
    })
  } catch (error) {
    console.error('Get state error:', error)
    return NextResponse.json({ error: 'Failed to get state' }, { status: 500 })
  }
}
