import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createHash, randomBytes } from 'crypto'
import { getMoodStatusText } from '@/lib/mood-utils'

// Simple password hashing with SHA-256 + salt
// For production consider bcrypt — but this avoids native dependencies for now
function hashPassword(password: string, salt: string): string {
  return createHash('sha256').update(salt + password + salt).digest('hex')
}

function generateSalt(): string {
  return randomBytes(16).toString('hex')
}

function verifyPassword(password: string, salt: string, hash: string): boolean {
  return hashPassword(password, salt) === hash
}

/**
 * POST /api/auth/email
 * Body: { action: 'signup' | 'signin', email, password, name? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, email, password, name } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    if (!email.includes('@') || email.length < 5) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    if (action === 'signup') {
      // Check if user already exists
      const existing = await db.appUser.findUnique({ where: { email: normalizedEmail } })
      if (existing) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
      }

      const salt = generateSalt()
      const passwordHash = hashPassword(password, salt)
      const displayName = name?.trim() || normalizedEmail.split('@')[0]

      const user = await db.appUser.create({
        data: {
          email: normalizedEmail,
          emailSalt: salt,
          passwordHash,
          firstName: displayName,
          username: displayName,
          language: 'ru',
          authProvider: 'email',
          lastLoginAt: new Date(),
          profile: {
            create: { waterBaseline: 2000 },
          },
        },
        include: { profile: true },
      })

      return NextResponse.json({
        success: true,
        isNew: true,
        user: serializeUser(user),
        profile: user.profile,
        globalState: null,
        isDemo: false,
        isOwner: false,
      })
    }

    if (action === 'signin') {
      const user = await db.appUser.findUnique({
        where: { email: normalizedEmail },
        include: { profile: true },
      })

      if (!user) {
        return NextResponse.json({ error: 'Email not found' }, { status: 404 })
      }

      if (!user.passwordHash || !user.emailSalt) {
        return NextResponse.json(
          { error: 'This account uses Telegram login. Please sign in via Telegram.' },
          { status: 400 }
        )
      }

      const valid = verifyPassword(password, user.emailSalt, user.passwordHash)
      if (!valid) {
        return NextResponse.json({ error: 'Wrong password' }, { status: 401 })
      }

      await db.appUser.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      })

      // Load today's mood/energy state
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      const [todayState, yesterdayState] = await Promise.all([
        db.dailyState.findFirst({ where: { userId: user.id, date: today } }),
        db.dailyState.findFirst({ where: { userId: user.id, date: yesterday } }),
      ])

      const globalState = todayState?.mood
        ? {
            mood: todayState.mood,
            energy: todayState.energy || 5,
            trend: yesterdayState?.mood ? todayState.mood - yesterdayState.mood : 0,
            status: getMoodStatusText(todayState.mood),
          }
        : null

      return NextResponse.json({
        success: true,
        isNew: false,
        user: serializeUser(user),
        profile: user.profile,
        globalState,
        isDemo: false,
        isOwner: false,
      })
    }

    return NextResponse.json({ error: 'action must be signup or signin' }, { status: 400 })
  } catch (error) {
    console.error('[Email Auth] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function serializeUser(user: {
  id: string
  telegramId?: bigint | null
  username?: string | null
  firstName?: string | null
  lastName?: string | null
  photoUrl?: string | null
  language: string
  day: number
  streak: number
  points: number
}) {
  return {
    id: user.id,
    telegramId: user.telegramId ? user.telegramId.toString() : null,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    photoUrl: user.photoUrl,
    language: user.language,
    day: user.day,
    streak: user.streak,
    points: user.points,
  }
}
