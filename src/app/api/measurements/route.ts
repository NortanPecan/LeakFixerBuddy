import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Fetch measurements for user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '30')

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const where: { userId: string; type?: string } = { userId }
    if (type) where.type = type

    const measurements = await db.measurement.findMany({
      where,
      orderBy: { date: 'desc' },
      take: limit
    })

    // Get latest measurements by type
    const latestByType: Record<string, { value: number; date: string; trend: number }> = {}
    const types = ['weight', 'waist', 'hips', 'chest', 'bicep', 'thigh']

    for (const t of types) {
      const latest = await db.measurement.findFirst({
        where: { userId, type: t },
        orderBy: { date: 'desc' }
      })
      const previous = await db.measurement.findFirst({
        where: { userId, type: t },
        orderBy: { date: 'desc' },
        skip: 1
      })

      if (latest) {
        latestByType[t] = {
          value: latest.value,
          date: latest.date.toISOString(),
          trend: previous ? latest.value - previous.value : 0
        }
      }
    }

    return NextResponse.json({ measurements, latestByType })
  } catch (error) {
    console.error('Fetch measurements error:', error)
    return NextResponse.json({ error: 'Failed to fetch measurements' }, { status: 500 })
  }
}

// POST - Add new measurement
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, type, value, unit, note, photoUrl } = body

    if (!userId || !type || value === undefined) {
      return NextResponse.json({ error: 'userId, type, and value required' }, { status: 400 })
    }

    const measurement = await db.measurement.create({
      data: {
        userId,
        type,
        value: parseFloat(value),
        unit: unit || getTypeUnit(type),
        note,
        photoUrl
      }
    })

    // Update user profile with latest body measurements
    if (['waist', 'hips', 'chest', 'bicep', 'thigh'].includes(type)) {
      const profile = await db.userProfile.findUnique({ where: { userId } })
      if (profile) {
        await db.userProfile.update({
          where: { userId },
          data: { [type]: parseFloat(value) }
        })
      }
    }

    return NextResponse.json({ measurement })
  } catch (error) {
    console.error('Create measurement error:', error)
    return NextResponse.json({ error: 'Failed to create measurement' }, { status: 500 })
  }
}

function getTypeUnit(type: string): string {
  switch (type) {
    case 'weight':
      return 'kg'
    default:
      return 'cm'
  }
}
