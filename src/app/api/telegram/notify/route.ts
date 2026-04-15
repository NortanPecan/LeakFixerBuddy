import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizeToDate } from "@/lib/date-utils";
import { callAI } from "@/lib/ai-provider";
import { requireCronSecret } from "@/lib/cron-auth";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendTelegramMessage(chatId: bigint, text: string): Promise<boolean> {
  if (!BOT_TOKEN) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId.toString(),
        text,
        parse_mode: "HTML",
      }),
    });
    const data = await res.json();
    return data.ok === true;
  } catch {
    return false;
  }
}

interface UserStats {
  streak: number;
  morningEnergy: number | null;
  ritualsDone: number;
  ritualsTotal: number;
  dailyTip?: string | null;
}

function buildMorningMessage(firstName: string, stats: UserStats): string {
  const streakLine =
    stats.streak > 0 ? `🔥 Стрик: <b>${stats.streak} дней</b> — не прерывай!\n` : "";
  const motiveLine =
    stats.streak >= 30
      ? "💎 Ты легенда — 30+ дней подряд!"
      : stats.streak >= 14
        ? "🏆 Две недели без пропусков — отлично!"
        : stats.streak >= 7
          ? "⚡ Неделя позади — продолжай в том же духе!"
          : "";

  return (
    `☀️ Доброе утро, <b>${firstName}</b>!\n\n` +
    `${streakLine}` +
    (motiveLine ? `${motiveLine}\n\n` : "\n") +
    `Не забудь сделать <b>утренний чек-ин</b> — поставь энергию, выбери фокус и задачи на день.\n\n` +
    `🚀 Открой <b>LeakFixer Buddy</b> и начни день осознанно!` +
    (stats.dailyTip ? `\n\n💡 <i>${stats.dailyTip}</i>` : "")
  );
}

function buildEveningMessage(firstName: string, stats: UserStats): string {
  const energyLine =
    stats.morningEnergy !== null
      ? `⚡ Утренняя энергия была: <b>${stats.morningEnergy}/10</b>\n`
      : "";
  const ritualsLine =
    stats.ritualsTotal > 0
      ? `🔥 Ритуалы: <b>${stats.ritualsDone}/${stats.ritualsTotal}</b> выполнено сегодня\n`
      : "";

  return (
    `🌙 Добрый вечер, <b>${firstName}</b>!\n\n` +
    `${energyLine}` +
    `${ritualsLine}` +
    `\nЗакрой день — сделай <b>вечерний чек-ин</b>: оцени день, отметь задачи, запиши победу.\n\n` +
    `✨ Открой <b>LeakFixer Buddy</b> и подведи итоги!`
  );
}

// GET — cron-compatible (Vercel Cron)
// POST — manual trigger with optional { userId, type } body
export async function GET(request: NextRequest) {
  return handleNotify(request, null);
}

export async function POST(request: NextRequest) {
  let body: { userId?: string; type?: string } = {};
  try {
    body = await request.json();
  } catch {
    // empty body is ok
  }
  return handleNotify(request, body);
}

async function handleNotify(request: NextRequest, body: { userId?: string; type?: string } | null) {
  // Secret check for cron calls
  const cronAuthError = requireCronSecret(request);
  if (cronAuthError) return cronAuthError;

  if (!BOT_TOKEN) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not configured" }, { status: 500 });
  }

  // Determine type from body or query param
  const { searchParams } = new URL(request.url);
  const type = (body?.type ?? searchParams.get("type") ?? "morning") as "morning" | "evening";

  if (type !== "morning" && type !== "evening") {
    return NextResponse.json({ error: 'type must be "morning" or "evening"' }, { status: 400 });
  }

  const today = normalizeToDate(new Date());

  // Build user query — optionally filter by specific userId
  const userWhere = body?.userId
    ? { userId: body.userId, checkinReminders: true }
    : { checkinReminders: true };

  const usersWithSettings = await db.userSettings.findMany({
    where: userWhere,
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
  });

  const results = {
    type,
    total: usersWithSettings.length,
    sent: 0,
    skipped: 0,
    errors: 0,
  };

  for (const settings of usersWithSettings) {
    const { user } = settings;
    if (!user?.telegramId) {
      results.skipped++;
      continue;
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
    });

    if (existing) {
      results.skipped++;
      continue;
    }

    const firstName = user.telegramFirstName || "друг";

    // Fetch lightweight stats for personalization
    let morningEnergy: number | null = null;
    let ritualsDone = 0;
    let ritualsTotal = 0;
    try {
      const [morningCheckin, ritualCompletions, activeRituals] = await Promise.all([
        db.dailyCheckin.findFirst({
          where: { userId: settings.userId, date: today, type: "morning" },
          select: { energy: true },
        }),
        db.ritualCompletion.count({
          where: { userId: settings.userId, date: today, completed: true },
        }),
        db.ritual.count({ where: { userId: settings.userId, status: "active" } }),
      ]);
      morningEnergy = morningCheckin?.energy ?? null;
      ritualsDone = ritualCompletions;
      ritualsTotal = activeRituals;
    } catch {
      // best-effort
    }

    // Generate daily tip for morning notifications
    let dailyTip: string | null = null;
    if (type === "morning") {
      try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        // Check cache first
        const cachedLog = await db.aiLog.findFirst({
          where: {
            userId: settings.userId,
            callType: "daily_tip",
            success: true,
            createdAt: { gte: todayStart },
          },
          select: { response: true },
        });
        if (cachedLog) {
          dailyTip = cachedLog.response;
        } else {
          const DAILY_TIP_SYSTEM = `Ты персональный коуч по саморазвитию. Пишешь на русском языке.
Напиши короткий персонализированный совет на сегодня (1-2 предложения).
Совет конкретный и actionable. Без заголовков и bullet points.`;
          const userCtx = `Пользователь ${firstName}, стрик ${user.streak ?? 0} дней.`;
          const result = await callAI(DAILY_TIP_SYSTEM, userCtx, {
            userId: settings.userId,
            callType: "daily_tip",
          });
          dailyTip = result.text;
        }
      } catch {
        // non-critical, skip tip
      }
    }

    const stats: UserStats = {
      streak: user.streak ?? 0,
      morningEnergy,
      ritualsDone,
      ritualsTotal,
      dailyTip,
    };

    const message =
      type === "morning"
        ? buildMorningMessage(firstName, stats)
        : buildEveningMessage(firstName, stats);

    const sent = await sendTelegramMessage(user.telegramId, message);
    if (sent) {
      results.sent++;
    } else {
      results.errors++;
    }
  }

  return NextResponse.json({
    success: true,
    date: today.toISOString().split("T")[0],
    ...results,
  });
}
