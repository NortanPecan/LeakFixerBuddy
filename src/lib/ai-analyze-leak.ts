/**
 * Shared AI leak analysis logic.
 * Используется и в /api/ai/analyze-leak и в Telegram webhook напрямую,
 * без self-referential HTTP-запросов.
 */

import { db } from "@/lib/db";
import { callAI } from "@/lib/ai-provider";
import {
  buildLeakAnalysisMessage,
  getLeakAnalysisSystemPrompt,
  parseLeakAnalysis,
  type LeakAnalysis,
  type PastPattern,
  type UserContextForPrompt,
} from "@/lib/ai-leak-prompts";

export interface AnalyzeLeakInput {
  userId: string;
  leakType: string;
  leakMessage: string;
  severity?: string;
  /** Для лога: 'analyze-leak' | 'telegram-leak' */
  callType?: string;
}

export interface AnalyzeLeakResult {
  analysis: LeakAnalysis;
  provider: "groq" | "gemini";
}

export async function analyzeLeakWithAI(input: AnalyzeLeakInput): Promise<AnalyzeLeakResult> {
  const { userId, leakType, leakMessage, severity = "warning", callType = "analyze-leak" } = input;

  // ── 1. Загружаем контекст пользователя ─────────────────────────────────

  const [profile, recentStates, recentCheckins, activePeriod, recentRituals, existingPattern] =
    await Promise.all([
      db.userProfile.findUnique({
        where: { userId },
        select: { age: true, workProfile: true, targetWeight: true, leakProfile: true },
      }),
      db.dailyState.findMany({
        where: { userId, date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        select: { mood: true, energy: true, sleepHours: true },
      }),
      db.dailyCheckin
        .findMany({
          where: {
            userId,
            date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            type: "morning",
          },
          select: { energy: true },
        })
        .catch(() => [] as { energy: number | null }[]),
      db.gymPeriod.findFirst({
        where: { userId, isActive: true },
        select: { id: true },
      }),
      db.ritualCompletion
        .findMany({
          where: { userId, date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
          select: { completed: true },
        })
        .catch(() => [] as { completed: boolean }[]),
      db.userAiPattern.findUnique({
        where: { userId_leakType: { userId, leakType } },
      }),
    ]);

  // Тренировок за 7 дней
  let gymDays = 0;
  if (activePeriod) {
    gymDays = await db.gymWorkout
      .count({
        where: {
          periodId: activePeriod.id,
          date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          completed: true,
        },
      })
      .catch(() => 0);
  }

  // Средние значения
  const moodDays = recentStates.filter((d) => d.mood);
  const energyDays = recentCheckins.filter((c) => c.energy);
  const sleepDays = recentStates.filter((d) => d.sleepHours);

  const avgMood = moodDays.length
    ? moodDays.reduce((s, d) => s + (d.mood ?? 0), 0) / moodDays.length
    : 0;
  const avgEnergy = energyDays.length
    ? energyDays.reduce((s, c) => s + (c.energy ?? 0), 0) / energyDays.length
    : 0;
  const avgSleep = sleepDays.length
    ? sleepDays.reduce((s, d) => s + (d.sleepHours ?? 0), 0) / sleepDays.length
    : 0;
  const ritualRate = recentRituals.length
    ? (recentRituals.filter((r) => r.completed).length / recentRituals.length) * 100
    : 0;

  // История паттернов
  const pastPatterns: PastPattern[] = [];
  if (existingPattern) {
    const tried = (existingPattern.triedSolutions as { text: string }[]) ?? [];
    const worked = (existingPattern.whatWorked as string[]) ?? [];
    pastPatterns.push({
      leakType,
      triedSolutions: tried.map((t) => t.text),
      whatWorked: worked,
    });
  }

  const userCtx: UserContextForPrompt = {
    leakProfile: (profile?.leakProfile as string[]) ?? [],
    profile: {
      age: profile?.age ?? undefined,
      workProfile: profile?.workProfile ?? undefined,
      targetWeight: profile?.targetWeight ?? undefined,
    },
    recentStats: {
      avgMood: Number(avgMood.toFixed(1)),
      avgEnergy: Number(avgEnergy.toFixed(1)),
      gymDays,
      ritualRate: Number(ritualRate.toFixed(0)),
      sleepAvg: Number(avgSleep.toFixed(1)),
      avgCalories: 0,
    },
    pastPatterns,
  };

  // ── 2. Вызываем AI ──────────────────────────────────────────────────────

  const systemPrompt = getLeakAnalysisSystemPrompt();
  const userMessage = buildLeakAnalysisMessage(leakType, leakMessage, severity, userCtx);

  const aiResult = await callAI(systemPrompt, userMessage, { userId, callType, leakType });

  const analysis = parseLeakAnalysis(aiResult.text);
  analysis.provider = aiResult.provider;

  // ── 3. Сохраняем паттерн ────────────────────────────────────────────────

  const existingSolutions = (existingPattern?.triedSolutions ?? []) as { text: string }[];
  const newTriedEntries = analysis.solutions
    .filter((s) => !existingSolutions.some((e) => e.text === s.text))
    .map((s) => ({ text: s.text, triedAt: new Date().toISOString(), worked: null }));

  await db.userAiPattern.upsert({
    where: { userId_leakType: { userId, leakType } },
    update: {
      lastAnalysis: analysis as object,
      triedSolutions: [...existingSolutions, ...newTriedEntries],
      analysisCount: { increment: 1 },
      lastProvider: aiResult.provider,
    },
    create: {
      userId,
      leakType,
      lastAnalysis: analysis as object,
      triedSolutions: newTriedEntries,
      whatWorked: [],
      analysisCount: 1,
      lastProvider: aiResult.provider,
    },
  });

  return { analysis, provider: aiResult.provider };
}
