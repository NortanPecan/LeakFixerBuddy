// Wellbeing Tracker v1.0 - Utility Functions for Normalization and Scoring

import {
  PresetLevel,
  Scale,
  Frequency,
  WellbeingQuestion,
  WELLBEING_QUESTIONS,
  getDailyQuestionsCount as configGetDailyQuestionsCount,
  getWeeklyQuestionsCount as configGetWeeklyQuestionsCount,
} from "./wellbeing-config";

// ===========================================
// TYPES
// ===========================================

export interface WellbeingScores {
  overall: number; // 0-1 normalized
  as10Scale: number; // 1-10 for comparison with mood/energy
  byCategory: Record<
    string,
    {
      score: number; // 0-1 normalized
      count: number;
    }
  >;
}

export interface DailyAnalyticsPoint {
  date: string;
  dayOfWeek: number;

  // From DailyState (existing)
  mood: number | null; // 1-10
  energy: number | null; // 1-10

  // From DailyWellbeing (new)
  wellbeingScore: number; // 1-10 (normalized from 1-5)
  wellbeingByCategory: Record<string, number>;

  // Computed
  deltaMoodWellbeing: number | null; // mood - wellbeingScore
}

// ===========================================
// NORMALIZATION FUNCTIONS
// ===========================================

/**
 * Normalize any scale to 0-1 range
 *
 * 1-5 scale: 1 → 0, 5 → 1
 * hours (sleep): optimal 7-9 → 1.0, deviation reduces score
 */
export function normalizeTo01(value: number, scale: Scale): number {
  switch (scale) {
    case "1-5":
      return Math.max(0, Math.min(1, (value - 1) / 4));
    case "hours":
      // For sleep: optimal is 7-9 hours
      const optimal = 8;
      const deviation = Math.abs(value - optimal);
      if (deviation <= 1) return 1.0; // 7-9 hours → excellent
      if (deviation <= 2) return 0.8; // 6 or 10 → good
      if (deviation <= 3) return 0.6; // 5 or 11 → okay
      if (deviation <= 4) return 0.4; // 4 or 12 → poor
      return Math.max(0.1, 0.4 - (deviation - 4) * 0.1);
    default:
      return Math.max(0, Math.min(1, value));
  }
}

/**
 * Convert 0-1 normalized value to 1-10 scale
 * Used for comparing wellbeing with mood/energy
 */
export function toScale10(normalized: number): number {
  const clamped = Math.max(0, Math.min(1, normalized));
  return Math.round(clamped * 9 + 1);
}

/**
 * Convert 0-1 normalized value to 1-5 scale
 */
export function toScale5(normalized: number): number {
  const clamped = Math.max(0, Math.min(1, normalized));
  return Math.round(clamped * 4 + 1);
}

// ===========================================
// SCORE CALCULATION
// ===========================================

/**
 * Calculate wellbeing score from answers
 */
export function calculateWellbeingScore(
  answers: Record<string, number>,
  preset: PresetLevel,
  frequency: Frequency = "daily"
): WellbeingScores {
  const questions = getQuestionsInPreset(preset, frequency);
  const byCategory: Record<string, { sum: number; weight: number; count: number }> = {};

  let totalWeight = 0;
  let weightedSum = 0;

  for (const q of questions) {
    if (answers[q.id] !== undefined && answers[q.id] !== null) {
      const normalized = normalizeTo01(answers[q.id], q.scale);

      if (!byCategory[q.category]) {
        byCategory[q.category] = { sum: 0, weight: 0, count: 0 };
      }
      byCategory[q.category].sum += normalized * q.weight;
      byCategory[q.category].weight += q.weight;
      byCategory[q.category].count++;

      weightedSum += normalized * q.weight;
      totalWeight += q.weight;
    }
  }

  const overall = totalWeight > 0 ? weightedSum / totalWeight : 0.5;

  const categoryScores: Record<string, { score: number; count: number }> = {};
  for (const [cat, data] of Object.entries(byCategory)) {
    categoryScores[cat] = {
      score: data.weight > 0 ? data.sum / data.weight : 0.5,
      count: data.count,
    };
  }

  return {
    overall,
    as10Scale: toScale10(overall),
    byCategory: categoryScores,
  };
}

/**
 * Get questions for preset and frequency (filter from WELLBEING_QUESTIONS)
 */
export function getQuestionsInPreset(
  preset: PresetLevel,
  frequency?: Frequency
): WellbeingQuestion[] {
  return WELLBEING_QUESTIONS.filter(
    (q) => q.presets.includes(preset) && (frequency ? q.frequency === frequency : true)
  ).sort((a, b) => a.order - b.order);
}

// Helper function alias
function getQuestionsInPresetFilter(
  preset: PresetLevel,
  frequency?: Frequency
): WellbeingQuestion[] {
  return getQuestionsInPreset(preset, frequency);
}

// ===========================================
// ISO WEEK UTILITIES
// ===========================================

/**
 * Get ISO week number and year for a date
 */
export function getISOWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

  return {
    year: d.getUTCFullYear(),
    week,
  };
}

/**
 * Get the start and end dates of an ISO week
 */
export function getISOWeekDates(year: number, week: number): { start: Date; end: Date } {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOWeekStart = new Date(simple);
  if (dow <= 4) {
    ISOWeekStart.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    ISOWeekStart.setDate(simple.getDate() + 8 - simple.getDay());
  }
  const ISOWeekEnd = new Date(ISOWeekStart);
  ISOWeekEnd.setDate(ISOWeekStart.getDate() + 6);

  return { start: ISOWeekStart, end: ISOWeekEnd };
}

// ===========================================
// ANSWERS COUNT HELPERS
// ===========================================

/**
 * Count how many questions have been answered
 */
export function countAnsweredQuestions(
  answers: Record<string, number>,
  preset: PresetLevel,
  frequency: Frequency = "daily"
): number {
  const questions = getQuestionsInPreset(preset, frequency);
  return questions.filter((q) => answers[q.id] !== undefined && answers[q.id] !== null).length;
}

/**
 * Check if all questions are answered
 */
export function isComplete(
  answers: Record<string, number>,
  preset: PresetLevel,
  frequency: Frequency = "daily"
): boolean {
  const questions = getQuestionsInPreset(preset, frequency);
  return questions.every((q) => answers[q.id] !== undefined && answers[q.id] !== null);
}

/**
 * Get daily questions count for preset
 */
export function getDailyQuestionsCount(preset: PresetLevel): number {
  return configGetDailyQuestionsCount(preset);
}

/**
 * Get weekly questions count for preset
 */
export function getWeeklyQuestionsCount(preset: PresetLevel): number {
  return configGetWeeklyQuestionsCount(preset);
}

// Export alias for backwards compatibility
export { getQuestionsInPresetFilter as getQuestionsForPreset };
