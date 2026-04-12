import { db } from "@/lib/db";
import { calculateChallengeProgress } from "@/lib/challenge-utils";
import type { InlineKeyboard } from "./tg-types";
import { backBtn, formatDate } from "./tg-keyboard";
import { formatExerciseLine } from "./tg-parser";

// ─── GYM ──────────────────────────────────────────────────────────────────────

export async function getGymSummary(
  userId: string,
  today: Date
): Promise<{ text: string; keyboard: InlineKeyboard }> {
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  const workout = await db.gymWorkout.findFirst({
    where: {
      period: { userId, isActive: true },
      date: { gte: startOfDay, lte: endOfDay },
    },
    include: {
      exercises: {
        orderBy: { order: "asc" },
        include: { sets: { orderBy: { setNum: "asc" } } },
      },
    },
    orderBy: { date: "desc" },
  });

  // Fallback: last completed workout
  const source =
    workout ??
    (await db.gymWorkout.findFirst({
      where: { period: { userId, isActive: true } },
      include: {
        exercises: {
          orderBy: { order: "asc" },
          include: { sets: { orderBy: { setNum: "asc" } } },
        },
      },
      orderBy: { date: "desc" },
    }));

  if (!source) {
    return {
      text: "💪 Тренировок пока нет. Добавь их в приложении!",
      keyboard: backBtn(),
    };
  }

  const isToday = !!workout;
  const dateStr = formatDate(source.date);
  const statusEmoji = source.status === "completed" ? "✅" : isToday ? "🔄" : "📅";

  // Personal records: max weight per exercise name
  const exerciseNames = source.exercises.map((e) => e.name);
  const prRecords: Record<string, number> = {};
  if (exerciseNames.length > 0) {
    const sets = await db.gymExerciseSet.findMany({
      where: {
        exercise: {
          workout: { period: { userId } },
          name: { in: exerciseNames },
        },
        weight: { not: null },
      },
      select: { weight: true, exercise: { select: { name: true } } },
    });
    for (const s of sets) {
      const n = s.exercise.name;
      if (s.weight && (!prRecords[n] || s.weight > prRecords[n])) prRecords[n] = s.weight;
    }
  }

  const lines = source.exercises.map((ex) => {
    const workingSets = ex.sets.filter((s) => !s.isWarmup && s.completed);
    const usedWeight = workingSets[0]?.weight ?? ex.weight;
    const isPR = !!usedWeight && !!prRecords[ex.name] && usedWeight >= prRecords[ex.name];
    return formatExerciseLine(
      ex as {
        name: string;
        targetSets: number;
        targetReps: number | null;
        weight: number | null;
        nextWeight: number | null;
        sets: {
          weight: number | null;
          reps: number | null;
          isWarmup: boolean;
          completed: boolean;
        }[];
      },
      isPR
    );
  });

  const name = source.name || "Тренировка";
  const label = isToday ? "Сегодня" : "Последняя";
  let text = `${statusEmoji} <b>${name}</b>\n📅 ${dateStr} (${label})\n\n${lines.join("\n")}`;

  if (source.stretchingDone) text += "\n\n🧘 Растяжка: выполнена";

  const keyboard: InlineKeyboard = [];

  // "+Сет" and "✏️ Изменить" buttons for each exercise
  for (const ex of source.exercises) {
    keyboard.push([
      { text: `➕ Сет → ${ex.name}`, callback_data: `gym_addset_${ex.id}` },
      { text: `✏️`, callback_data: `gym_editex_${ex.id}` },
    ]);
  }

  // "+ Упражнение" button
  keyboard.push([{ text: "➕ Упражнение", callback_data: `gym_addex_${source.id}` }]);

  if (isToday && source.status !== "completed") {
    keyboard.push([{ text: "✅ Отметить выполненной", callback_data: `gym_done_${source.id}` }]);
  }
  keyboard.push(...backBtn());

  return { text, keyboard };
}

// ─── WATER ────────────────────────────────────────────────────────────────────

