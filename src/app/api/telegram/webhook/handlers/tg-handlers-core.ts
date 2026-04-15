import { db } from "@/lib/db";
import { normalizeToDate } from "@/lib/date-utils";
import { analyzeLeakWithAI } from "@/lib/ai-analyze-leak";
import { formatLeakAnalysisForTelegram } from "@/lib/ai-leak-prompts";
import type { InlineKeyboard } from "../tg-types";
import { sendMessage, editMessageText, answerCallback, sendForceReply } from "../tg-sender";
import { buildMainMenuKeyboard, buildSettingsKeyboard, backBtn, TG_BUTTONS } from "../tg-keyboard";
import {
  storePending,
  getPendingForUserId,
  clearPendingForUserId,
  getHiddenTgButtons,
  toggleTgButton,
} from "../tg-pending";
import {
  WATER_RE,
  WEIGHT_RE,
  MOOD_RE,
  ENERGY_RE,
  FOOD_CMD_RE,
  GYM_RE,
  TASK_RE,
  RITUALS_RE,
  SLEEP_RE,
  SUMMARY_RE,
  INCOME_RE,
  EXPENSE_RE,
  MENU_RE,
  HELP_RE,
  LEAK_RE,
  ACHIEVEMENTS_RE,
  TRAINER_RE,
  WEEK_RE,
  CHALLENGES_RE,
  parseFoodEntry,
  parseNewExercise,
  classifyLeakFromText,
} from "../tg-parser";
import {
  getGymSummary,
  getWaterSummary,
  getFoodSummary,
  getRitualsSummary,
  getFinanceSummary,
  getTasksSummary,
  buildFullSummary,
  getLeaksSummary,
  getAchievementsSummary,
  getChallengesSummary,
} from "../tg-summaries";
import { runCoach } from "../tg-coach";
import { executeClassifiedAction, saveLearnedPattern } from "../tg-ai-classify";

// ─── Text command handler ──────────────────────────────────────────────────

