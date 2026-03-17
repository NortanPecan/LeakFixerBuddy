import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { normalizeToDate, getDayOfWeek } from '@/lib/date-utils'

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

// GET — cron-compatible (called by cron job or Vercel cron)
// POST — manual trigger with optional userId filter
export async function GET(request: NextRequest) {
  return handleReminder(request)
}

export async function POST(request: NextRequest) {
  return handleReminder(request)
}

async function handleReminder(request: NextRequest) {
  // Optional secret protection for cron calls
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!BOT_TOKEN) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN not configured' }, { status: 500 })
  }

  const today = normalizeToDate(new Date())
  const dayOfWeek = getDayOfWeek(today)

  // Get all users with telegram_id and ritual reminders enabled
  const usersWithSettings = await db.userSettings.findMany({
    where: { ritualReminders: true },
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

    // Get active rituals for today's day of week
    const rituals = await db.ritual.findMany({
      where: { userId: settings.userId, status: 'active' },
      include: {
        completions: {
          where: { date: today },
        },
      },
    })

    // Filter by day of week schedule
    const todayRituals = rituals.filter(r => {
      if (!r.daysOfWeek || (r.daysOfWeek as number[]).length === 0) return true
      return (r.daysOfWeek as number[]).includes(dayOfWeek)
    })

    const incomplete = todayRituals.filter(r => r.completions.length === 0)

    if (incomplete.length === 0) {
      results.skipped++
      continue
    }

    const firstName = user.telegramFirstName || 'Привет'
    const ritualList = incomplete
      .slice(0, 5)
      .map(r => `• ${r.name}`)
      .join('\n')
    const more = incomplete.length > 5 ? `\n...и ещё ${incomplete.length - 5}` : ''

    const message =
      `👋 ${firstName}, не забудь про ритуалы на сегодня!\n\n` +
      `${ritualList}${more}\n\n` +
      `🔥 Открой <b>LeakFixer Buddy</b> и сделай чек-ин.`

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
