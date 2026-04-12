import { db } from "@/lib/db";
import { callAI } from "@/lib/ai-provider";
import type { AiClassifyResult } from "./tg-types";

export const AI_CLASSIFY_SYSTEM = `Ты анализируешь сообщения пользователя фитнес-приложения.
Определи что хотел сделать пользователь и извлеки данные.
Отвечай только JSON без markdown блоков:
{"type":"food|water|weight|mood|energy|sleep|task|gym|income|expense|unknown","data":{},"display":"строка для подтверждения","confidence":0.0-1.0}

Типы и их data:
- food: {"name":"название","calories":число или null,"weight_g":число или null}
- water: {"amount_ml":число}
- weight: {"kg":число}
- mood: {"score":1-10}
- energy: {"score":1-10}
- sleep: {"hours":число}
- task: {"text":"текст задачи"}
- gym: {"duration_min":число или null}
- income: {"amount":число,"desc":"описание или null"}
- expense: {"amount":число,"desc":"описание или null"}
- unknown: {}

Примеры (еда — разговорные формы):
"яблоко 500 грамм 300 калорий" → {"type":"food","data":{"name":"яблоко","calories":300,"weight_g":500},"display":"🍽️ яблоко (300 ккал, 500г)","confidence":0.95}
"скушал яблоко" → {"type":"food","data":{"name":"яблоко","calories":null,"weight_g":null},"display":"🍽️ яблоко","confidence":0.9}
"съел гречку с курицей 400 ккал" → {"type":"food","data":{"name":"гречка с курицей","calories":400,"weight_g":null},"display":"🍽️ гречка с курицей (400 ккал)","confidence":0.95}
"выпил кофе" → {"type":"food","data":{"name":"кофе","calories":null,"weight_g":null},"display":"🍽️ кофе","confidence":0.85}
"выпил протеиновый коктейль 300 ккал" → {"type":"food","data":{"name":"протеиновый коктейль","calories":300,"weight_g":null},"display":"🍽️ протеиновый коктейль (300 ккал)","confidence":0.95}
"поел и выпил воды" → {"type":"food","data":{"name":"приём пищи","calories":null,"weight_g":null},"display":"🍽️ приём пищи","confidence":0.7}
"доширак 70 440" → {"type":"food","data":{"name":"доширак","calories":308,"weight_g":70},"display":"🍽️ доширак (70г, 308 ккал)","confidence":0.92}
"гречка 200 320" → {"type":"food","data":{"name":"гречка","calories":640,"weight_g":200},"display":"🍽️ гречка (200г, 640 ккал)","confidence":0.9}
"творог 150 100" → {"type":"food","data":{"name":"творог","calories":150,"weight_g":150},"display":"🍽️ творог (150г, 150 ккал)","confidence":0.9}

Примеры (вода):
"выпил стакан воды" → {"type":"water","data":{"amount_ml":250},"display":"💧 +250 мл воды","confidence":0.85}
"выпил литр воды" → {"type":"water","data":{"amount_ml":1000},"display":"💧 +1000 мл воды","confidence":0.9}
"попил воды 500мл" → {"type":"water","data":{"amount_ml":500},"display":"💧 +500 мл воды","confidence":0.95}

Примеры (активность):
"бегал 40 минут" → {"type":"gym","data":{"duration_min":40},"display":"💪 Тренировка 40 мин","confidence":0.9}
"побегал 30 минут" → {"type":"gym","data":{"duration_min":30},"display":"💪 Пробежка 30 мин","confidence":0.9}
"сходил в зал на час" → {"type":"gym","data":{"duration_min":60},"display":"💪 Тренировка 60 мин","confidence":0.9}
"покачался" → {"type":"gym","data":{"duration_min":null},"display":"💪 Тренировка","confidence":0.85}
"поплавал 45 минут" → {"type":"gym","data":{"duration_min":45},"display":"💪 Плавание 45 мин","confidence":0.9}

Примеры (финансы):
"купил кофе 150 руб" → {"type":"expense","data":{"amount":150,"desc":"кофе"},"display":"💸 Расход −150₽ (кофе)","confidence":0.9}
"заплатил за такси 500" → {"type":"expense","data":{"amount":500,"desc":"такси"},"display":"💸 Расход −500₽ (такси)","confidence":0.9}
"получил зп 50000" → {"type":"income","data":{"amount":50000,"desc":"зп"},"display":"💚 Доход +50000₽ (зп)","confidence":0.9}`;

export async function classifyUnknownInput(
  text: string,
  userId: string
): Promise<AiClassifyResult | null> {
  // First check user's own learned patterns
  const userPattern = await db.userAiPattern.findUnique({
    where: { userId_leakType: { userId, leakType: "tg_input_patterns" } },
  });
  if (userPattern?.lastAnalysis) {
    const patterns = userPattern.lastAnalysis as Array<{
      regex: string;
      type: string;
      data: Record<string, unknown>;
      display: string;
    }>;
    for (const p of patterns) {
      try {
        if (new RegExp(p.regex, "i").test(text)) {
          return { type: p.type, data: p.data, display: p.display, confidence: 1.0 };
        }
      } catch {
        /* bad regex */
      }
    }
  }

  // Call AI for classification
  try {
    const { text: aiText } = await callAI(AI_CLASSIFY_SYSTEM, text, {
      userId,
      callType: "tg-classify",
    });
    const result = JSON.parse(aiText.trim()) as AiClassifyResult;
    if (result.type && result.confidence >= 0.6) return result;
    return null;
  } catch {
    return null;
  }
}