export async function handleCommand(
  userId: string,
  text: string
): Promise<{ reply: string; keyboard?: InlineKeyboard }> {
  const t = text.trim();
  const today = normalizeToDate(new Date());

  // Menu / help → show keyboard
  if (MENU_RE.test(t) || HELP_RE.test(t)) {
    const hidden = await getHiddenTgButtons(userId);
    const keyboard = buildMainMenuKeyboard(hidden);
    const reply =
      "👋 <b>LeakFixer Buddy</b>\n\n" +
      "Выбери раздел кнопкой или напиши команду:\n\n" +
      "💧 <b>вода 500</b>  ⚖️ <b>вес 74.5</b>  😊 <b>настроение 8</b>\n" +
      "⚡ <b>энергия 7</b>  💪 <b>зал 60</b>  😴 <b>сон 8</b>\n" +
      "✅ <b>задача текст</b>  🙌 <b>ритуалы</b>  📊 <b>сводка</b>\n" +
      "💚 <b>доход 5000</b>  💸 <b>расход 500</b>\n\n" +
      "🍽️ <b>Еда:</b>\n" +
      "  <code>ел пицца 800</code> — 800 ккал\n" +
      "  <code>ел доширак 70 440</code> — 70г, 440/100г → 308 ккал\n" +
      "  <code>ел доширак 70 440 17 8 54</code> — + БЖУ\n\n" +
      "🤖 <b>лик описание</b> — AI-анализ лика\n" +
      "🏋️ <b>тренер вопрос</b> — персональный AI-коуч\n" +
      "💬 Пишешь свободно — AI поймёт и уточнит!";
    return { reply, keyboard };
  }

  // Water
  const waterMatch = t.match(WATER_RE);
  if (waterMatch) {
    const amount = parseFloat(waterMatch[1].replace(",", "."));
    if (isNaN(amount) || amount <= 0) return { reply: "❌ Укажи количество мл: <b>вода 500</b>" };

    let fd = await db.fitnessDaily.findFirst({ where: { userId, date: today } });
    const profile = !fd ? await db.userProfile.findUnique({ where: { userId } }) : null;
    const target = fd?.waterTarget ?? profile?.waterBaseline ?? 2000;
    const current = fd?.water ?? 0;

    if (!fd) {
      fd = await db.fitnessDaily.create({
        data: { userId, date: today, water: amount, waterTarget: target },
      });
    } else {
      fd = await db.fitnessDaily.update({
        where: { id: fd.id },
        data: { water: current + amount },
      });
    }

    const newAmt = fd.water;
    const pct = Math.round((newAmt / target) * 100);
    return {
      reply: `💧 +${amount} мл записано!\nСегодня: <b>${newAmt} / ${target} мл</b> (${pct}%)`,
    };
  }

  // Weight
  const weightMatch = t.match(WEIGHT_RE);
  if (weightMatch) {
    const value = parseFloat(weightMatch[1].replace(",", "."));
    if (isNaN(value) || value <= 0) return { reply: "❌ Укажи вес: <b>вес 74.5</b>" };
    await db.measurement.create({ data: { userId, type: "weight", value, unit: "kg" } });
    return { reply: `⚖️ Вес <b>${value} кг</b> записан!` };
  }

  // Mood
  const moodMatch = t.match(MOOD_RE);
  if (moodMatch) {
    const score = Math.round(parseFloat(moodMatch[1].replace(",", ".")));
    if (isNaN(score) || score < 1 || score > 10)
      return { reply: "❌ Настроение от 1 до 10: <b>настроение 7</b>" };
    await db.dailyState.upsert({
      where: { userId_date: { userId, date: today } },
      update: { mood: score },
      create: { userId, date: today, mood: score, energy: 5 },
    });
    const e = score >= 8 ? "😊" : score >= 5 ? "😐" : "😔";
    return { reply: `${e} Настроение <b>${score}/10</b> записано!` };
  }

  // Energy
  const energyMatch = t.match(ENERGY_RE);
  if (energyMatch) {
    const score = Math.round(parseFloat(energyMatch[1].replace(",", ".")));
    if (isNaN(score) || score < 1 || score > 10)
      return { reply: "❌ Энергия от 1 до 10: <b>энергия 7</b>" };
    await db.dailyState.upsert({
      where: { userId_date: { userId, date: today } },
      update: { energy: score },
      create: { userId, date: today, mood: 5, energy: score },
    });
    const e = score >= 8 ? "⚡" : score >= 5 ? "🔋" : "🪫";
    return { reply: `${e} Энергия <b>${score}/10</b> записана!` };
  }

  // Food (extended: weight + kcal/100g + БЖУ)
  if (FOOD_CMD_RE.test(t)) {
    const parsed = parseFoodEntry(t);
    if (!parsed) {
      return {
        reply:
          "❌ Не понял еду. Примеры:\n" +
          "<code>ел пицца 800</code> — 800 ккал\n" +
          "<code>ел доширак 70 440</code> — 70г, 440 ккал/100г → 308 ккал\n" +
          "<code>ел доширак 70 440 17 8 54</code> — + БЖУ на 100г\n" +
          "<code>ел молоко 300мл 64</code> — 300мл, 64/100мл → 192 ккал\n" +
          "<code>ел курица 2 куска 440</code> — 2 куска, 440 ккал",
      };
    }

    const foodEntry = await db.foodEntry.create({
      data: {
        userId,
        name: parsed.name,
        mealType: "snack",
        date: today,
        ...(parsed.calories !== null && { calories: parsed.calories }),
        ...(parsed.amount && { amount: parsed.amount }),
        ...(parsed.protein !== null && { protein: parsed.protein }),
        ...(parsed.fat !== null && { fat: parsed.fat }),
        ...(parsed.carbs !== null && { carbs: parsed.carbs }),
      },
    });

    // Build reply
    let reply = `🍽️ <b>${parsed.name}</b>`;
    if (parsed.amount) reply += ` (${parsed.amount})`;
    if (parsed.calories !== null) {
      reply += ` — <b>${parsed.calories} ккал</b>`;
      if (parsed.kcalPer100 !== null) reply += ` <i>(${parsed.kcalPer100}/100г)</i>`;
    }
    reply += " записано!";
    if (parsed.protein !== null || parsed.fat !== null || parsed.carbs !== null) {
      const bju: string[] = [];
      if (parsed.protein !== null) bju.push(`Б ${parsed.protein}г`);
      if (parsed.fat !== null) bju.push(`Ж ${parsed.fat}г`);
      if (parsed.carbs !== null) bju.push(`У ${parsed.carbs}г`);
      reply += `\n🥩 ${bju.join(" · ")}`;
    }
    reply += "\n\nКак это было?";
    const qualityKeyboard: InlineKeyboard = [
      [
        { text: "🟢 Здорово", callback_data: `food_q_${foodEntry.id}_good` },
        { text: "🟡 Нормально", callback_data: `food_q_${foodEntry.id}_neutral` },
        { text: "🔴 Срыв", callback_data: `food_q_${foodEntry.id}_bad` },
      ],
    ];
    return { reply, keyboard: qualityKeyboard };
  }

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

  // Task
  const taskMatch = t.match(TASK_RE);
  if (taskMatch) {
    const taskText = taskMatch[1].trim();
    if (!taskText) return { reply: "❌ Укажи текст задачи: <b>задача купить хлеб</b>" };
    await db.task.create({ data: { userId, text: taskText, status: "todo", date: today } });
    return { reply: `✅ Задача <b>${taskText}</b> добавлена!` };
  }

  // Rituals
  if (RITUALS_RE.test(t)) {
    const rituals = await db.ritual.findMany({
      where: { userId, status: "active" },
      select: { id: true },
    });
    if (rituals.length === 0) return { reply: "📋 Нет активных ритуалов. Добавь их в приложении." };
    let done = 0;
    for (const r of rituals) {
      try {
        await db.ritualCompletion.upsert({
          where: { ritualId_date: { ritualId: r.id, date: today } },
          update: { completed: true },
          create: { ritualId: r.id, userId, date: today, completed: true },
        });
        done++;
      } catch {
        /* skip */
      }
    }
    return { reply: `🙌 <b>${done} из ${rituals.length}</b> ритуалов выполнено!` };
  }

  // Sleep
  const sleepMatch = t.match(SLEEP_RE);
  if (sleepMatch) {
    const hours = parseFloat(sleepMatch[1].replace(",", "."));
    if (isNaN(hours) || hours <= 0 || hours > 24)
      return { reply: "❌ Укажи часы: <b>сон 8</b> или <b>сон 7.5</b>" };
    await db.dailyState.upsert({
      where: { userId_date: { userId, date: today } },
      update: { sleepHours: hours },
      create: { userId, date: today, mood: 5, energy: 5, sleepHours: hours },
    });
    const e = hours >= 8 ? "😴" : hours >= 6 ? "🛌" : "😵";
    return { reply: `${e} Сон <b>${hours} ч</b> записан!` };
  }

  // Income
  const incomeMatch = t.match(INCOME_RE);
  if (incomeMatch) {
    const amount = parseFloat(incomeMatch[1].replace(",", "."));
    const description = incomeMatch[2]?.trim() || null;
    if (isNaN(amount) || amount <= 0) return { reply: "❌ Укажи сумму: <b>доход 5000</b>" };
    const account = await db.account.findFirst({ where: { userId }, select: { id: true } });
    if (!account) return { reply: "❌ Нет счёта. Создай в приложении: Финансы → Счета." };
    await db.transaction.create({
      data: { userId, accountId: account.id, amount, description, date: today },
    });
    return {
      reply: `💚 Доход <b>+${amount}₽</b>${description ? ` (${description})` : ""} записан!`,
    };
  }

  // Expense
  const expenseMatch = t.match(EXPENSE_RE);
  if (expenseMatch) {
    const amount = parseFloat(expenseMatch[1].replace(",", "."));
    const description = expenseMatch[2]?.trim() || null;
    if (isNaN(amount) || amount <= 0) return { reply: "❌ Укажи сумму: <b>расход 500 кофе</b>" };
    const account = await db.account.findFirst({ where: { userId }, select: { id: true } });
    if (!account) return { reply: "❌ Нет счёта. Создай в приложении: Финансы → Счета." };
    await db.transaction.create({
      data: { userId, accountId: account.id, amount: -Math.abs(amount), description, date: today },
    });
    return {
      reply: `💸 Расход <b>−${amount}₽</b>${description ? ` (${description})` : ""} записан!`,
    };
  }

  // Summary
  if (SUMMARY_RE.test(t)) {
    const reply = await buildFullSummary(userId, today);
    return { reply, keyboard: backBtn() };
  }

  // Weekly digest on demand
  if (WEEK_RE.test(t)) {
    return { reply: "__WEEKLY_DIGEST__" };
  }

  // Лик — AI-анализ произвольной проблемы
  const leakMatch = t.match(LEAK_RE);
  if (leakMatch) {
    const userText = leakMatch[1].trim();
    if (!userText) {
      return {
        reply:
          "🔍 Напиши описание проблемы после команды:\n\n" +
          "<code>лик не могу встать на тренировку</code>\n" +
          "<code>лик снова срыв в питании</code>\n" +
          "<code>лик очень низкая энергия весь день</code>",
      };
    }

    const leakType = classifyLeakFromText(userText);

    try {
      // Прямой вызов функции — никаких self-referential HTTP запросов
      const { analysis, provider } = await analyzeLeakWithAI({
        userId,
        leakType,
        leakMessage: userText,
        severity: "warning",
        callType: "telegram-leak",
      });
      const reply = formatLeakAnalysisForTelegram(leakType, analysis, provider);
      return { reply, keyboard: backBtn() };
    } catch (err) {
      console.error("[Telegram /лик] AI error:", err);
      return {
        reply: "❌ AI-анализ не ответил. Попробуй чуть позже.",
      };
    }
  }

  // Achievements
  if (ACHIEVEMENTS_RE.test(t)) {
    const { text: achText, keyboard: achKeyboard } = await getAchievementsSummary(userId);
    return { reply: achText, keyboard: achKeyboard };
  }

  // Challenges
  if (CHALLENGES_RE.test(t)) {
    const { text: chText, keyboard: chKeyboard } = await getChallengesSummary(userId);
    return { reply: chText, keyboard: chKeyboard };
  }

  // AI Coach — /тренер [вопрос]
  const trainerMatch = t.match(TRAINER_RE);
  if (trainerMatch) {
    const question = trainerMatch[1]?.trim();
    if (!question) {
      return {
        reply:
          "🏋️ <b>AI Тренер</b>\n\nЗадай любой вопрос о своих данных:\n\n" +
          "<code>тренер почему у меня мало энергии?</code>\n" +
          "<code>тренер что делать с питанием?</code>\n" +
          "<code>тренер как улучшить сон?</code>",
      };
    }
    try {
      const answer = await runCoach(userId, question);
      return { reply: `🏋️ <b>AI Тренер</b>\n\n${answer}`, keyboard: backBtn() };
    } catch (err) {
      console.error("[TG /тренер]", err);
      return { reply: "❌ AI-тренер временно недоступен. Попробуй через минуту." };
    }
  }

  // Unknown — try AI classification
  return { reply: "__AI_CLASSIFY__" };
}