export async function getWaterSummary(
  userId: string,
  today: Date
): Promise<{ text: string; keyboard: InlineKeyboard }> {
  const fd = await db.fitnessDaily.findFirst({ where: { userId, date: today } });
  const profile = !fd ? await db.userProfile.findUnique({ where: { userId } }) : null;
  const target = fd?.waterTarget ?? profile?.waterBaseline ?? 2000;
  const water = fd?.water ?? 0;
  const pct = Math.min(100, Math.round((water / target) * 100));

  const filled = Math.round(pct / 20);
  const bar = "🔵".repeat(filled) + "⚪".repeat(5 - filled);

  const text = `💧 <b>Вода сегодня</b>\n\n${water} / ${target} мл (${pct}%)\n${bar}`;
  const keyboard: InlineKeyboard = [
    [
      { text: "+200 мл", callback_data: "water_add_200" },
      { text: "+350 мл", callback_data: "water_add_350" },
      { text: "+500 мл", callback_data: "water_add_500" },
    ],
    ...backBtn(),
  ];
  return { text, keyboard };
}

// ─── FOOD ─────────────────────────────────────────────────────────────────────

export async function getFoodSummary(
  userId: string,
  today: Date
): Promise<{ text: string; keyboard: InlineKeyboard }> {
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  const entries = await db.foodEntry.findMany({
    where: { userId, date: { gte: startOfDay, lt: endOfDay } },
    orderBy: { createdAt: "asc" },
  });

  if (entries.length === 0) {
    return {
      text: "🍽️ <b>Питание сегодня</b>\n\nЗаписей нет.\n\nДобавь: <code>ел название 400</code>",
      keyboard: backBtn(),
    };
  }

  const totalCal = entries.reduce((s, e) => s + (e.calories ?? 0), 0);
  const qualityMap: Record<string, string> = { good: "🟢", neutral: "🟡", bad: "🔴" };
  const lines = entries.map((e) => {
    const q = qualityMap[e.quality ?? ""] ?? "⚪";
    const amtStr = e.amount ? ` (${e.amount})` : "";
    const cal = e.calories ? ` — ${e.calories} ккал` : "";
    let line = `${q} ${e.name}${amtStr}${cal}`;
    if (e.protein != null || e.fat != null || e.carbs != null) {
      const bju: string[] = [];
      if (e.protein != null) bju.push(`Б${Math.round(e.protein)}`);
      if (e.fat != null) bju.push(`Ж${Math.round(e.fat)}`);
      if (e.carbs != null) bju.push(`У${Math.round(e.carbs)}`);
      line += ` · <i>${bju.join(" ")}</i>`;
    }
    return line;
  });

  const text = `🍽️ <b>Питание сегодня</b>\n\n${lines.join("\n")}\n\n<b>Итого: ${totalCal > 0 ? `${totalCal} ккал` : `${entries.length} записей`}</b>`;
  return { text, keyboard: backBtn() };
}

// ─── RITUALS ──────────────────────────────────────────────────────────────────

export async function getRitualsSummary(
  userId: string,
  today: Date
): Promise<{ text: string; keyboard: InlineKeyboard }> {
  const [rituals, completions] = await Promise.all([
    db.ritual.findMany({ where: { userId, status: "active" }, select: { id: true, title: true } }),
    db.ritualCompletion.findMany({
      where: { userId, date: today, completed: true },
      select: { ritualId: true },
    }),
  ]);

  if (rituals.length === 0) {
    return {
      text: "✅ <b>Ритуалы</b>\n\nНет активных ритуалов. Добавь в приложении!",
      keyboard: backBtn(),
    };
  }

  const doneIds = new Set(completions.map((c) => c.ritualId));
  const lines = rituals.map((r) => `${doneIds.has(r.id) ? "✅" : "⬜"} ${r.title}`);
  const doneCount = doneIds.size;

  const text = `✅ <b>Ритуалы сегодня</b> — ${doneCount}/${rituals.length}\n\n${lines.join("\n")}`;
  const keyboard: InlineKeyboard = [];
  if (doneCount < rituals.length) {
    keyboard.push([{ text: "🙌 Отметить все выполненными", callback_data: "rituals_done_all" }]);
  }
  keyboard.push(...backBtn());
  return { text, keyboard };
}

// ─── FINANCE ──────────────────────────────────────────────────────────────────

export async function getFinanceSummary(
  userId: string,
  today: Date
): Promise<{ text: string; keyboard: InlineKeyboard }> {
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const txns = await db.transaction.findMany({
    where: { userId, date: { gte: startOfMonth } },
    select: { amount: true },
  });

  const income = txns.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expense = txns.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const balance = income - expense;

  const monthName = today.toLocaleDateString("ru-RU", { month: "long" });
  const sign = balance >= 0 ? "+" : "";
  const emoji = balance >= 0 ? "💚" : "🔴";

  const text =
    `💰 <b>Финансы — ${monthName}</b>\n\n` +
    `💚 Доходы:  <b>${income.toLocaleString("ru-RU")} ₽</b>\n` +
    `💸 Расходы: <b>${expense.toLocaleString("ru-RU")} ₽</b>\n\n` +
    `${emoji} Баланс: <b>${sign}${balance.toLocaleString("ru-RU")} ₽</b>\n\n` +
    `Добавить: <code>доход 5000 зарплата</code> / <code>расход 500 кофе</code>`;

  return { text, keyboard: backBtn() };
}

