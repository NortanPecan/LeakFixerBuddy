import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createHmac } from 'crypto'

interface TelegramUser {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  photo_url?: string
  language_code?: string
}

const DEMO_TELEGRAM_ID_TEXT = '9000000001'
const DEMO_TELEGRAM_ID_BIGINT = 9000000001n
const DEMO_EMAIL = 'demo@leakfixer.local'

function getMoodStatus(mood: number): string {
  if (mood >= 9) return 'Peak condition'
  if (mood >= 7) return 'Good tone, enough resource'
  if (mood >= 5) return 'Stable, can improve'
  if (mood >= 3) return 'Low resource, recover first'
  return 'Crisis zone, prioritize support'
}

function makeConfigHint() {
  return {
    databaseUrl: !!process.env.DATABASE_URL,
    directDatabaseUrl: !!process.env.DIRECT_DATABASE_URL,
    demoMode: process.env.DEMO_MODE ?? null,
    telegramBotToken: !!process.env.TELEGRAM_BOT_TOKEN,
  }
}

function classifyAuthError(scope: 'auth' | 'demo', error: unknown) {
  const details = error instanceof Error ? error.message : 'Unknown error'
  const text = details.toLowerCase()

  if (text.includes('environment variable not found') || text.includes('database_url')) {
    return {
      status: 500,
      error: `${scope === 'demo' ? 'Demo auth' : 'Auth'} failed: DATABASE_URL is not configured`,
      reason: 'Server database configuration is missing',
      hint: 'Set DATABASE_URL (and DIRECT_DATABASE_URL for PostgreSQL/Supabase) in Vercel environment variables.',
      details,
      config: makeConfigHint(),
    }
  }

  if (text.includes('p1001') || text.includes("can't reach database") || text.includes('connect')) {
    return {
      status: 503,
      error: `${scope === 'demo' ? 'Demo auth' : 'Auth'} failed: database is unreachable`,
      reason: 'Database connection failed',
      hint: 'Check Supabase availability and DATABASE_URL/DIRECT_DATABASE_URL values.',
      details,
      config: makeConfigHint(),
    }
  }

  if (
    text.includes('unknown arg') ||
    text.includes('invalid value provided') ||
    text.includes('column') ||
    text.includes('does not exist') ||
    text.includes('type mismatch')
  ) {
    return {
      status: 500,
      error: `${scope === 'demo' ? 'Demo auth' : 'Auth'} failed: schema mismatch`,
      reason: 'Runtime Prisma schema does not match database schema',
      hint: 'Regenerate Prisma Client for the active schema and verify Supabase tables/columns are in sync.',
      details,
      config: makeConfigHint(),
    }
  }

  return {
    status: 500,
    error: `${scope === 'demo' ? 'Demo auth' : 'Auth'} failed`,
    reason: 'Unexpected server error',
    hint: 'Check server logs for stack trace and Prisma error details.',
    details,
    config: makeConfigHint(),
  }
}

function telegramIdCandidates(rawId: number | string) {
  const str = String(rawId)
  const candidates: Array<string | bigint> = [str]
  try {
    candidates.push(BigInt(str))
  } catch {
    // Keep only string candidate.
  }
  return candidates
}

function normalizeTgUser(user: TelegramUser) {
  return {
    telegramUsername: user.username || null,
    telegramFirstName: user.first_name || null,
    telegramLastName: user.last_name || null,
    telegramPhotoUrl: user.photo_url || null,
    telegramLanguageCode: user.language_code || 'ru',
    username: user.username || null,
    firstName: user.first_name || null,
    lastName: user.last_name || null,
    photoUrl: user.photo_url || null,
    language: user.language_code || 'ru',
    lastLoginAt: new Date(),
  }
}

function serializeTelegramId(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'bigint') return value.toString()
  return String(value)
}

async function findUserByTelegramId(rawId: number | string) {
  const candidates = telegramIdCandidates(rawId)
  for (const candidate of candidates) {
    try {
      const user = await db.appUser.findUnique({
        where: { telegramId: candidate as never },
        include: { profile: true },
      })
      if (user) return user
    } catch {
      // Candidate type may be incompatible with active Prisma schema; try next.
    }
  }
  return null
}

async function createUserByTelegramId(rawId: number | string, data: Record<string, unknown>) {
  const candidates = telegramIdCandidates(rawId)
  let lastError: unknown = null

  for (const candidate of candidates) {
    try {
      return await db.appUser.create({
        data: {
          ...data,
          telegramId: candidate as never,
        } as never,
        include: { profile: true },
      })
    } catch (error) {
      lastError = error
    }
  }

  throw lastError || new Error('Failed to create user with all telegramId candidates')
}

/**
 * Validate Telegram WebApp initData signature
 * @see https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app
 */
function validateTelegramInitData(initData: string, botToken: string): { valid: boolean; user?: TelegramUser } {
  try {
    const params = new URLSearchParams(initData)
    const hash = params.get('hash')

    if (!hash) {
      console.error('[Telegram Auth] No hash in initData')
      return { valid: false }
    }

    params.delete('hash')

    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n')

    const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest()
    const signature = createHmac('sha256', secretKey).update(dataCheckString).digest('hex')
    const valid = signature === hash

    if (!valid) {
      console.error('[Telegram Auth] Invalid signature', { expected: hash, calculated: signature })
      return { valid: false }
    }

    const userJson = params.get('user')
    if (!userJson) {
      console.error('[Telegram Auth] No user data in initData')
      return { valid: false }
    }

    const user = JSON.parse(userJson) as TelegramUser
    return { valid: true, user }
  } catch (error) {
    console.error('[Telegram Auth] Validation error:', error)
    return { valid: false }
  }
}

