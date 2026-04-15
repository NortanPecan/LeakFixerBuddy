import type { InlineKeyboard, PendingPayload } from "../tg-types";

export interface TelegramCommandResult {
  reply: string;
  keyboard?: InlineKeyboard;
}

export interface TelegramCallbackContext {
  cbQueryId: string;
  data: string;
  chatId: number;
  messageId: number;
}

export interface TelegramGymCallbackContext extends TelegramCallbackContext {
  userId: string;
  today: Date;
}

export interface TelegramGymForceReplyContext {
  userId: string;
  chatId: number;
  text: string;
  pending: PendingPayload | null;
}
