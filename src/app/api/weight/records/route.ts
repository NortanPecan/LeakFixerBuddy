import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSelf } from '@/lib/server-auth'

// GET - Get weight records grouped by day
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const skip = parseInt(searchParams.get('skip') || '0')
    const take = parseInt(searchParams.get('take') || '30')

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }
    await requireSelf(request, userId)

    // Get all weight measurements
    const measurements = await db.measurement.findMany({
      where: {
        userId,
        type: 'weight'
      },
      orderBy: { date: 'desc' },
      skip,
      take
    })

    // Group by date
    const grouped: Record<string, {
      date: string
      avg: number
      count: number
      measurements: Array<{
        id: string
        value: number
        date: string
        note: string | null
      }>
    }> = {}

    measurements.forEach(m => {
      const dateKey = m.date.toISOString().split('T')[0]
      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          date: dateKey,
          avg: 0,
          count: 0,
          measurements: []
        }
      }
      grouped[dateKey].measurements.push({
        id: m.id,
        value: m.value,
        date: m.date.toISOString(),
        note: m.note
      })
      grouped[dateKey].count++
    })

    // Calculate averages
    const groups = Object.values(grouped).map(g => ({
      ...g,
      avg: g.measurements.reduce((sum, m) => sum + m.value, 0) / g.measurements.length
    })).sort((a, b) => b.date.localeCompare(a.date))

    return NextResponse.json({ groups })
  } catch (error) {
    console.error('Get weight records error:', error)
    return NextResponse.json({ error: 'Failed to get weight records' }, { status: 500 })
  }
}