// ─── TASKS ────────────────────────────────────────────────────────────────────

export async function getTasksSummary(
  userId: string,
  today: Date
): Promise<{ text: string; keyboard: InlineKeyboard }> {
  const tasks = await db.task.findMany({
    where: { userId, date: today },
    orderBy: { createdAt: "asc" },
  });

  if (tasks.length === 0) {
    return {
      text: "📋 <b>Задачи сегодня</b>\n\nЗадач нет.\n\nДобавить: <code>задача купить хлеб</code>",
      keyboard: backBtn(),
    };
  }

  const lines = tasks.map((t) => `${t.status === "done" ? "✅" : "⬜"} ${t.text}`);
  const done = tasks.filter((t) => t.status === "done").length;

  const text = `📋 <b>Задачи сегодня</b> — ${done}/${tasks.length}\n\n${lines.join("\n")}`;
  return { text, keyboard: backBtn() };
}

// ─── WEIGHT ───────────────────────────────────────────────────────────────────

export async function getWeightSummary(
  userId: string
): Promise<{ text: string; keyboard: InlineKeyboard }> {
  const last = await db.measurement.findFirst({
    where: { userId, type: "weight" },
    orderBy: { date: "desc" },
  });
  const text = last
    ? `⚖️ <b>Вес</b>\n\nПоследнее: <b>${last.value} кг</b>\n📅 ${formatDate(last.date)}\n\nЗаписать: <code>вес 74.5</code>`
    : `⚖️ <b>Вес</b>\n\nЗаписей нет.\n\nЗаписать: <code>вес 74.5</code>`;
  return { text, keyboard: backBtn() };
}

// ─── MOOD / ENERGY / SLEEP ────────────────────────────────────────────────────

export async function getMoodEnergySummary(
  userId: string,
  today: Date
): Promise<{ text: string; keyboard: InlineKeyboard }> {
  const state = await db.dailyState.findFirst({ where: { userId, date: today } });
  const moodEmoji = (state?.mood ?? 0) >= 8 ? "😊" : (state?.mood ?? 0) >= 5 ? "😐" : "😔";
  const energyEmoji = (state?.energy ?? 0) >= 8 ? "⚡" : (state?.energy ?? 0) >= 5 ? "🔋" : "🪫";

  let text = "😊 <b>Состояние сегодня</b>\n\n";
  text += state?.mood
    ? `${moodEmoji} Настроение: <b>${state.mood}/10</b>\n`
    : "😊 Настроение: не записано\n";
  text += state?.energy
    ? `${energyEmoji} Энергия: <b>${state.energy}/10</b>\n`
    : "⚡ Энергия: не записано\n";
  text += state?.sleepHours ? `😴 Сон: <b>${state.sleepHours} ч</b>\n` : "😴 Сон: не записан\n";
  text += "\nЗаписать: <code>настроение 8</code> / <code>энергия 7</code> / <code>сон 8</code>";

  return { text, keyboard: backBtn() };
}

// ─── FULL SUMMARY ─────────────────────────────────────────────────────────────

