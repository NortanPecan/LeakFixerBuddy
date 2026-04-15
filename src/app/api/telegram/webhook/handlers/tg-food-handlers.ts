import { db } from "@/lib/db";
import type { InlineKeyboard } from "../tg-types";
import { answerCallback, editMessageText } from "../tg-sender";
import { backBtn } from "../tg-keyboard";
import { FOOD_CMD_RE, parseFoodEntry } from "../tg-parser";
import type { TelegramCallbackContext, TelegramCommandResult } from "./tg-handler-results";

export async function handleFoodCommand(
  userId: string,
  t: string,
  today: Date
): Promise<TelegramCommandResult | null> {
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

  return null;
}

export async function handleFoodCallback({
  cbQueryId,
  data,
  chatId,
  messageId,
}: TelegramCallbackContext): Promise<boolean> {
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
    return true;
  }

  return false;
}
