import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Fetch buddies for user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const buddies = await db.buddy.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ buddies })
  } catch (error) {
    console.error('Fetch buddies error:', error)
    return NextResponse.json({ error: 'Failed to fetch buddies' }, { status: 500 })
  }
}

// POST - Add new buddy
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, partnerId, partnerName, partnerPhoto } = body

    if (!userId || !partnerId || !partnerName) {
      return NextResponse.json({ error: 'userId, partnerId, and partnerName required' }, { status: 400 })
    }

    // Check if buddy already exists
    const existing = await db.buddy.findUnique({
      where: {
        userId_partnerId: { userId, partnerId }
      }
    })

    if (existing) {
      return NextResponse.json({ error: 'Buddy already exists', buddy: existing }, { status: 400 })
    }

    const buddy = await db.buddy.create({
      data: {
        userId,
        partnerId,
        partnerName,
        partnerPhoto,
        status: 'pending'
      }
    })

    return NextResponse.json({ buddy })
  } catch (error) {
    console.error('Create buddy error:', error)
    return NextResponse.json({ error: 'Failed to create buddy' }, { status: 500 })
  }
}

// PATCH - Update buddy status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { buddyId, status } = body

    if (!buddyId || !status) {
      return NextResponse.json({ error: 'buddyId and status required' }, { status: 400 })
    }

    const buddy = await db.buddy.update({
      where: { id: buddyId },
      data: { status }
    })

    return NextResponse.json({ buddy })
  } catch (error) {
    console.error('Update buddy error:', error)
    return NextResponse.json({ error: 'Failed to update buddy' }, { status: 500 })
  }
}

// DELETE - Remove buddy
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const buddyId = searchParams.get('buddyId')

    if (!buddyId) {
      return NextResponse.json({ error: 'buddyId required' }, { status: 400 })
    }

    await db.buddy.delete({ where: { id: buddyId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete buddy error:', error)
    return NextResponse.json({ error: 'Failed to delete buddy' }, { status: 500 })
  }
}
