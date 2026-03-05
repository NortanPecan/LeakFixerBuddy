import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Get measurements history
 * GET /api/fitness/measurements?userId=<id>&type=<type>&limit=<n>
 *
 * Types: weight, height, chest, waist, hips, bicep, thigh, mood
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '30')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    const where: Record<string, unknown> = { userId }
    if (type) where.type = type

    const measurements = await db.measurement.findMany({
      where,
      orderBy: { date: 'desc' },
      take: limit
    })

    return NextResponse.json({
      measurements: measurements.map(m => ({
        id: m.id,
        type: m.type,
        value: m.value,
        unit: m.unit,
        date: m.date,
        note: m.note
      }))
    })
  } catch (error) {
    console.error('Get measurements error:', error)
    return NextResponse.json(
      { error: 'Failed to get measurements' },
      { status: 500 }
    )
  }
}

/**
 * Add measurement
 * POST /api/fitness/measurements
 *
 * Body: {
 *   userId: string
 *   type: string (weight, height, etc.)
 *   value: number
 *   unit?: string
 *   note?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, type, value, unit, note } = body

    if (!userId || !type || value === undefined) {
      return NextResponse.json(
        { error: 'userId, type, and value required' },
        { status: 400 }
      )
    }

    const measurement = await db.measurement.create({
      data: {
        userId,
        type,
        value: Number(value),
        unit: unit || null,
        note: note || null,
        date: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      measurement: {
        id: measurement.id,
        type: measurement.type,
        value: measurement.value,
        unit: measurement.unit,
        date: measurement.date
      }
    })
  } catch (error) {
    console.error('Add measurement error:', error)
    return NextResponse.json(
      { error: 'Failed to add measurement' },
      { status: 500 }
    )
  }
}

/**
 * Delete measurement
 * DELETE /api/fitness/measurements?id=<measurementId>
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Measurement ID required' },
        { status: 400 }
      )
    }

    await db.measurement.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      deleted: true
    })
  } catch (error) {
    console.error('Delete measurement error:', error)
    return NextResponse.json(
      { error: 'Failed to delete measurement' },
      { status: 500 }
    )
  }
}
