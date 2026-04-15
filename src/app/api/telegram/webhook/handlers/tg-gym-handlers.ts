import { db } from "@/lib/db";
import { answerCallback, editMessageText, sendForceReply, sendMessage } from "../tg-sender";
import { storePending, clearPendingForUserId } from "../tg-pending";
import { GYM_RE, parseNewExercise } from "../tg-parser";
import { getGymSummary } from "../tg-summaries";
import type {
  TelegramCommandResult,
  TelegramGymCallbackContext,
  TelegramGymForceReplyContext,
} from "./tg-handler-results";

interface ParsedGymSetInput {
  weight: number;
  reps: number | null;
}

function parsePositiveDecimalToken(token: string): number | null {
  const normalized = token.trim().replace(",", ".");
  if (!normalized) return null;

  let dotCount = 0;
  for (const char of normalized) {
    if (char === ".") {
      dotCount += 1;
      if (dotCount > 1) return null;
      continue;
    }
    if (char < "0" || char > "9") return null;
  }

  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function parsePositiveIntegerToken(token: string): number | null {
  const normalized = token.trim();
  if (!normalized) return null;

  for (const char of normalized) {
    if (char < "0" || char > "9") return null;
  }

  const value = Number(normalized);
  return Number.isInteger(value) && value > 0 ? value : null;
}

function splitGymSetInput(input: string): [string, string | null] | null {
  const compact = input.trim();
  if (!compact) return null;

  for (const separator of ["x", "х", "X", "Х", "×", "*"]) {
    const parts = compact.split(separator);
    if (parts.length === 2) return [parts[0], parts[1]];
    if (parts.length > 2) return null;
  }

  const spacedParts = compact.split(" ").filter(Boolean);
  if (spacedParts.length === 1) return [spacedParts[0], null];
  if (spacedParts.length === 2) return [spacedParts[0], spacedParts[1]];

  return null;
}

function parseGymSetInput(input: string): ParsedGymSetInput | null {
  const parts = splitGymSetInput(input);
  if (!parts) return null;

  const [weightToken, repsToken] = parts;
  const weight = parsePositiveDecimalToken(weightToken);
  if (weight === null) return null;

  if (repsToken === null) {
    return { weight, reps: null };
  }

  const reps = parsePositiveIntegerToken(repsToken);
  return reps === null ? null : { weight, reps };
}

export async function handleGymCommand(
  userId: string,
  t: string,
  today: Date
): Promise<TelegramCommandResult | null> {
  // Gym
  const gymMatch = t.match(GYM_RE);
  if (gymMatch) {
    const duration = gymMatch[1] ? Math.round(parseFloat(gymMatch[1].replace(",", "."))) : null;
    const period = await db.gymPeriod.findFirst({
      where: { userId, isActive: true },
      include: { workouts: { orderBy: { date: "asc" } } },
    });
    if (period) {
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);
      const todayWorkout = period.workouts.find(
        (w) => w.date >= startOfDay && w.date <= endOfDay && w.status !== "completed"
      );
      if (todayWorkout) {
        await db.gymWorkout.update({
          where: { id: todayWorkout.id },
          data: { status: "completed", completed: true, ...(duration && { duration }) },
        });
        const durText = duration ? ` (${duration} мин)` : "";
        return {
          reply: `💪 Тренировка «${todayWorkout.name || "Тренировка"}»${durText} выполнена!`,
        };
      }
    }
    const durText = duration ? ` ${duration} мин` : "";
    await db.note.create({
      data: {
        userId,
        text: `Тренировка${durText} — быстрая запись через Telegram`,
        type: "thought",
        date: new Date(),
      },
    });
    return {
      reply: duration
        ? `💪 Тренировка <b>${duration} мин</b> записана!`
        : "💪 Тренировка записана!",
    };
  }

  return null;
}

export async function handleGymCallback({
  cbQueryId,
  data,
  userId,
  chatId,
  messageId,
  today,
}: TelegramGymCallbackContext): Promise<boolean> {
  // Mark gym workout complete
  if (data.startsWith("gym_done_")) {
    const workoutId = data.replace("gym_done_", "");
    await db.gymWorkout.update({
      where: { id: workoutId },
      data: { status: "completed", completed: true },
    });
    await answerCallback(cbQueryId, "✅ Тренировка выполнена!");
    const { text, keyboard } = await getGymSummary(userId, today);
    await editMessageText(chatId, messageId, text, keyboard);
    return true;
  }

  // Add new exercise to workout via ForceReply
  if (data.startsWith("gym_addex_")) {
    const workoutId = data.replace("gym_addex_", "");
    const workout = await db.gymWorkout.findUnique({
      where: { id: workoutId },
      select: { name: true },
    });
    if (!workout) {
      await answerCallback(cbQueryId, "❌ Тренировка не найдена");
      return true;
    }
    await sendForceReply(
      chatId,
      "💪 <b>Новое упражнение</b>\n\nВведи в формате:\n" +
        "<code>Жим 4x12 75кг</code> — подходы × повт × вес\n" +
        "<code>Жим 4x12</code> — без веса\n" +
        "<code>Жим 75кг</code> — только вес\n" +
        "<code>Жим</code> — только название"
    );
    await storePending(userId, { __type: "gymExercise", workoutId });
    return true;
  }

  // Edit existing exercise via ForceReply
  if (data.startsWith("gym_editex_")) {
    const exerciseId = data.replace("gym_editex_", "");
    const exercise = await db.gymExercise.findUnique({
      where: { id: exerciseId },
      select: { name: true, targetSets: true, targetReps: true, weight: true },
    });
    if (!exercise) {
      await answerCallback(cbQueryId, "❌ Упражнение не найдено");
      return true;
    }
    const currentStr = `${exercise.targetSets}×${exercise.targetReps ?? "?"}${exercise.weight ? ` · ${exercise.weight}кг` : ""}`;
    await sendForceReply(
      chatId,
      `✏️ <b>${exercise.name}</b>\n\nВведи новую схему:\n` +
        `<code>4x10 80кг</code> — подходы × повт × вес\n` +
        `<code>4x10</code> — только схема\n` +
        `<code>80кг</code> — только вес\n\n` +
        `Сейчас: ${currentStr}`
    );
    await storePending(userId, {
      __type: "gymEditExercise",
      exerciseId,
      exerciseName: exercise.name,
    });
    return true;
  }

  // Add set to exercise via ForceReply
  if (data.startsWith("gym_addset_")) {
    const exerciseId = data.replace("gym_addset_", "");
    const exercise = await db.gymExercise.findUnique({
      where: { id: exerciseId },
      select: { name: true, targetReps: true },
    });
    if (!exercise) {
      await answerCallback(cbQueryId, "❌ Упражнение не найдено");
      return true;
    }
    const repsHint = exercise.targetReps ? `${exercise.targetReps} повт` : "8 повт";
    const botMsgId = await sendForceReply(
      chatId,
      `💪 <b>${exercise.name}</b>\n\nВведи вес × повторения:\n<code>75x8</code>  или  <code>75 8</code>  или  <code>75</code> (${repsHint})`
    );
    if (botMsgId) {
      await storePending(userId, { __type: "gymSet", exerciseId, exerciseName: exercise.name });
    }
    return true;
  }

  return false;
}

