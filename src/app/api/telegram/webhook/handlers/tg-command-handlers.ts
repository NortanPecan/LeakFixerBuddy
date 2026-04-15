import { db } from "@/lib/db";
import { normalizeToDate } from "@/lib/date-utils";
import { analyzeLeakWithAI } from "@/lib/ai-analyze-leak";
import { formatLeakAnalysisForTelegram } from "@/lib/ai-leak-prompts";
import type { InlineKeyboard } from "../tg-types";
import { buildMainMenuKeyboard, backBtn } from "../tg-keyboard";
import { getHiddenTgButtons } from "../tg-pending";
import {
  WATER_RE,
  WEIGHT_RE,
  MOOD_RE,
  ENERGY_RE,
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
  classifyLeakFromText,
} from "../tg-parser";
import { buildFullSummary, getAchievementsSummary, getChallengesSummary } from "../tg-summaries";
import { runCoach } from "../tg-coach";
import { handleFoodCommand } from "./tg-food-handlers";
import { handleGymCommand } from "./tg-gym-handlers";

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

  const foodResult = await handleFoodCommand(userId, t, today);
  if (foodResult) {
    return foodResult;
  }

  const gymResult = await handleGymCommand(userId, t, today);
  if (gymResult) {
    return gymResult;
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
