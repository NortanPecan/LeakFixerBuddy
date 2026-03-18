/**
 * GET /api/telegram/send-weekly-digest
 *
 * Cron endpoint: every Monday at 07:00 UTC (10:00 MSK).
 * Generates a weekly AI digest for each active user and sends it to Telegram.
 * Protected by CRON_SECRET (Authorization: Bearer).
 * Both GET and POST are supported (Vercel Cron uses GET).
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateWeeklyDigest } from '@/lib/ai-weekly-digest'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const CRON_SECRET = process.env.CRON_SECRET

// ─── Telegram helper ──────────────────────────────────────────────────────────

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
    const data = (await res.json()) as { ok: boolean }
    return data.ok === true
  } catch {
    return false
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

async function handleRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!BOT_TOKEN) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN not configured' }, { status: 500 })
  }

  // Find active users with Telegram connected and checkin reminders enabled
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const usersWithSettings = await db.userSettings.findMany({
    where: { checkinReminders: true },
    select: {
      userId: true,
      user: {
        select: {
          telegramId: true,
          telegramFirstName: true,
          updatedAt: true,
        },
      },
    },
  })

  // Filter to users who have been active in the last 7 days
  const activeUsers = usersWithSettings.filter(
    s => s.user?.telegramId && s.user.updatedAt >= sevenDaysAgo
  )

  const results = {
    total: activeUsers.length,
    sent: 0,
    skipped: 0,
    errors: 0,
  }

  for (const settings of activeUsers) {
    const { user } = settings
    if (!user?.telegramId) {
      results.skipped++
      continue
    }

    const firstName = user.telegramFirstName || 'друг'

    try {
      const digest = await generateWeeklyDigest(settings.userId, firstName)
      if (!digest) {
        results.skipped++
        continue
      }

      const message =
        `📊 <b>AI-резюме недели, ${firstName}!</b>\n\n` +
        `${digest}\n\n` +
        `<i>Открой LeakFixer Buddy, чтобы увидеть полный отчёт.</i>`

      const sent = await sendTelegramMessage(user.telegramId, message)
      if (sent) {
        results.sent++
      } else {
        results.errors++
      }

      // Small delay to avoid Telegram rate limiting (30 msg/sec global)
      await new Promise(r => setTimeout(r, 100))
    } catch (err) {
      console.error(`[weekly-digest] Failed for user ${settings.userId}:`, err)
      results.errors++
    }
  }

  return NextResponse.json({
    success: true,
    date: new Date().toISOString().split('T')[0],
    ...results,
  })
}

export async function GET(request: NextRequest) {
  return handleRequest(request)
}

export async function POST(request: NextRequest) {
  return handleRequest(request)
}
