import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateWeeklyDigest } from "@/lib/ai-weekly-digest";
import type { TelegramUpdate } from "./tg-types";
import { BOT_TOKEN, sendMessage, answerCallback } from "./tg-sender";
import { storePending } from "./tg-pending";
import { handleCommand, handleCallback, handleForceReply } from "./tg-handlers";
import { classifyUnknownInput } from "./tg-ai-classify";

const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  if (WEBHOOK_SECRET) {
    const secretHeader = request.headers.get("x-telegram-bot-api-secret-token");
    if (secretHeader !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // ── Callback query (button press) ──────────────────────────────────────────
  if (update.callback_query) {
    const cb = update.callback_query;
    if (!cb.data || !cb.message) return NextResponse.json({ ok: true });

    let telegramId: bigint;
    try {
      telegramId = BigInt(cb.from.id);
    } catch {
      return NextResponse.json({ ok: true });
    }

    const user = await db.appUser.findUnique({ where: { telegramId }, select: { id: true } });
    if (!user) {
      await answerCallback(cb.id, "👋 Войди в приложение чтобы привязать аккаунт");
      return NextResponse.json({ ok: true });
    }

    try {
      await handleCallback(cb.id, cb.data, user.id, cb.message.chat.id, cb.message.message_id);
    } catch (err) {
      console.error("[Telegram webhook] callback error:", err);
      await answerCallback(cb.id, "❌ Ошибка, попробуй ещё раз");
    }
    return NextResponse.json({ ok: true });
  }

  // ── Text message ────────────────────────────────────────────────────────────
  const message = update.message;
  if (!message?.text || !message.from) return NextResponse.json({ ok: true });

  let telegramId: bigint;
  try {
    telegramId = BigInt(message.from.id);
  } catch {
    return NextResponse.json({ ok: true });
  }

  const chatId = message.chat.id;
  const text = message.text.trim();

  const user = await db.appUser.findUnique({
    where: { telegramId },
    select: { id: true, telegramFirstName: true },
  });

  if (!user) {
    await sendMessage(
      chatId,
      "👋 Привет! Сначала войди в <b>LeakFixer Buddy</b> через Telegram, чтобы привязать аккаунт."
    );
    return NextResponse.json({ ok: true });
  }

  // ── Dedup: Telegram retries the webhook if we don't respond in <5s.
  //    AI calls can take 5-15s, causing the bot to send the same question
  //    multiple times. We store processed update_ids in Notes to detect retries.
  const dedupKey = `tg_upd_${update.update_id}`;
  const alreadyProcessed = await db.note.findFirst({
    where: { userId: user.id, zone: "__tg_dedup", text: dedupKey },
  });
  if (alreadyProcessed) return NextResponse.json({ ok: true });

  // Mark update as being processed (best-effort, cleans up all old dedup notes)
  await db.note.deleteMany({ where: { userId: user.id, zone: "__tg_dedup" } }).catch(() => {});
  await db.note
    .create({
      data: {
        userId: user.id,
        zone: "__tg_dedup",
        text: dedupKey,
        type: "thought",
        date: new Date(),
      },
    })
    .catch(() => {});

  try {
    // ── Check if this is a reply to a ForceReply prompt ─────────────────────
    if (message.reply_to_message) {
      const handled = await handleForceReply(user.id, chatId, text);
      if (handled) return NextResponse.json({ ok: true });
    }

    const { reply, keyboard } = await handleCommand(user.id, text);

    // ── Weekly digest on demand ─────────────────────────────────────────────
    if (reply === "__WEEKLY_DIGEST__") {
      const firstName = user.telegramFirstName || "друг";
      try {
        const digest = await generateWeeklyDigest(user.id, firstName);
        if (digest) {
          await sendMessage(
            chatId,
            `📊 <b>AI-резюме недели, ${firstName}!</b>\n\n${digest}\n\n<i>Открой LeakFixer Buddy, чтобы увидеть полный отчёт.</i>`
          );
        } else {
          await sendMessage(
            chatId,
            "📊 Пока мало данных для резюме. Возвращайся после нескольких дней использования!"
          );
        }
      } catch (err) {
        console.error("[TG /неделя]", err);
        await sendMessage(chatId, "❌ AI-резюме временно недоступно. Попробуй позже.");
      }
      return NextResponse.json({ ok: true });
    }

    // ── AI classification for unknown messages ──────────────────────────────
    if (reply === "__AI_CLASSIFY__") {
      const classified = await classifyUnknownInput(text, user.id).catch(() => null);
      if (classified && classified.type !== "unknown") {
        await storePending(user.id, {
          __type: "aiConfirm",
          aiType: classified.type,
          display: classified.display,
          data: classified.data,
          originalText: text,
        });
        await sendMessage(
          chatId,
          `🤖 Похоже, ты хочешь записать:\n\n<b>${classified.display}</b>\n\nВсё верно?`,
          [
            [
              { text: "✅ Да, записать", callback_data: "ai_confirm" },
              { text: "❌ Нет", callback_data: "ai_reject" },
            ],
          ]
        );
      } else {
        await sendMessage(
          chatId,
          "🤔 Не понял команду. Напиши <b>помощь</b> или нажми кнопку.\n\nПримеры: <code>вода 500</code>, <code>вес 74.5</code>, <code>настроение 8</code>\n🍽️ <code>ел пицца 800</code>, <code>яблоко 300 ккал</code>\n💡 <code>лик описание проблемы</code> — AI-анализ лика"
        );
      }
      return NextResponse.json({ ok: true });
    }

    await sendMessage(chatId, reply, keyboard);
  } catch (err) {
    console.error("[Telegram webhook] command error:", err);
    await sendMessage(chatId, "❌ Произошла ошибка при сохранении. Попробуй ещё раз.");
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    description: "LeakFixer Buddy Telegram webhook",
    configured: !!BOT_TOKEN,
  });
}