export async function buildFullSummary(userId: string, today: Date): Promise<string> {
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  const [fitnessDaily, dailyState, foodEntries, ritualCompletions, activeRituals, checkins] =
    await Promise.all([
      db.fitnessDaily.findFirst({ where: { userId, date: startOfDay } }),
      db.dailyState.findFirst({ where: { userId, date: startOfDay } }),
      db.foodEntry.findMany({
        where: { userId, date: { gte: startOfDay, lt: endOfDay } },
        select: { calories: true },
      }),
      db.ritualCompletion.findMany({ where: { userId, date: startOfDay, completed: true } }),
      db.ritual.findMany({ where: { userId, status: "active" } }),
      db.dailyCheckin.findMany({ where: { userId, date: startOfDay } }).catch(() => []),
    ]);

  const water = fitnessDaily?.water ?? 0;
  const waterTarget = fitnessDaily?.waterTarget ?? 2000;
  const waterPct = Math.round((water / waterTarget) * 100);
  const calories = foodEntries.reduce((s, f) => s + (f.calories || 0), 0);
  const ritDone = ritualCompletions.length;
  const ritTotal = activeRituals.length;
  const morningDone = checkins.some((c: { type: string }) => c.type === "morning");
  const eveningDone = checkins.some((c: { type: string }) => c.type === "evening");

  const filled = Math.min(5, Math.round(waterPct / 20));
  const waterBar = "🔵".repeat(filled) + "⚪".repeat(5 - filled);
  const todayStr = today.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });

  let msg = `📊 <b>Сводка за ${todayStr}</b>\n\n`;
  msg += `💧 Вода: <b>${water}/${waterTarget} мл</b> ${waterBar}\n`;
  if (calories > 0) msg += `🍽️ Калории: <b>${calories} ккал</b>\n`;
  if (ritTotal > 0) msg += `✅ Ритуалы: <b>${ritDone}/${ritTotal}</b>\n`;
  if (dailyState?.mood) msg += `😊 Настроение: <b>${dailyState.mood}/10</b>\n`;
  if (dailyState?.energy) msg += `⚡ Энергия: <b>${dailyState.energy}/10</b>\n`;
  if (dailyState?.sleepHours) msg += `😴 Сон: <b>${dailyState.sleepHours} ч</b>\n`;
  msg += `\n${morningDone ? "☀️" : "○"} Утро  ${eveningDone ? "🌙" : "○"} Вечер`;
  return msg;
}

// ─── LEAKS ────────────────────────────────────────────────────────────────────

const LEAK_TYPE_LABELS: Record<string, string> = {
  low_energy: "Низкая энергия",
  chronic_low_energy: "Хроническая усталость",
  no_gym: "Мало тренировок",
  gym_dropout: "Бросил зал",
  ritual_consistency: "Непостоянство ритуалов",
  ritual_erosion: "Эрозия ритуалов",
  missed_checkins: "Пропуск чек-инов",
  calorie_spikes: "Скачки калорий",
  no_habits: "Нет привычек",
  weekend_ritual_drop: "Срыв в выходные",
  high_stress: "Высокий стресс",
  sleep_deficit: "Дефицит сна",
  expense_spike: "Скачок расходов",
  tracking_dropout: "Не ввожу данные",
  low_tracking: "Мало трекинга",
};

export async function getLeaksSummary(
  userId: string
): Promise<{ text: string; keyboard: InlineKeyboard }> {
  const patterns = await db.userAiPattern.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });

  if (patterns.length === 0) {
    return {
      text: "🔍 <b>Лики</b>\n\nAI-анализов пока нет.\n\nНапиши: <code>лик описание проблемы</code>\nили открой раздел «Лики» в приложении.",
      keyboard: backBtn(),
    };
  }

  let text = "🔍 <b>Твои лики (AI-анализы)</b>\n\n";

  for (const p of patterns) {
    const label = LEAK_TYPE_LABELS[p.leakType] ?? p.leakType;
    const analysis = p.lastAnalysis as {
      cause?: string;
      urgency?: string;
      solutions?: { text: string }[];
    } | null;
    const urgencyEmoji =
      analysis?.urgency === "now" ? "🔴" : analysis?.urgency === "thisWeek" ? "🟡" : "🟢";
    const topSolution = analysis?.solutions?.[0]?.text ?? "—";
    text += `${urgencyEmoji} <b>${label}</b>\n`;
    if (analysis?.cause)
      text += `  Причина: ${analysis.cause.slice(0, 80)}${analysis.cause.length > 80 ? "…" : ""}\n`;
    text += `  💡 ${topSolution.slice(0, 90)}${topSolution.length > 90 ? "…" : ""}\n`;
    text += `  Анализов: ${p.analysisCount} | Провайдер: ${p.lastProvider ?? "?"}\n\n`;
  }

  text += "\nОбновить анализ: <code>лик описание</code>";

  return { text, keyboard: backBtn() };
}

// ─── ACHIEVEMENTS ─────────────────────────────────────────────────────────────

const ACHIEVEMENT_LABELS_TG: Record<string, { emoji: string; label: string }> = {
  GREAT_DAY_FIRST: { emoji: "🌟", label: "Отличный день!" },
  QUALITY_WEEK: { emoji: "🏆", label: "Неделя качества" },
  STREAK_7: { emoji: "🔥", label: "7 дней подряд" },
  STREAK_30: { emoji: "💎", label: "Месяц силы" },
  WATER_WEEK: { emoji: "💧", label: "Водный марафон" },
  GYM_10: { emoji: "💪", label: "Железный" },
};

