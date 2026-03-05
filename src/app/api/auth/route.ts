import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createHmac } from 'crypto'

function getMoodStatus(mood: number): string {
  if (mood >= 9) return 'Пиковое состояние! 🚀'
  if (mood >= 7) return 'Хороший тон, есть ресурс'
  if (mood >= 5) return 'Нормально, можно лучше'
  if (mood >= 3) return 'Низкий ресурс, береги силы'
  return 'Кризис, нужна поддержка'
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
    
    // Remove hash from params for validation
    params.delete('hash')
    
    // Create data-check-string
    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n')
    
    // Create secret key from bot token
    const secretKey = createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest()
    
    // Calculate signature
    const signature = createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex')
    
    // Compare signatures
    const valid = signature === hash
    
    if (!valid) {
      console.error('[Telegram Auth] Invalid signature', { 
        expected: hash, 
        calculated: signature 
      })
      return { valid: false }
    }
    
    // Parse user data
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

interface TelegramUser {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  photo_url?: string
  language_code?: string
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

    // Get bot token from environment
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    
    let tgUser: TelegramUser
    
    if (botToken) {
      // Production mode: validate signature
      const validation = validateTelegramInitData(initData, botToken)
      
      if (!validation.valid || !validation.user) {
        return NextResponse.json({ 
          error: 'Invalid Telegram signature',
          hint: 'Make sure TELEGRAM_BOT_TOKEN is set correctly'
        }, { status: 401 })
      }
      
      tgUser = validation.user
      console.log('[Telegram Auth] Valid signature for user:', tgUser.id)
    } else {
      // Development mode: skip signature validation
      console.warn('[Telegram Auth] WARNING: TELEGRAM_BOT_TOKEN not set, skipping validation')
      
      const params = new URLSearchParams(initData)
      const userJson = params.get('user')
      
      if (!userJson) {
        return NextResponse.json({ error: 'No user data in initData' }, { status: 400 })
      }
      
      tgUser = JSON.parse(userJson)
    }

    const telegramId = String(tgUser.id)

    // Find or create user
    let user = await db.appUser.findUnique({
      where: { telegramId },
      include: { profile: true }
    })

    if (!user) {
      console.log('[Telegram Auth] Creating new user:', telegramId)
      user = await db.appUser.create({
        data: {
          telegramId,
          telegramUsername: tgUser.username || null,
          telegramFirstName: tgUser.first_name || null,
          telegramLastName: tgUser.last_name || null,
          telegramPhotoUrl: tgUser.photo_url || null,
          telegramLanguageCode: tgUser.language_code || 'ru',
          // Legacy fields for backwards compatibility
          username: tgUser.username || null,
          firstName: tgUser.first_name || null,
          lastName: tgUser.last_name || null,
          photoUrl: tgUser.photo_url || null,
          language: tgUser.language_code || 'ru',
          authProvider: 'telegram',
          lastLoginAt: new Date(),
          profile: {
            create: { waterBaseline: 2000 }
          }
        },
        include: { profile: true }
      })
    } else {
      // Update user info and last login
      user = await db.appUser.update({
        where: { telegramId },
        data: {
          telegramUsername: tgUser.username || null,
          telegramFirstName: tgUser.first_name || null,
          telegramLastName: tgUser.last_name || null,
          telegramPhotoUrl: tgUser.photo_url || null,
          telegramLanguageCode: tgUser.language_code || 'ru',
          // Legacy fields
          username: tgUser.username || null,
          firstName: tgUser.first_name || null,
          lastName: tgUser.last_name || null,
          photoUrl: tgUser.photo_url || null,
          lastLoginAt: new Date(),
        },
        include: { profile: true }
      })
    }

    // Get today's state
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayState = await db.dailyState.findFirst({
      where: { userId: user.id, date: today }
    })

    // Get yesterday's state for trend
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayState = await db.dailyState.findFirst({
      where: { userId: user.id, date: yesterday }
    })

    const globalState = todayState?.mood ? {
      mood: todayState.mood,
      energy: todayState.energy || 5,
      trend: yesterdayState?.mood ? todayState.mood - yesterdayState.mood : 0,
      status: getMoodStatus(todayState.mood)
    } : null

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        photoUrl: user.photoUrl,
        language: user.language,
        day: user.day,
        streak: user.streak,
        points: user.points,
      },
      profile: user.profile ? {
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
      } : null,
      globalState
    })
  } catch (error) {
    console.error('[Telegram Auth] Error:', error)
    return NextResponse.json({ 
      error: 'Auth failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Demo auth for local development
 * GET /api/auth?demo=true
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const demo = searchParams.get('demo')

  if (demo !== 'true') {
    return NextResponse.json({ 
      error: 'Use POST with initData or GET ?demo=true',
      hint: 'In production, send Telegram WebApp initData via POST'
    }, { status: 400 })
  }

  console.log('[Demo Auth] Creating demo user')

  try {
    const telegramId = 'demo'
    let user = await db.appUser.findUnique({
      where: { telegramId },
      include: { profile: true }
    })

    if (!user) {
      user = await db.appUser.create({
        data: {
          telegramId,
          telegramUsername: 'demo_user',
          telegramFirstName: 'Демо',
          telegramLastName: 'Пользователь',
          telegramLanguageCode: 'ru',
          username: 'demo_user',
          firstName: 'Демо',
          lastName: 'Пользователь',
          language: 'ru',
          day: 1,
          streak: 5,
          points: 150,
          authProvider: 'demo',
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
            }
          }
        },
        include: { profile: true }
      })
    }

    // Get today's state
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let todayState = await db.dailyState.findFirst({
      where: { userId: user.id, date: today }
    })

    // Create demo state if not exists
    if (!todayState) {
      todayState = await db.dailyState.create({
        data: {
          userId: user.id,
          date: today,
          mood: 7,
          energy: 6
        }
      })
    }

    const globalState = {
      mood: todayState.mood || 7,
      energy: todayState.energy || 6,
      trend: 0.8,
      status: getMoodStatus(todayState.mood || 7)
    }

    return NextResponse.json({
      success: true,
      isDemo: true,
      user: {
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        photoUrl: user.photoUrl,
        language: user.language,
        day: user.day,
        streak: user.streak,
        points: user.points,
      },
      profile: user.profile ? {
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
      } : null,
      globalState
    })
  } catch (error) {
    console.error('[Demo Auth] Error:', error)
    return NextResponse.json({ 
      error: 'Demo auth failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
