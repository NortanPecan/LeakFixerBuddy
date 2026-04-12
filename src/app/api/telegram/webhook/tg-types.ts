// ─── Telegram API Types ─────────────────────────────────────────────────────

export interface TelegramUser {
  id: number;
  first_name?: string;
  username?: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: { id: number; type: string };
  text?: string;
  reply_to_message?: { message_id: number };
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface InlineButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export type InlineKeyboard = InlineButton[][];

// ─── Pending Payload Types ──────────────────────────────────────────────────

export interface PendingForceReply {
  __type: "forceReply";
  action: "sleep" | "weight" | "mood" | "energy";
  botMessageId: number;
}

export interface PendingAiConfirm {
  __type: "aiConfirm";
  aiType: string;
  display: string;
  data: Record<string, unknown>;
  originalText: string;
}

export interface PendingGymSet {
  __type: "gymSet";
  exerciseId: string;
  exerciseName: string;
}

export interface PendingGymExercise {
  __type: "gymExercise";
  workoutId: string;
}

export interface PendingTrainer {
  __type: "trainerQuestion";
}

export interface PendingGymEditExercise {
  __type: "gymEditExercise";
  exerciseId: string;
  exerciseName: string;
}

export type PendingPayload =
  | PendingForceReply
  | PendingAiConfirm
  | PendingGymSet
  | PendingGymExercise
  | PendingTrainer
  | PendingGymEditExercise;

// ─── Other shared types ──────────────────────────────────────────────────────

export interface AiClassifyResult {
  type: string;
  data: Record<string, unknown>;
  display: string;
  confidence: number;
}

export interface ExerciseWithSets {
  name: string;
  targetSets: number;
  targetReps: number | null;
  weight: number | null;
  nextWeight: number | null;
  sets: { weight: number | null; reps: number | null; isWarmup: boolean; completed: boolean }[];
}

export interface FoodParseResult {
  name: string;
  calories: number | null;
  amount: string | null; // "70г", "2 куска", "300мл"
  protein: number | null; // actual grams for the portion
  fat: number | null;
  carbs: number | null;
  kcalPer100: number | null; // original kcal/100g value (for display)
}
