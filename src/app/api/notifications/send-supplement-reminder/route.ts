import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { formatDateKey, normalizeToDate } from "@/lib/date-utils";
import { isScheduledDay, parseScheduleDays } from "@/lib/streak-utils";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CRON_SECRET = process.env.CRON_SECRET;

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

export async function GET(request: NextRequest) {
  return handleReminder(request);
}

export async function POST(request: NextRequest) {
  return handleReminder(request);
}

async function handleReminder(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!BOT_TOKEN) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not configured" }, { status: 500 });
  }

  const today = normalizeToDate(new Date());

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
  });

  const results = {
    total: usersWithSettings.length,
    sent: 0,
    skipped: 0,
    errors: 0,
  };

  for (const settings of usersWithSettings) {
    const { user } = settings;
    if (!user?.telegramId) {
      results.skipped += 1;
      continue;
    }

    const supplements = await db.supplement.findMany({
      where: { userId: settings.userId, isActive: true },
      include: {
        intakes: {
          where: { date: today },
        },
      },
    });

    const todaySupplements = supplements.filter((supplement) =>
      isScheduledDay(today, parseScheduleDays(supplement.days))
    );

    const unchecked = todaySupplements.filter(
      (supplement) => !supplement.intakes.some((intake) => intake.checked)
    );

    if (unchecked.length === 0) {
      results.skipped += 1;
      continue;
    }

    const firstName = user.telegramFirstName || "friend";
    const supplementList = unchecked
      .slice(0, 5)
      .map((supplement) => {
        const dosage = supplement.dosage ? ` (${supplement.dosage} ${supplement.unit})` : "";
        return `• ${supplement.name}${dosage}`;
      })
      .join("\n");
    const more = unchecked.length > 5 ? `\n...and ${unchecked.length - 5} more` : "";

    const message =
      `<b>${firstName}</b>, you still have ${unchecked.length} supplement${unchecked.length === 1 ? "" : "s"} to log today.\n\n` +
      `${supplementList}${more}\n\n` +
      "Open <b>LeakFixer Buddy</b> and mark them as taken.";

    const sent = await sendTelegramMessage(user.telegramId, message);
    if (sent) {
      results.sent += 1;
    } else {
      results.errors += 1;
    }
  }

  return NextResponse.json({
    success: true,
    date: formatDateKey(today),
    ...results,
  });
}
