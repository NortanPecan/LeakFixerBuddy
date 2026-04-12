/**
 * Deterministic streak calculation utilities.
 *
 * The pure object-based APIs require an explicit referenceDate so the engine
 * can be replayed reliably for historical dates and tests. Legacy wrappers are
 * kept for compatibility and default to the current system date.
 */

import type {
  CompletionStatus,
  DateInput,
  DateKey,
  HabitFrequency,
  RequiredDateContext,
  Schedule,
  Weekday,
} from "./date-types";
import { EVERY_DAY_SCHEDULE } from "./date-types";
import {
  addDaysToDateKey,
  enumerateDateKeys,
  formatDateKey,
  getDayOfWeek,
  getStartOfDay,
  getWeekStartDateKey,
  normalizeWeekdaySchedule,
  parseDateKey,
} from "./date-utils";

export interface CompletionEntry {
  date: DateInput;
  completed: boolean;
  count?: number;
}

export interface StreakResult {
  /** Current consecutive completions */
  streak: number;
  /** Maximum streak in the period */
  maxStreak: number;
  /** Number of scheduled units in the period */
  scheduledDays: number;
  /** Number of completed scheduled units */
  completedScheduledDays: number;
  /** Completion rate for scheduled units only */
  completionRate: number;
}

export interface RitualStreakInput extends RequiredDateContext {
  completions: readonly CompletionEntry[];
  scheduledDays?: readonly number[];
  periodDays?: number;
  dailyTarget?: number;
}

export interface HabitStreakInput extends RequiredDateContext {
  completions: readonly CompletionEntry[];
  frequency?: HabitFrequency;
  periodDays?: number;
  dailyTarget?: number;
  weeklyTarget?: number;
}

interface LegacyStreakOptions {
  referenceDate?: DateInput;
  timeZone?: string;
  periodDays?: number;
  dailyTarget?: number;
}

interface LegacyHabitOptions extends LegacyStreakOptions {
  weeklyTarget?: number;
}

interface NormalizedCompletionDay extends CompletionStatus {
  dateKey: DateKey;
}

interface DailyStreakCalculationInput extends RequiredDateContext {
  completions: readonly CompletionEntry[];
  scheduledDays?: readonly number[];
  periodDays: number;
  target: number;
}

function assertPositiveInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`${label} must be a positive integer`);
  }

  return value;
}

function normalizeCount(entry: CompletionEntry): number {
  if (entry.count === undefined) {
    return entry.completed ? 1 : 0;
  }

  if (!Number.isFinite(entry.count) || entry.count < 0) {
    throw new RangeError(`Invalid completion count for ${String(entry.date)}`);
  }

  return Math.floor(entry.count);
}

function buildCompletionMap(
  completions: readonly CompletionEntry[],
  target: number,
  timeZone?: string
): Map<DateKey, NormalizedCompletionDay> {
  const completionMap = new Map<DateKey, NormalizedCompletionDay>();

  for (const completion of completions) {
    const dateKey = formatDateKey(completion.date, { timeZone });
    const count = normalizeCount(completion);
    const existing = completionMap.get(dateKey);
    const nextCount = (existing?.count ?? 0) + count;
    const nextCompleted =
      Boolean(existing?.completed) || completion.completed || nextCount >= target;

    completionMap.set(dateKey, {
      dateKey,
      count: nextCount,
      completed: nextCompleted,
      target,
    });
  }

  return completionMap;
}

function normalizePeriodDays(periodDays?: number): number {
  return assertPositiveInteger(periodDays ?? 30, "periodDays");
}

function normalizeTarget(target: number | undefined, label: string): number {
  return assertPositiveInteger(target ?? 1, label);
}

export function parseScheduleDays(serializedDays: string | null | undefined): Schedule {
  if (!serializedDays) {
    return EVERY_DAY_SCHEDULE;
  }

  try {
    const parsed = JSON.parse(serializedDays) as unknown;
    return Array.isArray(parsed) ? normalizeWeekdaySchedule(parsed) : EVERY_DAY_SCHEDULE;
  } catch {
    return EVERY_DAY_SCHEDULE;
  }
}

