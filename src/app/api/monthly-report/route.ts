import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSelf } from "@/lib/server-auth";

/**
 * GET /api/monthly-report?userId=...&monthStart=YYYY-MM-DD
 * Returns a 30-day summary with weekly breakdown and deep leak analysis.
 * monthStart defaults to 30 days ago.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const monthStartParam = searchParams.get("monthStart");

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }
  await requireSelf(request, userId);

  try {
    const monthStart = monthStartParam ? new Date(monthStartParam) : get30DaysAgo();
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(monthStart);
    monthEnd.setDate(monthEnd.getDate() + 30);

    const userPeriodIds = await db.gymPeriod
      .findMany({
        where: { userId },
        select: { id: true },
      })
      .catch(() => [] as { id: string }[]);

    const periodIds = userPeriodIds.map((p) => p.id);

    const [
      dailyStates,
      checkins,
      foodEntries,
      gymWorkouts,
      ritualCompletions,
      habitLogs,
      transactions,
      tasks,
    ] = await Promise.all([
      db.dailyState.findMany({
        where: { userId, date: { gte: monthStart, lt: monthEnd } },
        orderBy: { date: "asc" },
      }),
      db.dailyCheckin
        .findMany({
          where: { userId, date: { gte: monthStart, lt: monthEnd } },
          orderBy: { date: "asc" },
        })
        .catch(() => []),
      db.foodEntry
        .findMany({
          where: { userId, date: { gte: monthStart, lt: monthEnd } },
          orderBy: { date: "asc" },
        })
        .catch(() => []),
      periodIds.length > 0
        ? db.gymWorkout
            .findMany({
              where: {
                periodId: { in: periodIds },
                date: { gte: monthStart, lt: monthEnd },
              },
              orderBy: { date: "asc" },
              select: { date: true, completed: true, status: true },
            })
            .catch(() => [])
        : Promise.resolve([]),
      db.ritualCompletion
        .findMany({
          where: { userId, date: { gte: monthStart, lt: monthEnd } },
          select: { date: true, completed: true, ritualId: true },
        })
        .catch(() => []),
      db.habitLog
        .findMany({
          where: { userId, date: { gte: monthStart, lt: monthEnd } },
          select: { date: true, completed: true, habitId: true },
        })
        .catch(() => []),
      db.transaction
        .findMany({
          where: { userId, date: { gte: monthStart, lt: monthEnd } },
          select: { date: true, amount: true },
        })
        .catch(() => []),
      db.task
        .findMany({
          where: { userId, status: "done", updatedAt: { gte: monthStart, lt: monthEnd } },
          select: { date: true, updatedAt: true },
        })
        .catch(() => []),
    ]);

    // Build per-day data
    const days: DayData[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(monthStart);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];

      const state = dailyStates.find((s) => s.date.toISOString().split("T")[0] === dateStr);
      const morningCheckin = checkins.find(
        (c) => c.date.toISOString().split("T")[0] === dateStr && c.type === "morning"
      );
      const eveningCheckin = checkins.find(
        (c) => c.date.toISOString().split("T")[0] === dateStr && c.type === "evening"
      );
      const foods = foodEntries.filter((f) => f.date.toISOString().split("T")[0] === dateStr);
      const hadGym = gymWorkouts.some((w) => {
        const wd = w.date.toISOString().split("T")[0];
        return wd === dateStr && (w.completed || w.status === "completed");
      });
      const dayRituals = ritualCompletions.filter(
        (r) => r.date.toISOString().split("T")[0] === dateStr
      );
      const dayHabits = habitLogs.filter((h) => h.date.toISOString().split("T")[0] === dateStr);
      const dayExpenses = transactions
        .filter((t) => t.date.toISOString().split("T")[0] === dateStr && t.amount < 0)
        .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
      const dayTasks = tasks.filter((t) => {
        const td = (t.date || t.updatedAt).toISOString().split("T")[0];
        return td === dateStr;
      });

      days.push({
        date: dateStr,
        weekNum: Math.floor(i / 7) + 1,
        mood: state?.mood ?? null,
        energy: state?.energy ?? null,
        stress: state?.stress ?? null,
        sleepHours: state?.sleepHours ?? null,
        morningEnergy: morningCheckin?.energy ?? null,
        eveningRating: eveningCheckin?.dayRating ?? null,
        totalCalories: foods.reduce((s, f) => s + (f.calories || 0), 0),
        hadGym,
        morningCheckinDone: !!morningCheckin,
        eveningCheckinDone: !!eveningCheckin,
        ritualsCompleted: dayRituals.filter((r) => r.completed).length,
        ritualsTotal: dayRituals.length,
        habitsCompleted: dayHabits.length,
        expenses: dayExpenses,
        tasksCompleted: dayTasks.length,
      });
    }

    // Split into 4 weeks
    const weeks: WeekSummary[] = [1, 2, 3, 4].map((weekNum) => {
      const weekDays = days.filter((d) => d.weekNum === weekNum);
      return buildWeekSummary(weekNum, weekDays);
    });

    // Monthly summary
    const monthSummary = buildMonthlySummary(days);

    // Deep leak analysis (30-day patterns)
    const deepLeaks = detectMonthlyLeaks(days, weeks);

    // Week-over-week trends
    const trends = detectTrends(weeks);

    return NextResponse.json({
      success: true,
      monthStart: monthStart.toISOString().split("T")[0],
      monthEnd: monthEnd.toISOString().split("T")[0],
      weeks,
      summary: monthSummary,
      deepLeaks,
      trends,
    });
  } catch (error) {
    console.error("[Monthly Report] Error:", error);
    return NextResponse.json({ error: "Failed to generate monthly report" }, { status: 500 });
  }
}

interface DayData {
  date: string;
  weekNum: number;
  mood: number | null;
  energy: number | null;
  stress: number | null;
  sleepHours: number | null;
  morningEnergy: number | null;
  eveningRating: number | null;
  totalCalories: number;
  hadGym: boolean;
  morningCheckinDone: boolean;
  eveningCheckinDone: boolean;
  ritualsCompleted: number;
  ritualsTotal: number;
  habitsCompleted: number;
  expenses: number;
  tasksCompleted: number;
}

interface WeekSummary {
  weekNum: number;
  label: string;
  avgMood: number;
  avgEnergy: number;
  avgEveningRating: number;
  gymDays: number;
  checkinDays: number;
  ritualsCompletionRate: number;
  habitsTotal: number;
  totalExpenses: number;
  tasksCompleted: number;
  dataScore: number; // 0-100 how much data was tracked
}

function buildWeekSummary(weekNum: number, days: DayData[]): WeekSummary {
  const moodDays = days.filter((d) => d.mood !== null);
  const energyDays = days.filter((d) => d.morningEnergy !== null || d.energy !== null);
  const ratingDays = days.filter((d) => d.eveningRating !== null);
  const daysWithRituals = days.filter((d) => d.ritualsTotal > 0);

  const avgMood = avg(moodDays.map((d) => d.mood!));
  const avgEnergy = avg(energyDays.map((d) => (d.morningEnergy ?? d.energy)!));
  const avgEveningRating = avg(ratingDays.map((d) => d.eveningRating!));
  const ritualsRate =
    daysWithRituals.length > 0
      ? avg(
          daysWithRituals.map((d) => (d.ritualsTotal > 0 ? d.ritualsCompleted / d.ritualsTotal : 0))
        ) * 100
      : 0;

  // Data score: how many days had at least morning checkin or daily state
  const trackedDays = days.filter((d) => d.morningCheckinDone || d.mood !== null).length;
  const dataScore = Math.round((trackedDays / Math.max(days.length, 1)) * 100);

  return {
    weekNum,
    label: `Неделя ${weekNum}`,
    avgMood: Math.round(avgMood * 10) / 10,
    avgEnergy: Math.round(avgEnergy * 10) / 10,
    avgEveningRating: Math.round(avgEveningRating * 10) / 10,
    gymDays: days.filter((d) => d.hadGym).length,
    checkinDays: days.filter((d) => d.morningCheckinDone).length,
    ritualsCompletionRate: Math.round(ritualsRate),
    habitsTotal: days.reduce((s, d) => s + d.habitsCompleted, 0),
    totalExpenses: days.reduce((s, d) => s + d.expenses, 0),
    tasksCompleted: days.reduce((s, d) => s + d.tasksCompleted, 0),
    dataScore,
  };
}

interface MonthlySummary {
  avgMood: number;
  avgEnergy: number;
  avgEveningRating: number;
  gymDays: number;
  totalCheckins: number;
  ritualsCompletionRate: number;
  totalHabits: number;
  totalExpenses: number;
  totalTasks: number;
  bestWeek: number;
  worstWeek: number;
}

function buildMonthlySummary(days: DayData[]): MonthlySummary {
  const moodDays = days.filter((d) => d.mood !== null);
  const energyDays = days.filter((d) => d.morningEnergy !== null || d.energy !== null);
  const ratingDays = days.filter((d) => d.eveningRating !== null);
  const daysWithRituals = days.filter((d) => d.ritualsTotal > 0);

  return {
    avgMood: Math.round(avg(moodDays.map((d) => d.mood!)) * 10) / 10,
    avgEnergy: Math.round(avg(energyDays.map((d) => (d.morningEnergy ?? d.energy)!)) * 10) / 10,
    avgEveningRating: Math.round(avg(ratingDays.map((d) => d.eveningRating!)) * 10) / 10,
    gymDays: days.filter((d) => d.hadGym).length,
    totalCheckins: days.filter((d) => d.morningCheckinDone).length,
    ritualsCompletionRate:
      daysWithRituals.length > 0
        ? Math.round(
            avg(
              daysWithRituals.map((d) =>
                d.ritualsTotal > 0 ? d.ritualsCompleted / d.ritualsTotal : 0
              )
            ) * 100
          )
        : 0,
    totalHabits: days.reduce((s, d) => s + d.habitsCompleted, 0),
    totalExpenses: days.reduce((s, d) => s + d.expenses, 0),
    totalTasks: days.reduce((s, d) => s + d.tasksCompleted, 0),
    bestWeek: 1,
    worstWeek: 1,
  };
}

interface MonthlyLeak {
  type: string;
  severity: "info" | "warning" | "critical";
  message: string;
  emoji: string;
  recommendation: string;
  weeks?: number[];
}

function detectMonthlyLeaks(days: DayData[], weeks: WeekSummary[]): MonthlyLeak[] {
  const leaks: MonthlyLeak[] = [];

  // 1. Chronically low energy (3+ weeks with avg < 5)
  const lowEnergyWeeks = weeks.filter((w) => w.avgEnergy > 0 && w.avgEnergy < 5);
  if (lowEnergyWeeks.length >= 3) {
    leaks.push({
      type: "chronic_low_energy",
      severity: "critical",
      emoji: "🪫",
      message: `${lowEnergyWeeks.length} из 4 недель — хроническая нехватка энергии (среднее <5).`,
      recommendation: "Проверь сон, питание, уровень нагрузки. Добавь в ритуалы восстановление.",
      weeks: lowEnergyWeeks.map((w) => w.weekNum),
    });
  }

  // 2. Gym dropout (was going, then stopped)
  const weekGymDays = weeks.map((w) => w.gymDays);
  if (weekGymDays.length >= 4 && weekGymDays[0] >= 2 && weekGymDays[3] === 0) {
    leaks.push({
      type: "gym_dropout",
      severity: "warning",
      emoji: "🏋️",
      message: "Тренировки были в начале месяца, но пропали к концу.",
      recommendation: "Установи минимум: 1 тренировка в неделю даже в загруженные периоды.",
    });
  }

  // 3. Ritual erosion (declining completion rate over weeks)
  const ritualRates = weeks.map((w) => w.ritualsCompletionRate).filter((r) => r > 0);
  if (ritualRates.length >= 3) {
    const firstHalf = avg(ritualRates.slice(0, 2));
    const secondHalf = avg(ritualRates.slice(-2));
    if (firstHalf - secondHalf > 20) {
      leaks.push({
        type: "ritual_erosion",
        severity: "warning",
        emoji: "🔥",
        message: `Выполнение ритуалов снизилось с ${Math.round(firstHalf)}% до ${Math.round(secondHalf)}% к концу месяца.`,
        recommendation:
          "Пересмотри список ритуалов — возможно, он слишком большой или нереалистичный.",
      });
    }
  }

  // 4. Mood-gym correlation (low mood correlates with no gym)
  const noGymDays = days.filter((d) => !d.hadGym && d.mood !== null);
  const gymDaysMood = days.filter((d) => d.hadGym && d.mood !== null);
  if (gymDaysMood.length >= 4 && noGymDays.length >= 4) {
    const avgGymMood = avg(gymDaysMood.map((d) => d.mood!));
    const avgNoGymMood = avg(noGymDays.map((d) => d.mood!));
    if (avgGymMood - avgNoGymMood > 1) {
      leaks.push({
        type: "gym_mood_correlation",
        severity: "info",
        emoji: "💪",
        message: `В дни с тренировкой настроение выше на ${(avgGymMood - avgNoGymMood).toFixed(1)} балла (${avgGymMood.toFixed(1)} vs ${avgNoGymMood.toFixed(1)}).`,
        recommendation: "Зал — твой антидепрессант. Поставь его в расписание как обязательный.",
      });
    }
  }

  // 5. Underspending or overspending pattern
  const expenseWeeks = weeks.filter((w) => w.totalExpenses > 0);
  if (expenseWeeks.length >= 2) {
    const expenseValues = expenseWeeks.map((w) => w.totalExpenses);
    const meanExp = avg(expenseValues);
    const highExpWeeks = expenseWeeks.filter((w) => w.totalExpenses > meanExp * 1.5);
    if (highExpWeeks.length >= 1) {
      leaks.push({
        type: "expense_spike",
        severity: "info",
        emoji: "💰",
        message: `${highExpWeeks.length} недел(я) с расходами на 50%+ выше среднего (${Math.round(meanExp)} ₽/нед).`,
        recommendation: "Найди триггеры импульсивных трат. Установи недельный лимит.",
        weeks: highExpWeeks.map((w) => w.weekNum),
      });
    }
  }

  // 6. Data tracking dropout
  const trackingRates = weeks.map((w) => w.dataScore);
  if (trackingRates.length >= 4 && trackingRates[0] >= 60 && trackingRates[3] < 30) {
    leaks.push({
      type: "tracking_dropout",
      severity: "warning",
      emoji: "📋",
      message: "Трекинг данных снизился к концу месяца. Без данных — нет анализа.",
      recommendation: "Добавь утренний чекап в телефон как напоминание на 8:00.",
    });
  }

  // 7. Stress accumulation
  const stressDays = days.filter((d) => d.stress !== null && d.stress >= 7);
  if (stressDays.length >= 5) {
    leaks.push({
      type: "high_stress",
      severity: stressDays.length >= 10 ? "critical" : "warning",
      emoji: "🌡️",
      message: `${stressDays.length} дней за месяц с высоким стрессом (≥7).`,
      recommendation:
        "Введи практику снятия стресса: дыхание, прогулка, медитация. Минимум 10 мин/день.",
    });
  }

  // 8. Sleep deficit
  const sleepDays = days.filter((d) => d.sleepHours !== null);
  if (sleepDays.length >= 7) {
    const avgSleep = avg(sleepDays.map((d) => d.sleepHours!));
    if (avgSleep < 6.5) {
      leaks.push({
        type: "sleep_deficit",
        severity: avgSleep < 6 ? "critical" : "warning",
        emoji: "😴",
        message: `Среднее время сна за месяц: ${avgSleep.toFixed(1)} ч. Норма — 7-8 часов.`,
        recommendation: "Установи жёсткое время отбоя. Сон — фундамент всего остального.",
      });
    }
  }

  // 9. Checkin consistency
  const totalCheckins = days.filter((d) => d.morningCheckinDone).length;
  const pastDays = days.filter((d) => new Date(d.date) < new Date()).length;
  if (pastDays >= 14 && totalCheckins / pastDays < 0.4) {
    leaks.push({
      type: "low_tracking",
      severity: "info",
      emoji: "📊",
      message: `Только ${totalCheckins} из ${pastDays} прошедших дней с чекапом (${Math.round((totalCheckins / pastDays) * 100)}%).`,
      recommendation:
        'Трекинг — основа улучшений. Начни с одного вопроса утром: "Сколько энергии сегодня?"',
    });
  }

  return leaks;
}

interface Trend {
  metric: string;
  direction: "up" | "down" | "stable";
  delta: number;
  label: string;
  emoji: string;
}

function detectTrends(weeks: WeekSummary[]): Trend[] {
  const trends: Trend[] = [];
  const validWeeks = weeks.filter((w) => w.dataScore > 0);
  if (validWeeks.length < 2) return trends;

  const first = validWeeks[0];
  const last = validWeeks[validWeeks.length - 1];

  const addTrend = (metric: keyof WeekSummary, label: string, emoji: string) => {
    const v1 = first[metric] as number;
    const v2 = last[metric] as number;
    if (v1 === 0 && v2 === 0) return;
    const delta = v2 - v1;
    const direction: "up" | "down" | "stable" =
      Math.abs(delta) < 0.5 ? "stable" : delta > 0 ? "up" : "down";
    trends.push({
      metric: metric as string,
      direction,
      delta: Math.round(delta * 10) / 10,
      label,
      emoji,
    });
  };

  if (first.avgMood > 0 || last.avgMood > 0) addTrend("avgMood", "Настроение", "🎭");
  if (first.avgEnergy > 0 || last.avgEnergy > 0) addTrend("avgEnergy", "Энергия", "⚡");
  if (first.avgEveningRating > 0 || last.avgEveningRating > 0)
    addTrend("avgEveningRating", "Оценка дня", "🌙");
  addTrend("gymDays", "Тренировки", "💪");
  addTrend("ritualsCompletionRate", "Ритуалы %", "🔥");
  addTrend("habitsTotal", "Привычки", "🔄");
  addTrend("tasksCompleted", "Дела", "✅");

  return trends;
}

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function get30DaysAgo(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 29);
  d.setHours(0, 0, 0, 0);
  return d;
}
