import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Fetch all users (excluding current user)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const search = searchParams.get('search') || ''

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    // Get all users excluding current user
    const users = await db.appUser.findMany({
      where: {
        id: { not: userId },
        OR: search ? [
          { telegramFirstName: { contains: search, mode: 'insensitive' } },
          { telegramLastName: { contains: search, mode: 'insensitive' } },
          { telegramUsername: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } }
        ] : undefined
      },
      select: {
        id: true,
        telegramId: true,
        telegramFirstName: true,
        telegramLastName: true,
        telegramUsername: true,
        telegramPhotoUrl: true,
        username: true,
        firstName: true,
        lastName: true,
        photoUrl: true,
        streak: true,
        day: true
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    // Format users for response
    const formattedUsers = users.map(user => ({
      id: user.id,
      name: user.telegramFirstName 
        ? `${user.telegramFirstName}${user.telegramLastName ? ` ${user.telegramLastName}` : ''}`
        : user.firstName 
          ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}`
          : user.telegramUsername || user.username || 'Пользователь',
      photoUrl: user.telegramPhotoUrl || user.photoUrl,
      username: user.telegramUsername || user.username,
      streak: user.streak,
      day: user.day
    }))

    return NextResponse.json({ users: formattedUsers })
  } catch (error) {
    console.error('Fetch users error:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}
