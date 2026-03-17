import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { normalizeToDate } from '@/lib/date-utils'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const CRON_SECRET = process.env.CRON_SECRET

async function sendTelegramMessage(chatId: bigint, text: string): Promise<boolean> {
  if (!BOT_TOKEN) return false
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId.toString(),
        text,
        parse_mode: 'HTML',
      }),
    })
    const data = await res.json()
    return data.ok === true
  } catch {
    return false
  }
}

function buildMorningMessage(firstName: string): string {
  return (
    `☀️ Доброе утро, ${firstName}!\n\n` +
    `Не забудь сделать <b>утренний чек-ин</b> — поставь энергию, выбери фокус-слово и задачи на день.\n\n` +
    `🚀 Открой <b>LeakFixer Buddy</b> и начни день осознанно!`
  )
}

function buildEveningMessage(firstName: string): string {
  return (
    `🌙 Добрый вечер, ${firstName}!\n\n` +
    `Не забудь закрыть день — сделай <b>вечерний чек-ин</b>: оцени день, отметь выполненные задачи, запиши победу.\n\n` +
    `✨ Открой <b>LeakFixer Buddy</b> и подведи итоги!`
  )
}

// GET — cron-compatible (Vercel Cron)
// POST — manual trigger with optional { userId, type } body
export async function GET(request: NextRequest) {
  return handleNotify(request, null)
}

export async function POST(request: NextRequest) {
  let body: { userId?: string; type?: string } = {}
  try {
    body = await request.json()
  } catch {
    // empty body is ok
  }
  return handleNotify(request, body)
}

async function handleNotify(
  request: NextRequest,
  body: { userId?: string; type?: string } | null
) {
  // Secret check for cron calls
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!BOT_TOKEN) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN not configured' }, { status: 500 })
  }

  // Determine type from body or query param
  const { searchParams } = new URL(request.url)
  const type = (body?.type ?? searchParams.get('type') ?? 'morning') as 'morning' | 'evening'

  if (type !== 'morning' && type !== 'evening') {
    return NextResponse.json(
      { error: 'type must be "morning" or "evening"' },
      { status: 400 }
    )
  }

  const today = normalizeToDate(new Date())

  // Build user query — optionally filter by specific userId
  const userWhere = body?.userId
    ? { userId: body.userId, checkinReminders: true }
    : { checkinReminders: true }

  const usersWithSettings = await db.userSettings.findMany({
    where: userWhere,
    select: {
      userId: true,
      user: {
        select: {
          telegramId: true,
          telegramFirstName: true,
        },
      },
    },
  })

  const results = {
    type,
    total: usersWithSettings.length,
    sent: 0,
    skipped: 0,
    errors: 0,
  }

  for (const settings of usersWithSettings) {
    const { user } = settings
    if (!user?.telegramId) {
      results.skipped++
      continue
    }

    // Check if user already did this type of checkin today
    const existing = await db.dailyCheckin.findUnique({
      where: {
        userId_date_type: {
          userId: settings.userId,
          date: today,
          type,
        },
      },
    })

    if (existing) {
      results.skipped++
      continue
    }

    const firstName = user.telegramFirstName || 'Привет'
    const message =
      type === 'morning'
        ? buildMorningMessage(firstName)
        : buildEveningMessage(firstName)

    const sent = await sendTelegramMessage(user.telegramId, message)
    if (sent) {
      results.sent++
    } else {
      results.errors++
    }
  }

  return NextResponse.json({
    success: true,
    date: today.toISOString().split('T')[0],
    ...results,
  })
}
