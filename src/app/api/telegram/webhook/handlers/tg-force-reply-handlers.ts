import { db } from "@/lib/db";
import { normalizeToDate } from "@/lib/date-utils";
import { sendMessage } from "../tg-sender";
import { getPendingForUserId, clearPendingForUserId } from "../tg-pending";
import { runCoach } from "../tg-coach";
import { handleGymForceReply } from "./tg-gym-handlers";

export async function handleForceReply(
  userId: string,
  chatId: number,
  text: string
): Promise<boolean> {
  const pending = await getPendingForUserId(userId);
  const today = normalizeToDate(new Date());

  if (await handleGymForceReply({ userId, chatId, text, pending })) {
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