/**
 * Telegram WebApp Auth API
 * POST /api/auth - Login with Telegram initData
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { initData } = body

    if (!initData) {
      return NextResponse.json({ error: 'No initData provided' }, { status: 400 })
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN

    let tgUser: TelegramUser

    if (botToken) {
      const validation = validateTelegramInitData(initData, botToken)
      if (!validation.valid || !validation.user) {
        return NextResponse.json(
          {
            error: 'Invalid Telegram signature',
            hint: 'Make sure TELEGRAM_BOT_TOKEN is set correctly',
          },
          { status: 401 },
        )
      }
      tgUser = validation.user
    } else {
      const params = new URLSearchParams(initData)
      const userJson = params.get('user')

      if (!userJson) {
        return NextResponse.json({ error: 'No user data in initData' }, { status: 400 })
      }

      tgUser = JSON.parse(userJson)
    }

    const baseUserData = normalizeTgUser(tgUser)

    let user = await findUserByTelegramId(tgUser.id)

    if (!user) {
      user = await createUserByTelegramId(tgUser.id, {
        ...baseUserData,
        authProvider: 'telegram',
        profile: {
          create: { waterBaseline: 2000 },
        },
      })
    } else {
      user = await db.appUser.update({
        where: { id: user.id },
        data: baseUserData,
        include: { profile: true },
      })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayState = await db.dailyState.findFirst({
      where: { userId: user.id, date: today },
    })

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayState = await db.dailyState.findFirst({
      where: { userId: user.id, date: yesterday },
    })

    const globalState = todayState?.mood
      ? {
          mood: todayState.mood,
          energy: todayState.energy || 5,
          trend: yesterdayState?.mood ? todayState.mood - yesterdayState.mood : 0,
          status: getMoodStatus(todayState.mood),
        }
      : null

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        telegramId: serializeTelegramId(user.telegramId),
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        photoUrl: user.photoUrl,
        language: user.language,
        day: user.day,
        streak: user.streak,
        points: user.points,
      },
      profile: user.profile
        ? {
            weight: user.profile.weight,
            height: user.profile.height,
            age: user.profile.age,
            sex: user.profile.sex,
            targetWeight: user.profile.targetWeight,
            targetCalories: user.profile.targetCalories,
            workProfile: user.profile.workProfile,
            waterBaseline: user.profile.waterBaseline,
            waist: user.profile.waist,
            hips: user.profile.hips,
            chest: user.profile.chest,
            bicep: user.profile.bicep,
            thigh: user.profile.thigh,
          }
        : null,
      globalState,
    })
  } catch (error) {
    console.error('[Telegram Auth] Error:', error)
    const mapped = classifyAuthError('auth', error)
    return NextResponse.json(mapped, { status: mapped.status })
  }
}

/**
 * Demo auth for local and production fallback
 * GET /api/auth?demo=true
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const demo = searchParams.get('demo')

  if (demo !== 'true') {
    return NextResponse.json(
      {
        error: 'Use POST with initData or GET ?demo=true',
        hint: 'In production, send Telegram WebApp initData via POST',
      },
      { status: 400 },
    )
  }

  try {
    let user =
      (await db.appUser.findUnique({
        where: { email: DEMO_EMAIL },
        include: { profile: true },
      })) || (await findUserByTelegramId(DEMO_TELEGRAM_ID_TEXT))

    if (!user) {
      user = await createUserByTelegramId(DEMO_TELEGRAM_ID_TEXT, {
        telegramUsername: 'demo_user',
        telegramFirstName: 'Demo',
        telegramLastName: 'User',
        telegramLanguageCode: 'ru',
        username: 'demo_user',
        firstName: 'Demo',
        lastName: 'User',
        language: 'ru',
        day: 1,
        streak: 5,
        points: 150,
        authProvider: 'demo',
        email: DEMO_EMAIL,
        lastLoginAt: new Date(),
        profile: {
          create: {
            weight: 75,
            height: 180,
            age: 30,
            sex: 'male',
            targetWeight: 72,
            workProfile: 'mixed',
            waterBaseline: 2500,
            waist: 82,
            hips: 98,
            chest: 100,
            bicep: 35,
            thigh: 58,
          },
        },
      })
    } else {
      user = await db.appUser.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
        include: { profile: true },
      })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let todayState = await db.dailyState.findFirst({
      where: { userId: user.id, date: today },
    })

    if (!todayState) {
      todayState = await db.dailyState.create({
        data: {
          userId: user.id,
          date: today,
          mood: 7,
          energy: 6,
        },
      })
    }

    const globalState = {
      mood: todayState.mood || 7,
      energy: todayState.energy || 6,
      trend: 0.8,
      status: getMoodStatus(todayState.mood || 7),
    }

    return NextResponse.json({
      success: true,
      isDemo: true,
      user: {
        id: user.id,
        telegramId: serializeTelegramId(user.telegramId),
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        photoUrl: user.photoUrl,
        language: user.language,
        day: user.day,
        streak: user.streak,
        points: user.points,
      },
      profile: user.profile
        ? {
            weight: user.profile.weight,
            height: user.profile.height,
            age: user.profile.age,
            sex: user.profile.sex,
            targetWeight: user.profile.targetWeight,
            targetCalories: user.profile.targetCalories,
            workProfile: user.profile.workProfile,
            waterBaseline: user.profile.waterBaseline,
            waist: user.profile.waist,
            hips: user.profile.hips,
            chest: user.profile.chest,
            bicep: user.profile.bicep,
            thigh: user.profile.thigh,
          }
        : null,
      globalState,
    })
  } catch (error) {
    console.error('[Demo Auth] Error:', error)
    const mapped = classifyAuthError('demo', error)
    return NextResponse.json(mapped, { status: mapped.status })
  }
}