export function isScheduledDay(
  date: DateInput,
  scheduledDays: readonly number[] = EVERY_DAY_SCHEDULE,
  timeZone?: string
): boolean {
  const schedule = normalizeWeekdaySchedule(scheduledDays);
  return schedule.includes(getDayOfWeek(date, { timeZone }));
}

function calculateDailyScheduledStreak(input: DailyStreakCalculationInput): StreakResult {
  const periodDays = normalizePeriodDays(input.periodDays);
  const target = normalizeTarget(input.target, "target");
  const schedule = normalizeWeekdaySchedule(input.scheduledDays);
  const referenceDateKey = formatDateKey(input.referenceDate, { timeZone: input.timeZone });
  const startDateKey = addDaysToDateKey(referenceDateKey, -(periodDays - 1));
  const completionMap = buildCompletionMap(input.completions, target, input.timeZone);

  let streak = 0;
  for (let offset = 0; offset < periodDays; offset += 1) {
    const dateKey = addDaysToDateKey(referenceDateKey, -offset);
    if (!schedule.includes(getDayOfWeek(dateKey))) {
      continue;
    }

    const completion = completionMap.get(dateKey);
    if (completion?.completed) {
      streak += 1;
      continue;
    }

    if (offset === 0) {
      continue;
    }

    break;
  }

  let maxStreak = 0;
  let currentStreak = 0;
  let scheduledDays = 0;
  let completedScheduledDays = 0;

  for (const dateKey of enumerateDateKeys(startDateKey, referenceDateKey)) {
    if (!schedule.includes(getDayOfWeek(dateKey))) {
      continue;
    }

    scheduledDays += 1;
    const completion = completionMap.get(dateKey);
    if (completion?.completed) {
      completedScheduledDays += 1;
      currentStreak += 1;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  const completionRate =
    scheduledDays === 0 ? 0 : Math.round((completedScheduledDays / scheduledDays) * 100);

  return {
    streak,
    maxStreak,
    scheduledDays,
    completedScheduledDays,
    completionRate,
  };
}

function calculateWeeklyTargetStreak(input: HabitStreakInput): StreakResult {
  const periodDays = normalizePeriodDays(input.periodDays);
  const weeklyTarget = normalizeTarget(input.weeklyTarget, "weeklyTarget");
  const referenceDateKey = formatDateKey(input.referenceDate, { timeZone: input.timeZone });
  const startDateKey = addDaysToDateKey(referenceDateKey, -(periodDays - 1));
  const referenceWeekStartKey = getWeekStartDateKey(referenceDateKey);
  const completionMap = buildCompletionMap(input.completions, 1, input.timeZone);

  const weeklyCounts = new Map<DateKey, number>();
  for (const dateKey of enumerateDateKeys(startDateKey, referenceDateKey)) {
    const weekStartKey = getWeekStartDateKey(dateKey);
    const count = completionMap.get(dateKey)?.count ?? 0;
    weeklyCounts.set(weekStartKey, (weeklyCounts.get(weekStartKey) ?? 0) + count);
  }

  const weekStartKeys = Array.from(weeklyCounts.keys()).sort((left, right) =>
    left.localeCompare(right)
  );
  if (weekStartKeys.length === 0) {
    weekStartKeys.push(referenceWeekStartKey);
    weeklyCounts.set(referenceWeekStartKey, 0);
  }

  let streak = 0;
  for (let index = weekStartKeys.length - 1; index >= 0; index -= 1) {
    const weekStartKey = weekStartKeys[index];
    const weekCount = weeklyCounts.get(weekStartKey) ?? 0;
    const isCompletedWeek = weekCount >= weeklyTarget;

    if (isCompletedWeek) {
      streak += 1;
      continue;
    }

    if (weekStartKey === referenceWeekStartKey) {
      continue;
    }

    break;
  }

  let maxStreak = 0;
  let currentStreak = 0;
  let completedScheduledDays = 0;

  for (const weekStartKey of weekStartKeys) {
    const weekCount = weeklyCounts.get(weekStartKey) ?? 0;
    completedScheduledDays += Math.min(weekCount, weeklyTarget);

    if (weekCount >= weeklyTarget) {
      currentStreak += 1;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  const scheduledDays = weekStartKeys.length * weeklyTarget;
  const completionRate =
    scheduledDays === 0 ? 0 : Math.round((completedScheduledDays / scheduledDays) * 100);

  return {
    streak,
    maxStreak,
    scheduledDays,
    completedScheduledDays,
    completionRate,
  };
}

export function calculateRitualStreak(input: RitualStreakInput): StreakResult {
  return calculateDailyScheduledStreak({
    completions: input.completions,
    scheduledDays: input.scheduledDays,
    periodDays: normalizePeriodDays(input.periodDays),
    target: normalizeTarget(input.dailyTarget, "dailyTarget"),
    referenceDate: input.referenceDate,
    timeZone: input.timeZone,
  });
}

/**
 * Legacy wrapper kept for compatibility.
 * Prefer calculateRitualStreak for deterministic usage.
 */
export function calculateStreak(
  completions: readonly CompletionEntry[],
  scheduledDays?: readonly number[],
  periodDays?: number | LegacyStreakOptions,
  legacyOptions?: LegacyStreakOptions
): StreakResult {
  const options = typeof periodDays === "number" ? legacyOptions : periodDays;

  return calculateRitualStreak({
    completions,
    scheduledDays,
    periodDays: typeof periodDays === "number" ? periodDays : options?.periodDays,
    dailyTarget: options?.dailyTarget,
    referenceDate: options?.referenceDate ?? new Date(),
    timeZone: options?.timeZone,
  });
}

function calculateHabitStreakFromInput(input: HabitStreakInput): StreakResult {
  const frequency = input.frequency ?? "daily";

  if (frequency === "daily") {
    return calculateDailyScheduledStreak({
      completions: input.completions,
      scheduledDays: EVERY_DAY_SCHEDULE,
      periodDays: normalizePeriodDays(input.periodDays),
      target: normalizeTarget(input.dailyTarget, "dailyTarget"),
      referenceDate: input.referenceDate,
      timeZone: input.timeZone,
    });
  }

  return calculateWeeklyTargetStreak(input);
}

export function calculateHabitStreak(input: HabitStreakInput): StreakResult;
export function calculateHabitStreak(
  completions: readonly CompletionEntry[],
  frequency?: HabitFrequency,
  weeklyTarget?: number,
  periodDays?: number | LegacyHabitOptions,
  legacyOptions?: LegacyHabitOptions
): StreakResult;
export function calculateHabitStreak(
  inputOrCompletions: HabitStreakInput | readonly CompletionEntry[],
  frequency: HabitFrequency = "daily",
  weeklyTarget: number = 7,
  periodDays?: number | LegacyHabitOptions,
  legacyOptions?: LegacyHabitOptions
): StreakResult {
  if (!Array.isArray(inputOrCompletions)) {
    return calculateHabitStreakFromInput(inputOrCompletions);
  }

  const options = typeof periodDays === "number" ? legacyOptions : periodDays;

  return calculateHabitStreakFromInput({
    completions: inputOrCompletions,
    frequency,
    weeklyTarget,
    periodDays: typeof periodDays === "number" ? periodDays : options?.periodDays,
    dailyTarget: options?.dailyTarget,
    referenceDate: options?.referenceDate ?? new Date(),
    timeZone: options?.timeZone,
  });
}

/**
 * Get the next scheduled date after a given date.
 */
export function getNextScheduledDate(
  fromDate: Date,
  scheduledDays: readonly number[] = EVERY_DAY_SCHEDULE
): Date {
  const schedule = normalizeWeekdaySchedule(scheduledDays);
  const fromDateKey = formatDateKey(getStartOfDay(fromDate));

  for (let offset = 1; offset <= 7; offset += 1) {
    const nextDateKey = addDaysToDateKey(fromDateKey, offset);
    if (schedule.includes(getDayOfWeek(nextDateKey))) {
      return parseDateKey(nextDateKey);
    }
  }

  return parseDateKey(addDaysToDateKey(fromDateKey, 1));
}
