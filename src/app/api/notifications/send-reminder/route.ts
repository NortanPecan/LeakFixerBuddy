import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { formatDateKey, normalizeToDate } from '@/lib/date-utils'
import { isScheduledDay, parseScheduleDays } from '@/lib/streak-utils'

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

export async function GET(request: NextRequest) {
  return handleReminder(request)
}

export async function POST(request: NextRequest) {
  return handleReminder(request)
}

async function handleReminder(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!BOT_TOKEN) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN not configured' }, { status: 500 })
  }

  const today = normalizeToDate(new Date())

  const usersWithSettings = await db.userSettings.findMany({
    where: { ritualReminders: true },
    select: {
      userId: true,
      user: {
        select: {
          telegramId: true,
          telegramFirstName: true,
          streak: true,
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
      results.skipped += 1
      continue
    }

    const rituals = await db.ritual.findMany({
      where: { userId: settings.userId, status: 'active' },
      include: {
        completions: {
          where: { date: today },
        },
      },
    })

    const todayRituals = rituals.filter((ritual) => (
      isScheduledDay(today, parseScheduleDays(ritual.days))
    ))

    const incomplete = todayRituals.filter((ritual) => (
      !ritual.completions.some((completion) => completion.completed)
    ))

    if (incomplete.length === 0) {
      results.skipped += 1
      continue
    }

    const firstName = user.telegramFirstName || 'friend'
    const streak = user.streak ?? 0
    const streakLine = streak > 0
      ? `Current streak: <b>${streak} day${streak === 1 ? '' : 's'}</b>\n\n`
      : ''

    const ritualList = incomplete
      .slice(0, 5)
      .map((ritual) => `• ${ritual.title}`)
      .join('\n')
    const more = incomplete.length > 5 ? `\n...and ${incomplete.length - 5} more` : ''

    const message =
      `<b>${firstName}</b>, you still have ${incomplete.length} ritual${incomplete.length === 1 ? '' : 's'} scheduled for today.\n\n` +
      `${ritualList}${more}\n\n` +
      `${streakLine}` +
      'Open <b>LeakFixer Buddy</b> and check them off.'

    const sent = await sendTelegramMessage(user.telegramId, message)
    if (sent) {
      results.sent += 1
    } else {
      results.errors += 1
    }
  }

  return NextResponse.json({
    success: true,
    date: formatDateKey(today),
    ...results,
  })
}