export async function getAchievementsSummary(
  userId: string
): Promise<{ text: string; keyboard: InlineKeyboard }> {
  const achievements = await db.achievement.findMany({
    where: { userId },
    orderBy: { obtainedAt: "desc" },
  });

  if (achievements.length === 0) {
    return {
      text:
        "🏅 <b>Достижения</b>\n\nПока пусто — продолжай и они придут!\n\n" +
        "💡 Как получить первые:\n" +
        "• <b>🌟 Отличный день!</b> — набери 80+ баллов за день\n" +
        "• <b>🏆 Неделя качества</b> — 7 дней подряд 70+ баллов",
      keyboard: backBtn(),
    };
  }

  let text = `🏅 <b>Твои достижения — ${achievements.length}</b>\n\n`;
  for (const a of achievements) {
    const def = ACHIEVEMENT_LABELS_TG[a.code] ?? { emoji: "🎯", label: a.code };
    const date = a.obtainedAt.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    text += `${def.emoji} <b>${def.label}</b>\n  📅 ${date}\n\n`;
  }

  return { text, keyboard: backBtn() };
}

// ─── CHALLENGES ───────────────────────────────────────────────────────────────

const TRACKER_METRIC_LABELS: Record<string, string> = {
  gym_count: "тренировок",
  water_streak: "дней воды",
  ritual_rate: "дней ритуалов",
  no_food_bad: "дней без срывов",
  sleep_avg: "ч сна",
  mood_avg: "/10 настр.",
};

export async function getChallengesSummary(
  userId: string
): Promise<{ text: string; keyboard: InlineKeyboard }> {
  const challenges = await db.challenge.findMany({
    where: { userId, status: "active" },
    orderBy: { createdAt: "asc" },
  });

  const quickStartButtons = [
    [
      { text: "💪 10 тренировок", callback_data: "challenge_start_gym_count_10_30" },
      { text: "💧 7 дней воды", callback_data: "challenge_start_water_streak_7_7" },
    ],
    [{ text: "🔥 21 день ритуалов", callback_data: "challenge_start_ritual_rate_21_21" }],
  ];

  if (challenges.length === 0) {
    return {
      text: "🏆 <b>Активных челленджей нет</b>\n\nБыстрый старт — выбери шаблон:",
      keyboard: [...quickStartButtons, ...backBtn()],
    };
  }

  let text = `🏆 <b>Активные челленджи (${challenges.length}/3)</b>\n\n`;

  const now = Date.now();
  for (const c of challenges) {
    // Recalculate real progress from live data
    let liveC: Awaited<ReturnType<typeof calculateChallengeProgress>>;
    try {
      liveC = await calculateChallengeProgress(c, userId);
    } catch {
      liveC = { ...c, progressPercentage: c.progress, daysCompleted: 0, currentStreak: 0 };
    }

    let cfg: Record<string, unknown> = {};
    try {
      cfg = JSON.parse(c.config ?? "{}");
    } catch {
      /* */
    }

    const daysElapsed = Math.min(
      c.duration,
      Math.floor((now - new Date(c.startDate).getTime()) / 86400000)
    );
    const daysLeft = Math.max(0, c.duration - daysElapsed);
    const pct = liveC.progress ?? 0;
    const bar = "█".repeat(Math.round(pct / 10)) + "░".repeat(10 - Math.round(pct / 10));

    let progressStr = `${pct}% · осталось ${daysLeft} дн.`;
    if (c.type === "tracker") {
      const metric = cfg.metric as string;
      const target = cfg.target as number;
      const unit = TRACKER_METRIC_LABELS[metric] ?? "";
      progressStr = `${liveC.daysCompleted}/${target} ${unit} · осталось ${daysLeft} дн.`.trim();
    } else {
      progressStr = `${liveC.daysCompleted}/${c.duration} дней · ${pct}% · осталось ${daysLeft} дн.`;
    }

    text += `<b>${c.name}</b>\n`;
    text += `${bar} ${progressStr}\n`;
    text += `📅 ${c.duration} дней · ${c.type === "tracker" ? "📊 трекер" : c.type === "ritual" ? "🔥 ритуал" : "⭐ свободный"}\n\n`;
  }

  const keyboard = challenges.length < 3 ? [...quickStartButtons, ...backBtn()] : backBtn();

  return { text: text.trim(), keyboard };
}
