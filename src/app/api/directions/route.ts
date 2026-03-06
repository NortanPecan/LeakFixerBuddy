import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Fetch all directions for user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const directions = await db.direction.findMany({
      where: { userId },
      orderBy: [{ status: 'asc' }, { sortOrder: 'asc' }],
      include: {
        _count: { select: { challenges: true } }
      }
    })

    return NextResponse.json({ directions })
  } catch (error) {
    console.error('Fetch directions error:', error)
    return NextResponse.json({ error: 'Failed to fetch directions' }, { status: 500 })
  }
}

// POST - Create new direction
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, title, description, horizon, color, icon } = body

    if (!userId || !title) {
      return NextResponse.json({ error: 'userId and title required' }, { status: 400 })
    }

    const maxOrder = await db.direction.aggregate({
      where: { userId },
      _max: { sortOrder: true }
    })

    const direction = await db.direction.create({
      data: {
        userId,
        title,
        description,
        horizon: horizon || 'year',
        color: color || '#10b981',
        icon,
        sortOrder: (maxOrder._max.sortOrder || 0) + 1
      }
    })

    return NextResponse.json({ direction })
  } catch (error) {
    console.error('Create direction error:', error)
    return NextResponse.json({ error: 'Failed to create direction' }, { status: 500 })
  }
}

// PATCH - Update direction
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, title, description, horizon, color, icon, status } = body

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const direction = await db.direction.update({
      where: { id },
      data: {
        title,
        description,
        horizon,
        color,
        icon,
        status
      }
    })

    return NextResponse.json({ direction })
  } catch (error) {
    console.error('Update direction error:', error)
    return NextResponse.json({ error: 'Failed to update direction' }, { status: 500 })
  }
}

// DELETE - Delete direction
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    await db.direction.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete direction error:', error)
    return NextResponse.json({ error: 'Failed to delete direction' }, { status: 500 })
  }
}