// ─── Callback query handler ────────────────────────────────────────────────

export async function handleCallback(
  cbQueryId: string,
  data: string,
  userId: string,
  chatId: number,
  messageId: number
): Promise<void> {
  const today = normalizeToDate(new Date());
  await answerCallback(cbQueryId);

  // Back to main menu
  if (data === "btn_menu") {
    const hidden = await getHiddenTgButtons(userId);
    const keyboard = buildMainMenuKeyboard(hidden);
    await editMessageText(
      chatId,
      messageId,
      "👋 <b>LeakFixer Buddy</b>\n\nВыбери раздел:",
      keyboard
    );
    return;
  }

  // Settings screen
  if (data === "btn_settings") {
    const hidden = await getHiddenTgButtons(userId);
    const keyboard = buildSettingsKeyboard(hidden);
    await editMessageText(
      chatId,
      messageId,
      "⚙️ <b>Настройки кнопок</b>\n\nНажми чтобы вкл/выкл:",
      keyboard
    );
    return;
  }

  // Toggle button visibility
  if (data.startsWith("toggle_tg_")) {
    const btnId = data.replace("toggle_tg_", "");
    const isNowVisible = await toggleTgButton(userId, btnId);
    const hidden = await getHiddenTgButtons(userId);
    const keyboard = buildSettingsKeyboard(hidden);
    const btn = TG_BUTTONS.find((b) => b.id === btnId);
    await answerCallback(
      cbQueryId,
      `${btn?.emoji ?? ""} ${btn?.label ?? btnId} ${isNowVisible ? "включено ✅" : "скрыто ❌"}`
    );
    await editMessageText(
      chatId,
      messageId,
      "⚙️ <b>Настройки кнопок</b>\n\nНажми чтобы вкл/выкл:",
      keyboard
    );
    return;
  }

  // Water quick-add buttons
  if (data.startsWith("water_add_")) {
    const amount = parseInt(data.replace("water_add_", ""), 10);
    let fd = await db.fitnessDaily.findFirst({ where: { userId, date: today } });
    const profile = !fd ? await db.userProfile.findUnique({ where: { userId } }) : null;
    const target = fd?.waterTarget ?? profile?.waterBaseline ?? 2000;
    const current = fd?.water ?? 0;

    if (!fd) {
      fd = await db.fitnessDaily.create({
        data: { userId, date: today, water: amount, waterTarget: target },
      });
    } else {
      fd = await db.fitnessDaily.update({
        where: { id: fd.id },
        data: { water: current + amount },
      });
    }
    const newAmt = fd.water;
    const pct = Math.min(100, Math.round((newAmt / target) * 100));
    const filled = Math.round(pct / 20);
    const bar = "🔵".repeat(filled) + "⚪".repeat(5 - filled);
    const text = `💧 <b>Вода сегодня</b>\n\n${newAmt} / ${target} мл (${pct}%)\n${bar}`;
    const keyboard: InlineKeyboard = [
      [
        { text: "+200 мл", callback_data: "water_add_200" },
        { text: "+350 мл", callback_data: "water_add_350" },
        { text: "+500 мл", callback_data: "water_add_500" },
      ],
      ...backBtn(),
    ];
    await editMessageText(chatId, messageId, text, keyboard);
    return;
  }

  // Mark rituals all done
  if (data === "rituals_done_all") {
    const rituals = await db.ritual.findMany({
      where: { userId, status: "active" },
      select: { id: true },
    });
    let done = 0;
    for (const r of rituals) {
      try {
        await db.ritualCompletion.upsert({
          where: { ritualId_date: { ritualId: r.id, date: today } },
          update: { completed: true },
          create: { ritualId: r.id, userId, date: today, completed: true },
        });
        done++;
      } catch {
        /* skip */
      }
    }
    const { text, keyboard } = await getRitualsSummary(userId, today);
    await answerCallback(cbQueryId, `🙌 ${done} ритуалов выполнено!`);
    await editMessageText(chatId, messageId, text, keyboard);
    return;
  }

  // Food quality rating
  if (data.startsWith("food_q_")) {
    const parts = data.split("_");
    // food_q_{uuid}_{quality} — uuid contains dashes so split from right
    const quality = parts[parts.length - 1];
    const entryId = parts.slice(2, parts.length - 1).join("_");
    const qualityLabel: Record<string, string> = {
      good: "🟢 Здорово",
      neutral: "🟡 Нормально",
      bad: "🔴 Срыв",
    };
    await db.foodEntry.update({ where: { id: entryId }, data: { quality } });
    await answerCallback(cbQueryId, qualityLabel[quality] ?? "Сохранено!");
    await editMessageText(
      chatId,
      messageId,
      `${qualityLabel[quality] ?? "✅"} Качество еды отмечено!`,
      backBtn()
    );
    return;
  }

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
    return;
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
      return;
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
    return;
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
      return;
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
    return;
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
      return;
    }
    const repsHint = exercise.targetReps ? `${exercise.targetReps} повт` : "8 повт";
    const botMsgId = await sendForceReply(
      chatId,
      `💪 <b>${exercise.name}</b>\n\nВведи вес × повторения:\n<code>75x8</code>  или  <code>75 8</code>  или  <code>75</code> (${repsHint})`
    );
    if (botMsgId) {
      await storePending(userId, { __type: "gymSet", exerciseId, exerciseName: exercise.name });
    }
    return;
  }

  // Quick-start challenge
  if (data.startsWith("challenge_start_")) {
    // format: challenge_start_{metric}_{target}_{duration}
    const parts = data.replace("challenge_start_", "").split("_");
    // metric may have underscore (e.g. gym_count, water_streak, ritual_rate)
    // last two parts are target and duration
    const duration = parseInt(parts[parts.length - 1]);
    const target = parseInt(parts[parts.length - 2]);
    const metric = parts.slice(0, parts.length - 2).join("_");

    const QUICK_NAMES: Record<string, string> = {
      gym_count: "💪 10 тренировок",
      water_streak: "💧 7 дней нормы воды",
      ritual_rate: "🔥 21 день ритуалов",
    };
    const name = QUICK_NAMES[metric] ?? metric;

    const activeCount = await db.challenge.count({ where: { userId, status: "active" } });
    if (activeCount >= 3) {
      await answerCallback(cbQueryId, "⚠️ Достигнут лимит 3 активных челленджа");
      return;
    }

    try {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + duration);
      await db.challenge.create({
        data: {
          userId,
          name,
          type: "tracker",
          category: "health",
          zone: "health",
          config: JSON.stringify({ metric, target }),
          duration,
          startDate: new Date(),
          endDate,
          status: "active",
        },
      });
      await answerCallback(cbQueryId, "✅ Челлендж создан!");
      await editMessageText(
        chatId,
        messageId,
        `🏆 <b>Челлендж начат!</b>\n\n<b>${name}</b>\n📅 ${duration} дней · Цель: ${target}`,
        backBtn()
      );
    } catch (err) {
      console.error("[challenge_start] error:", err);
      await answerCallback(cbQueryId, "❌ Не удалось создать");
    }
    return;
  }

  // AI confirm / reject
  if (data === "ai_confirm" || data === "ai_reject") {
    const pending = await getPendingForUserId(userId);
    await clearPendingForUserId(userId);
    if (data === "ai_reject" || !pending || pending.__type !== "aiConfirm") {
      await answerCallback(cbQueryId, "❌ Отменено");
      await editMessageText(
        chatId,
        messageId,
        "❌ Действие отменено.\n\nНапиши <b>помощь</b> чтобы увидеть команды.",
        backBtn()
      );
      return;
    }
    const { aiType, display, data: actionData, originalText } = pending;
    try {
      const confirmText = await executeClassifiedAction(userId, aiType, actionData, today);
      await saveLearnedPattern(userId, originalText, aiType, actionData, display);
      await answerCallback(cbQueryId, "✅ Сохранено!");
      await editMessageText(chatId, messageId, confirmText, backBtn());
    } catch (err) {
      console.error("[ai_confirm] error:", err);
      await answerCallback(cbQueryId, "❌ Ошибка сохранения");
    }
    return;
  }

  // Trainer button → ForceReply
  if (data === "btn_trainer") {
    await sendForceReply(
      chatId,
      "🏋️ <b>AI Тренер</b>\n\nЗадай любой вопрос о своих данных и прогрессе:"
    );
    await storePending(userId, { __type: "trainerQuestion" });
    return;
  }

  // ForceReply buttons — ask user to type value
  const forceReplyMap: Record<
    string,
    { action: "sleep" | "weight" | "mood" | "energy"; prompt: string }
  > = {
    btn_sleep: {
      action: "sleep",
      prompt: "😴 Сколько часов ты спал? Ответь числом (напр. <b>7.5</b>):",
    },
    btn_weight: { action: "weight", prompt: "⚖️ Введи текущий вес в кг (напр. <b>74.5</b>):" },
    btn_mood: { action: "mood", prompt: "😊 Оцени настроение от 1 до 10 (напр. <b>7</b>):" },
    btn_energy: { action: "energy", prompt: "⚡ Оцени энергию от 1 до 10 (напр. <b>7</b>):" },
  };
  if (data in forceReplyMap) {
    const { action, prompt } = forceReplyMap[data];
    const botMsgId = await sendForceReply(chatId, prompt);
    if (botMsgId) {
      await storePending(userId, { __type: "forceReply", action, botMessageId: botMsgId });
    }
    return;
  }

  // Module buttons → show summary (edit existing message)
  const moduleHandlers: Record<string, () => Promise<{ text: string; keyboard: InlineKeyboard }>> =
    {
      btn_gym: () => getGymSummary(userId, today),
      btn_water: () => getWaterSummary(userId, today),
      btn_food: () => getFoodSummary(userId, today),
      btn_rituals: () => getRitualsSummary(userId, today),
      btn_finance: () => getFinanceSummary(userId, today),
      btn_tasks: () => getTasksSummary(userId, today),
      btn_summary: async () => ({
        text: await buildFullSummary(userId, today),
        keyboard: backBtn(),
      }),
      btn_leaks: () => getLeaksSummary(userId),
      btn_achievements: () => getAchievementsSummary(userId),
      btn_challenges: () => getChallengesSummary(userId),
    };

  const handler = moduleHandlers[data];
  if (handler) {
    const { text, keyboard } = await handler();
    await editMessageText(chatId, messageId, text, keyboard);
    return;
  }
}

