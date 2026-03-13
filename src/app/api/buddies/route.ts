import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Fetch buddies for user (outgoing) and incoming requests
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const type = searchParams.get('type') || 'all' // 'outgoing', 'incoming', 'all'

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    // Outgoing: requests I sent to others
    const outgoing = await db.buddy.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })

    // Incoming: requests others sent to me (where I am the partner)
    // Need to find buddies where partnerId = userId
    const allBuddiesWithMeAsPartner = await db.buddy.findMany({
      where: { partnerId: userId },
      orderBy: { createdAt: 'desc' }
    })

    // For incoming, we need to get the requester's info
    const incomingRequesterIds = allBuddiesWithMeAsPartner.map(b => b.userId)
    const requesters = await db.appUser.findMany({
      where: { id: { in: incomingRequesterIds } },
      select: {
        id: true,
        telegramFirstName: true,
        telegramLastName: true,
        telegramUsername: true,
        telegramPhotoUrl: true,
        firstName: true,
        lastName: true,
        photoUrl: true,
        username: true
      }
    })

    const requestersMap = new Map(requesters.map(r => [r.id, r]))

    const incoming = allBuddiesWithMeAsPartner.map(b => {
      const requester = requestersMap.get(b.userId)
      return {
        id: b.id,
        partnerId: b.userId,
        partnerName: requester 
          ? (requester.telegramFirstName 
              ? `${requester.telegramFirstName}${requester.telegramLastName ? ` ${requester.telegramLastName}` : ''}`
              : requester.firstName 
                ? `${requester.firstName}${requester.lastName ? ` ${requester.lastName}` : ''}`
                : requester.telegramUsername || requester.username || 'Пользователь')
          : b.partnerName,
        partnerPhoto: requester?.telegramPhotoUrl || requester?.photoUrl || b.partnerPhoto,
        status: b.status,
        createdAt: b.createdAt
      }
    })

    if (type === 'outgoing') {
      return NextResponse.json({ buddies: outgoing, incoming: [] })
    }
    if (type === 'incoming') {
      return NextResponse.json({ buddies: [], incoming })
    }

    return NextResponse.json({ buddies: outgoing, incoming })
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

// PATCH - Update buddy status (accept/reject incoming request)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { buddyId, status, currentUserId } = body

    if (!buddyId || !status) {
      return NextResponse.json({ error: 'buddyId and status required' }, { status: 400 })
    }

    // Get the buddy request
    const existingBuddy = await db.buddy.findUnique({
      where: { id: buddyId }
    })

    if (!existingBuddy) {
      return NextResponse.json({ error: 'Buddy request not found' }, { status: 404 })
    }

    // Update the status
    const buddy = await db.buddy.update({
      where: { id: buddyId },
      data: { status }
    })

    // If accepted, create reverse buddy relationship
    if (status === 'accepted' && currentUserId) {
      // Check if reverse already exists
      const reverse = await db.buddy.findUnique({
        where: {
          userId_partnerId: { 
            userId: currentUserId, 
            partnerId: existingBuddy.userId 
          }
        }
      })

      if (!reverse) {
        // Get requester info for name/photo
        const requester = await db.appUser.findUnique({
          where: { id: existingBuddy.userId },
          select: {
            telegramFirstName: true,
            telegramLastName: true,
            telegramUsername: true,
            telegramPhotoUrl: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            username: true
          }
        })

        const requesterName = requester 
          ? (requester.telegramFirstName 
              ? `${requester.telegramFirstName}${requester.telegramLastName ? ` ${requester.telegramLastName}` : ''}`
              : requester.firstName 
                ? `${requester.firstName}${requester.lastName ? ` ${requester.lastName}` : ''}`
                : requester.telegramUsername || requester.username || 'Пользователь')
          : existingBuddy.partnerName

        await db.buddy.create({
          data: {
            userId: currentUserId,
            partnerId: existingBuddy.userId,
            partnerName: requesterName,
            partnerPhoto: requester?.telegramPhotoUrl || requester?.photoUrl || existingBuddy.partnerPhoto,
            status: 'accepted'
          }
        })
      } else if (reverse.status !== 'accepted') {
        // Update existing reverse to accepted
        await db.buddy.update({
          where: { id: reverse.id },
          data: { status: 'accepted' }
        })
      }
    }

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
