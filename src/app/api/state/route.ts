import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { normalizeToDate, parseDateKey, formatDateKey, getDaysAgo } from '@/lib/date-utils'

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
 * Body: { userId, date?: string, mood?: number, energy?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, date, mood, energy } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const targetDate = date ? parseDateKey(date) : normalizeToDate(new Date())

    // Use upsert to ensure atomic operation with unique constraint
    const state = await db.dailyState.upsert({
      where: {
        userId_date: {
          userId,
          date: targetDate
        }
      },
      update: {
        ...(mood !== undefined && { mood }),
        ...(energy !== undefined && { energy })
      },
      create: {
        userId,
        date: targetDate,
        mood: mood ?? 5,
        energy: energy ?? 5
      }
    })

    return NextResponse.json({
      success: true,
      date: formatDateKey(targetDate),
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
 * Get daily state for a specific date or history
 * GET /api/state?userId=xxx&date=YYYY-MM-DD - Get state for specific date
 * GET /api/state?userId=xxx&days=7 - Get history for last N days
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const dateParam = searchParams.get('date')
    const days = searchParams.get('days')

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    // If date is provided, get state for that specific date
    if (dateParam) {
      const targetDate = parseDateKey(dateParam)
      
      // Also get yesterday for trend calculation
      const yesterday = new Date(targetDate)
      yesterday.setDate(yesterday.getDate() - 1)

      const [todayState, yesterdayState] = await Promise.all([
        db.dailyState.findUnique({
          where: {
            userId_date: {
              userId,
              date: targetDate
            }
          }
        }),
        db.dailyState.findUnique({
          where: {
            userId_date: {
              userId,
              date: yesterday
            }
          }
        })
      ])

      return NextResponse.json({
        success: true,
        date: formatDateKey(targetDate),
        state: todayState ? {
          mood: todayState.mood,
          energy: todayState.energy,
          status: todayState.mood ? getMoodStatus(todayState.mood) : null,
          trend: todayState && yesterdayState && todayState.mood && yesterdayState.mood
            ? todayState.mood - yesterdayState.mood
            : 0
        } : null
      })
    }

    // Otherwise, get history for last N days
    const daysCount = parseInt(days || '7')
    const startDate = getDaysAgo(daysCount)

    const states = await db.dailyState.findMany({
      where: {
        userId,
        date: { gte: startDate }
      },
      orderBy: { date: 'desc' }
    })

    return NextResponse.json({
      success: true,
      states: states.map(s => ({
        date: formatDateKey(s.date),
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