export async function handleGymForceReply({
  userId,
  chatId,
  text,
  pending,
}: TelegramGymForceReplyContext): Promise<boolean> {
  // Edit exercise ForceReply
  if (pending && pending.__type === "gymEditExercise") {
    await clearPendingForUserId(userId);
    const parsed = parseNewExercise(text.trim());
    if (!parsed || (parsed.targetSets === null && parsed.weight === null)) {
      await sendMessage(
        chatId,
        "❌ Не понял. Введи схему: <code>4x10</code> или <code>80кг</code> или <code>4x10 80кг</code>"
      );
      return true;
    }
    const updateData: Record<string, number | null> = {};
    if (parsed.targetSets !== null) updateData.targetSets = parsed.targetSets;
    if (parsed.targetReps !== null) updateData.targetReps = parsed.targetReps;
    if (parsed.weight !== null) updateData.weight = parsed.weight;
    await db.gymExercise.update({ where: { id: pending.exerciseId }, data: updateData });
    let reply = `✏️ <b>${pending.exerciseName}</b> обновлено!`;
    if (parsed.targetSets && parsed.targetReps)
      reply += `\n📋 Схема: ${parsed.targetSets}×${parsed.targetReps}`;
    if (parsed.weight !== null) reply += `\n⚖️ Вес: ${parsed.weight} кг`;
    await sendMessage(chatId, reply);
    return true;
  }

  // Gym exercise ForceReply
  if (pending && pending.__type === "gymExercise") {
    await clearPendingForUserId(userId);
    const parsed = parseNewExercise(text.trim());
    if (!parsed) {
      await sendMessage(chatId, "❌ Не понял формат. Попробуй: <code>Жим 4x12 75кг</code>");
      return true;
    }
    const exerciseCount = await db.gymExercise.count({
      where: { workoutId: pending.workoutId },
    });
    const exercise = await db.gymExercise.create({
      data: {
        workoutId: pending.workoutId,
        name: parsed.name,
        order: exerciseCount + 1,
        targetSets: parsed.targetSets ?? 4,
        ...(parsed.targetReps !== null && { targetReps: parsed.targetReps }),
        ...(parsed.weight !== null && { weight: parsed.weight }),
      },
    });
    let reply = `💪 <b>${parsed.name}</b> добавлено в тренировку!`;
    if (parsed.targetSets && parsed.targetReps)
      reply += `\n📋 Схема: ${parsed.targetSets}×${parsed.targetReps}`;
    if (parsed.weight !== null) {
      reply += `\n⚖️ Вес: ${parsed.weight} кг`;
      await db.gymExerciseSet.create({
        data: {
          exerciseId: exercise.id,
          setNum: 1,
          weight: parsed.weight,
          ...(parsed.targetReps !== null && { reps: parsed.targetReps }),
          isWarmup: false,
          completed: true,
        },
      });
      reply += "\n✅ Первый сет записан";
    }
    await sendMessage(chatId, reply);
    return true;
  }

  // Gym set ForceReply
  if (pending && pending.__type === "gymSet") {
    await clearPendingForUserId(userId);
    const { exerciseId, exerciseName } = pending;
    const parsedSet = parseGymSetInput(text);
    if (!parsedSet) {
      await sendMessage(
        chatId,
        `❌ Не понял формат. Введи: <code>75x8</code> или <code>75 8</code>`
      );
      return true;
    }
    const { weight, reps } = parsedSet;
    // Count existing sets to get setNum
    const existingSets = await db.gymExerciseSet.count({ where: { exerciseId } });
    await db.gymExerciseSet.create({
      data: {
        exerciseId,
        setNum: existingSets + 1,
        weight,
        ...(reps !== null && { reps }),
        isWarmup: false,
        completed: true,
      },
    });
    const repsStr = reps !== null ? `×${reps}` : "";
    await sendMessage(
      chatId,
      `💪 <b>${exerciseName}</b>\nСет ${existingSets + 1}: <b>${weight}кг${repsStr}</b> записан! ✅`
    );
    return true;
  }

  return false;
}
