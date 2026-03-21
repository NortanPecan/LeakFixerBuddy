import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createHmac } from 'crypto'
import { getMoodStatusText } from '@/lib/mood-utils'
import { setAuthSession } from '@/lib/server-auth'

interface TelegramUser {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  photo_url?: string
  language_code?: string
}

const DEMO_TELEGRAM_ID_TEXT = '9000000001'
const DEMO_EMAIL = 'demo@leakfixer.local'

function makeConfigHint() {
  return {
    databaseUrl: !!process.env.DATABASE_URL,
    directDatabaseUrl: !!process.env.DIRECT_DATABASE_URL,
    demoMode: process.env.DEMO_MODE ?? null,
    telegramBotToken: !!process.env.TELEGRAM_BOT_TOKEN,
  }
}

function isDemoModeEnabled() {
  return process.env.DEMO_MODE === 'true'
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

    if (!botToken) {
      return NextResponse.json(
        {
          error: 'TELEGRAM_BOT_TOKEN is not configured',
          hint: 'Set TELEGRAM_BOT_TOKEN in the server environment to enable Telegram auth',
        },
        { status: 500 },
      )
    }

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

    const tgUser = validation.user

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

    // Streak reset logic: if user missed a day, reset or apply shield
    let shieldApplied = false
    if (user.streak > 0 && user.lastLoginAt) {
      const lastDay = new Date(user.lastLoginAt)
      lastDay.setHours(0, 0, 0, 0)
      const daysMissed = Math.floor((today.getTime() - lastDay.getTime()) / 86400000)
      if (daysMissed > 1) {
        const shieldAvailable =
          !user.streakShieldUsedAt ||
          today.getTime() - new Date(user.streakShieldUsedAt).getTime() > 7 * 86400000
        if (shieldAvailable) {
          user = await db.appUser.update({
            where: { id: user.id },
            data: { streakShieldUsedAt: new Date() },
            include: { profile: true },
          })
          shieldApplied = true
        } else {
          user = await db.appUser.update({
            where: { id: user.id },
            data: { streak: 0 },
            include: { profile: true },
          })
        }
      }
    }

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
          status: getMoodStatusText(todayState.mood),
        }
      : null

    const response = NextResponse.json({
      success: true,
      shieldApplied,
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
        streakShieldUsedAt: user.streakShieldUsedAt?.toISOString() ?? null,
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

    return setAuthSession(response, user.id, 'telegram')
  } catch (error) {
    console.error('[Telegram Auth] Error:', error)
    const mapped = classifyAuthError('auth', error)
    return NextResponse.json(mapped, { status: mapped.status })
  }
}

/**
 * Controlled demo auth
 * GET /api/auth?demo=true - Login as demo user only when DEMO_MODE=true
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const demo = searchParams.get('demo')

  if (demo !== 'true') {
    return NextResponse.json(
      {
        error: 'Use POST with initData',
        hint: 'Demo auth is available only when DEMO_MODE=true',
      },
      { status: 400 },
    )
  }

  if (!isDemoModeEnabled()) {
    return NextResponse.json(
      {
        error: 'Demo mode is disabled',
        hint: 'Set DEMO_MODE=true only for controlled development access',
      },
      { status: 403 },
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
      status: getMoodStatusText(todayState.mood || 7),
    }

    const response = NextResponse.json({
      success: true,
      isDemo: true,
      isOwner: false,
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
        streakShieldUsedAt: user.streakShieldUsedAt?.toISOString() ?? null,
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

    return setAuthSession(response, user.id, 'demo')
  } catch (error) {
    console.error('[Demo Auth] Error:', error)
    const mapped = classifyAuthError('demo', error)
    return NextResponse.json(mapped, { status: mapped.status })
  }
}
