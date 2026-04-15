import { db } from "@/lib/db";
import { normalizeToDate } from "@/lib/date-utils";
import type { InlineKeyboard } from "../tg-types";
import { answerCallback, editMessageText, sendForceReply } from "../tg-sender";
import { buildMainMenuKeyboard, buildSettingsKeyboard, backBtn, TG_BUTTONS } from "../tg-keyboard";
import {
  storePending,
  getPendingForUserId,
  clearPendingForUserId,
  getHiddenTgButtons,
  toggleTgButton,
} from "../tg-pending";
import {
  getWaterSummary,
  getGymSummary,
  getFoodSummary,
  getRitualsSummary,
  getFinanceSummary,
  getTasksSummary,
  buildFullSummary,
  getLeaksSummary,
  getAchievementsSummary,
  getChallengesSummary,
} from "../tg-summaries";
import { executeClassifiedAction, saveLearnedPattern } from "../tg-ai-classify";
import { handleFoodCallback } from "./tg-food-handlers";
import { handleGymCallback } from "./tg-gym-handlers";

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

  if (await handleFoodCallback({ cbQueryId, data, chatId, messageId })) {
    return;
  }

  if (await handleGymCallback({ cbQueryId, data, userId, chatId, messageId, today })) {
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
