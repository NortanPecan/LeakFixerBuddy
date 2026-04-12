import type { InlineKeyboard } from "./tg-types";

export const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function sendMessage(
  chatId: number,
  text: string,
  keyboard?: InlineKeyboard
): Promise<void> {
  if (!BOT_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        ...(keyboard && { reply_markup: { inline_keyboard: keyboard } }),
      }),
    });
  } catch {
    /* best-effort */
  }
}

export async function editMessageText(
  chatId: number,
  messageId: number,
  text: string,
  keyboard?: InlineKeyboard
): Promise<void> {
  if (!BOT_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: "HTML",
        ...(keyboard && { reply_markup: { inline_keyboard: keyboard } }),
      }),
    });
  } catch {
    /* best-effort */
  }
}

export async function answerCallback(callbackQueryId: string, text?: string): Promise<void> {
  if (!BOT_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: false }),
    });
  } catch {
    /* best-effort */
  }
}

// Returns the new message_id so we can store it as pending
export async function sendForceReply(chatId: number, text: string): Promise<number | null> {
  if (!BOT_TOKEN) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        reply_markup: { force_reply: true, selective: true },
      }),
    });
    const data = await res.json();
    return data.ok ? (data.result?.message_id ?? null) : null;
  } catch {
    return null;
  }
}