// ─── ForceReply message handler (called from route.ts POST) ──────────────────

export async function handleForceReply(
  userId: string,
  chatId: number,
  text: string
): Promise<boolean> {
  const pending = await getPendingForUserId(userId);
  const today = normalizeToDate(new Date());

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

  // Trainer question ForceReply
  if (pending && pending.__type === "trainerQuestion") {
    await clearPendingForUserId(userId);
    try {
      const answer = await runCoach(userId, text.trim());
      await sendMessage(chatId, `🏋️ <b>AI Тренер</b>\n\n${answer}`);
    } catch (err) {
      console.error("[TG trainer ForceReply]", err);
      await sendMessage(chatId, "❌ AI-тренер временно недоступен. Попробуй через минуту.");
    }
    return true;
  }

  // Gym set ForceReply
  if (pending && pending.__type === "gymSet") {
    await clearPendingForUserId(userId);
    const { exerciseId, exerciseName } = pending;
    // Parse: "75x8" / "75х8" / "75 8" / "75" (weight only)
    const setRe =
      /^(\d+(?:[.,]\d+)?)\s*[xхXХ×*]\s*(\d+)$|^(\d+(?:[.,]\d+)?)\s+(\d+)$|^(\d+(?:[.,]\d+)?)$/;
    const m = text.trim().match(setRe);
    if (!m) {
      await sendMessage(
        chatId,
        `❌ Не понял формат. Введи: <code>75x8</code> или <code>75 8</code>`
      );
      return true;
    }
    const weight = parseFloat((m[1] ?? m[3] ?? m[5]).replace(",", "."));
    const reps = m[2] ? parseInt(m[2]) : m[4] ? parseInt(m[4]) : null;
    if (isNaN(weight) || weight <= 0) {
      await sendMessage(chatId, `❌ Некорректный вес. Введи: <code>75x8</code>`);
      return true;
    }
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

  if (pending && pending.__type === "forceReply") {
    await clearPendingForUserId(userId);
    const val = text.trim().replace(",", ".");
    const num = parseFloat(val);
    let reply = "";
    switch (pending.action) {
      case "sleep":
        if (isNaN(num) || num <= 0 || num > 24) {
          reply = "❌ Укажи часы, например <b>7.5</b>";
          break;
        }
        await db.dailyState.upsert({
          where: { userId_date: { userId, date: today } },
          update: { sleepHours: num },
          create: { userId, date: today, mood: 5, energy: 5, sleepHours: num },
        });
        reply = `😴 Сон <b>${num} ч</b> записан!`;
        break;
      case "weight":
        if (isNaN(num) || num <= 0) {
          reply = "❌ Укажи вес в кг, например <b>74.5</b>";
          break;
        }
        await db.measurement.create({
          data: { userId, type: "weight", value: num, unit: "kg" },
        });
        reply = `⚖️ Вес <b>${num} кг</b> записан!`;
        break;
      case "mood": {
        const score = Math.round(num);
        if (isNaN(score) || score < 1 || score > 10) {
          reply = "❌ От 1 до 10, например <b>7</b>";
          break;
        }
        await db.dailyState.upsert({
          where: { userId_date: { userId, date: today } },
          update: { mood: score },
          create: { userId, date: today, mood: score, energy: 5 },
        });
        reply = `😊 Настроение <b>${score}/10</b> записано!`;
        break;
      }
      case "energy": {
        const score = Math.round(num);
        if (isNaN(score) || score < 1 || score > 10) {
          reply = "❌ От 1 до 10, например <b>7</b>";
          break;
        }
        await db.dailyState.upsert({
          where: { userId_date: { userId, date: today } },
          update: { energy: score },
          create: { userId, date: today, mood: 5, energy: score },
        });
        reply = `⚡ Энергия <b>${score}/10</b> записана!`;
        break;
      }
    }
    if (reply) {
      await sendMessage(chatId, reply);
      return true;
    }
  }

  return false; // no pending matched
}