export async function saveLearnedPattern(
  userId: string,
  originalText: string,
  type: string,
  data: Record<string, unknown>,
  display: string
): Promise<void> {
  try {
    // Build a simple regex from the original text (escaped, case-insensitive)
    // Replace numbers with \d+ pattern for reuse
    const regexStr = originalText
      .replace(/\d+(?:[.,]\d+)?/g, "\\d+(?:[.,]\\d+)?")
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\\\\d\+/g, "\\d+");

    const existing = await db.userAiPattern.findUnique({
      where: { userId_leakType: { userId, leakType: "tg_input_patterns" } },
    });
    const patterns =
      (existing?.lastAnalysis as Array<{
        regex: string;
        type: string;
        data: Record<string, unknown>;
        display: string;
      }>) ?? [];
    // Avoid duplicates
    if (!patterns.some((p) => p.regex === regexStr)) {
      patterns.unshift({ regex: regexStr, type, data, display });
      if (patterns.length > 50) patterns.splice(50);
    }

    // Cast to satisfy Prisma Json type (InputJsonValue)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patternsJson = patterns as unknown as any[];
    await db.userAiPattern.upsert({
      where: { userId_leakType: { userId, leakType: "tg_input_patterns" } },
      update: { lastAnalysis: patternsJson, updatedAt: new Date() },
      create: {
        userId,
        leakType: "tg_input_patterns",
        lastAnalysis: patternsJson,
        triedSolutions: [],
        whatWorked: [],
        analysisCount: 0,
      },
    });
  } catch {
    /* non-critical */
  }
}

export async function executeClassifiedAction(
  userId: string,
  type: string,
  data: Record<string, unknown>,
  today: Date
): Promise<string> {
  switch (type) {
    case "food": {
      const name = String(data.name ?? "блюдо");
      const calories = data.calories != null ? Number(data.calories) : undefined;
      await db.foodEntry.create({
        data: {
          userId,
          name,
          mealType: "snack",
          date: today,
          ...(calories != null && { calories }),
        },
      });
      return `🍽️ <b>${name}</b>${calories ? ` (${calories} ккал)` : ""} добавлено в питание!`;
    }
    case "water": {
      const amount = Number(data.amount_ml ?? 250);
      let fd = await db.fitnessDaily.findFirst({ where: { userId, date: today } });
      const profile = !fd ? await db.userProfile.findUnique({ where: { userId } }) : null;
      const target = fd?.waterTarget ?? profile?.waterBaseline ?? 2000;
      const current = fd?.water ?? 0;
      if (!fd)
        fd = await db.fitnessDaily.create({
          data: { userId, date: today, water: amount, waterTarget: target },
        });
      else
        fd = await db.fitnessDaily.update({
          where: { id: fd.id },
          data: { water: current + amount },
        });
      return `💧 +${amount} мл воды! Сегодня: <b>${fd.water}/${target} мл</b>`;
    }
    case "weight": {
      const value = Number(data.kg);
      await db.measurement.create({ data: { userId, type: "weight", value, unit: "kg" } });
      return `⚖️ Вес <b>${value} кг</b> записан!`;
    }
    case "mood": {
      const score = Math.round(Number(data.score));
      await db.dailyState.upsert({
        where: { userId_date: { userId, date: today } },
        update: { mood: score },
        create: { userId, date: today, mood: score, energy: 5 },
      });
      return `😊 Настроение <b>${score}/10</b> записано!`;
    }
    case "energy": {
      const score = Math.round(Number(data.score));
      await db.dailyState.upsert({
        where: { userId_date: { userId, date: today } },
        update: { energy: score },
        create: { userId, date: today, mood: 5, energy: score },
      });
      return `⚡ Энергия <b>${score}/10</b> записана!`;
    }
    case "sleep": {
      const hours = Number(data.hours);
      await db.dailyState.upsert({
        where: { userId_date: { userId, date: today } },
        update: { sleepHours: hours },
        create: { userId, date: today, mood: 5, energy: 5, sleepHours: hours },
      });
      return `😴 Сон <b>${hours} ч</b> записан!`;
    }
    case "task": {
      const text = String(data.text ?? "");
      await db.task.create({ data: { userId, text, status: "todo", date: today } });
      return `✅ Задача <b>${text}</b> добавлена!`;
    }
    case "gym": {
      const duration = data.duration_min ? Number(data.duration_min) : null;
      const durText = duration ? ` ${duration} мин` : "";
      await db.note.create({
        data: {
          userId,
          text: `Тренировка${durText} — быстрая запись через Telegram`,
          type: "thought",
          date: new Date(),
        },
      });
      return `💪 Тренировка${durText} записана!`;
    }
    case "income": {
      const amount = Number(data.amount);
      const desc = data.desc ? String(data.desc) : null;
      const account = await db.account.findFirst({ where: { userId }, select: { id: true } });
      if (!account) return "❌ Нет счёта. Создай в приложении.";
      await db.transaction.create({
        data: { userId, accountId: account.id, amount, description: desc, date: today },
      });
      return `💚 Доход <b>+${amount}₽</b>${desc ? ` (${desc})` : ""} записан!`;
    }
    case "expense": {
      const amount = Number(data.amount);
      const desc = data.desc ? String(data.desc) : null;
      const account = await db.account.findFirst({ where: { userId }, select: { id: true } });
      if (!account) return "❌ Нет счёта. Создай в приложении.";
      await db.transaction.create({
        data: {
          userId,
          accountId: account.id,
          amount: -Math.abs(amount),
          description: desc,
          date: today,
        },
      });
      return `💸 Расход <b>−${amount}₽</b>${desc ? ` (${desc})` : ""} записан!`;
    }
    default:
      return "✅ Сохранено!";
  }
}
