import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function getMoodStatus(mood: number): string {
  if (mood >= 9) return 'Пиковое состояние! 🚀'
  if (mood >= 7) return 'Хороший тон, есть ресурс'
  if (mood >= 5) return 'Нормально, можно лучше'
  if (mood >= 3) return 'Низкий ресурс, береги силы'
  return 'Кризис, нужна поддержка'
}

/**
 * Telegram WebApp Auth API
 * POST /api/auth
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { initData } = body

    const params = new URLSearchParams(initData || '')
    const userJson = params.get('user')

    if (!userJson) {
      return NextResponse.json({ error: 'No user data' }, { status: 400 })
    }

    const tgUser = JSON.parse(userJson)
    const telegramId = String(tgUser.id)

    // Find or create user
    let user = await db.appUser.findUnique({
      where: { telegramId },
      include: { profile: true }
    })

    if (!user) {
      user = await db.appUser.create({
        data: {
          telegramId,
          username: tgUser.username || null,
          firstName: tgUser.first_name || null,
          lastName: tgUser.last_name || null,
          photoUrl: tgUser.photo_url || null,
          language: tgUser.language_code || 'ru',
          profile: {
            create: { waterBaseline: 2000 }
          }
        },
        include: { profile: true }
      })
    } else {
      user = await db.appUser.update({
        where: { telegramId },
        data: {
          username: tgUser.username || null,
          firstName: tgUser.first_name || null,
          lastName: tgUser.last_name || null,
          photoUrl: tgUser.photo_url || null,
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
        targetWeight: user.profile.targetWeight,
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
    console.error('Auth error:', error)
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 })
  }
}

/**
 * Demo auth
 * GET /api/auth?demo=true
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const demo = searchParams.get('demo')

  if (demo !== 'true') {
    return NextResponse.json({ error: 'Use POST or ?demo=true' }, { status: 400 })
  }

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
          username: 'demo_user',
          firstName: 'Демо',
          lastName: 'Пользователь',
          language: 'ru',
          day: 1,
          streak: 5,
          points: 150,
          profile: {
            create: {
              weight: 75,
              height: 180,
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
        targetWeight: user.profile.targetWeight,
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
    console.error('Demo auth error:', error)
    return NextResponse.json({ error: 'Demo auth failed' }, { status: 500 })
  }
}
