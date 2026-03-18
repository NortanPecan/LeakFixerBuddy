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
  const dayOfWeek = getDayOfWeek(today)

  const usersWithSettings = await db.userSettings.findMany({
    where: { supplementReminders: true },
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

    // Get active supplements for today's day of week
    const supplements = await db.supplement.findMany({
      where: { userId: settings.userId, isActive: true },
      include: {
        intakes: {
          where: { date: today },
        },
      },
    })

    // Filter by day of week schedule
    const todaySupplements = supplements.filter(s => {
      try {
        const days = JSON.parse(s.days as string) as number[]
        return days.includes(dayOfWeek) || days.length === 0
      } catch {
        return true
      }
    })

    const unchecked = todaySupplements.filter(s => !s.intakes.some(i => i.checked))

    if (unchecked.length === 0) {
      results.skipped++
      continue
    }

    const firstName = user.telegramFirstName || 'друг'
    const suppList = unchecked
      .slice(0, 5)
      .map(s => {
        const dosage = s.dosage ? ` (${s.dosage} ${s.unit})` : ''
        return `• ${s.name}${dosage}`
      })
      .join('\n')
    const more = unchecked.length > 5 ? `\n...и ещё ${unchecked.length - 5}` : ''

    const message =
      `💊 <b>${firstName}</b>, не забудь принять ${unchecked.length} добавк${unchecked.length === 1 ? 'у' : unchecked.length < 5 ? 'и' : ''} сегодня:\n\n` +
      `${suppList}${more}\n\n` +
      `📱 Открой <b>LeakFixer Buddy</b> и отметь принятые.`

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
