import type { DateContext, DateInput, DateKey, Schedule, Weekday } from "./date-types";
import { EVERY_DAY_SCHEDULE, ISO_WEEK_START } from "./date-types";

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const UTC_NOON_HOUR = 12;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const formatterCache = new Map<string, Intl.DateTimeFormat>();

interface DateParts {
  year: number;
  month: number;
  day: number;
}

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = formatterCache.get(timeZone);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  formatterCache.set(timeZone, formatter);
  return formatter;
}

function isValidDate(value: Date): boolean {
  return Number.isFinite(value.getTime());
}

function assertValidDate(value: Date, label: string): void {
  if (!isValidDate(value)) {
    throw new RangeError(`Invalid ${label}`);
  }
}

function assertInteger(value: number, label: string): void {
  if (!Number.isInteger(value)) {
    throw new RangeError(`${label} must be an integer`);
  }
}

function buildDateKey(year: number, month: number, day: number): DateKey {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` as DateKey;
}

function parseDateKeyParts(dateKey: string): DateParts {
  const match = DATE_KEY_PATTERN.exec(dateKey);
  if (!match) {
    throw new RangeError(`Invalid date key: ${dateKey}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const parsed = new Date(year, month - 1, day, 0, 0, 0, 0);
  assertValidDate(parsed, "date key");

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    throw new RangeError(`Invalid calendar date: ${dateKey}`);
  }

  return { year, month, day };
}

function resolveDateInstance(date: DateInput): Date {
  if (date instanceof Date) {
    const clone = new Date(date);
    assertValidDate(clone, "date");
    return clone;
  }

  if (DATE_KEY_PATTERN.test(date)) {
    return parseDateKey(date);
  }

  const parsed = new Date(date);
  assertValidDate(parsed, "date");
  return parsed;
}

function getDateParts(date: DateInput, timeZone?: string): DateParts {
  if (typeof date === "string" && DATE_KEY_PATTERN.test(date)) {
    return parseDateKeyParts(date);
  }

  const resolved = resolveDateInstance(date);
  if (!timeZone) {
    return {
      year: resolved.getFullYear(),
      month: resolved.getMonth() + 1,
      day: resolved.getDate(),
    };
  }

  const parts = getFormatter(timeZone).formatToParts(resolved);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  if (!year || !month || !day) {
    throw new RangeError(`Unable to resolve date parts for time zone: ${timeZone}`);
  }

  return { year, month, day };
}

function createUtcNoonDate(dateKey: DateKey): Date {
  const { year, month, day } = parseDateKeyParts(dateKey);
  return new Date(Date.UTC(year, month - 1, day, UTC_NOON_HOUR, 0, 0, 0));
}

export function assertDateKey(dateKey: string): DateKey {
  const { year, month, day } = parseDateKeyParts(dateKey);
  return buildDateKey(year, month, day);
}

/**
 * Normalize a date input to the canonical local-date representation used by the DB.
 *
 * When a time zone is provided, the calendar day is resolved in that time zone first,
 * then converted to the canonical local midnight Date for storage and comparisons.
 */
export function normalizeToDate(date: DateInput, context: DateContext = {}): Date {
  return parseDateKey(formatDateKey(date, context));
}

/**
 * Get start of day (00:00:00.000) for a date.
 */
export function getStartOfDay(date: DateInput, context: DateContext = {}): Date {
  return normalizeToDate(date, context);
}

/**
 * Get the exclusive upper bound for the next day (00:00:00.000).
 */
export function getStartOfNextDay(date: DateInput, context: DateContext = {}): Date {
  return parseDateKey(addDaysToDateKey(formatDateKey(date, context), 1));
}

/**
 * Get end of day (23:59:59.999) for a date.
 */
export function getEndOfDay(date: DateInput, context: DateContext = {}): Date {
  return new Date(getStartOfNextDay(date, context).getTime() - 1);
}

/**
 * Format a date as a YYYY-MM-DD key using the selected time zone.
 */
export function formatDateKey(date: DateInput, context: DateContext = {}): DateKey {
  if (typeof date === "string" && DATE_KEY_PATTERN.test(date)) {
    return assertDateKey(date);
  }

  const parts = getDateParts(date, context.timeZone);
  return buildDateKey(parts.year, parts.month, parts.day);
}

/**
 * Parse a YYYY-MM-DD key to the canonical local midnight Date used by the DB.
 */
export function parseDateKey(dateStr: string): Date {
  const { year, month, day } = parseDateKeyParts(dateStr);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Compare two date keys lexicographically after validation.
 */
export function compareDateKeys(left: string, right: string): number {
  const normalizedLeft = assertDateKey(left);
  const normalizedRight = assertDateKey(right);

  if (normalizedLeft < normalizedRight) {
    return -1;
  }

  if (normalizedLeft > normalizedRight) {
    return 1;
  }

  return 0;
}

/**
 * Add calendar days to a date key.
 */
export function addDaysToDateKey(dateKey: string, days: number): DateKey {
  assertInteger(days, "days");

  const normalizedDateKey = assertDateKey(dateKey);
  const date = createUtcNoonDate(normalizedDateKey);
  date.setUTCDate(date.getUTCDate() + days);

  return buildDateKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/**
 * Get the signed day distance between two date keys.
 */
export function diffDateKeys(left: string, right: string): number {
  const normalizedLeft = createUtcNoonDate(assertDateKey(left));
  const normalizedRight = createUtcNoonDate(assertDateKey(right));
  return Math.round((normalizedLeft.getTime() - normalizedRight.getTime()) / MS_PER_DAY);
}

/**
 * Enumerate date keys between two dates, inclusive.
 */
export function enumerateDateKeys(start: string, end: string): DateKey[] {
  const startKey = assertDateKey(start);
  const endKey = assertDateKey(end);

  if (compareDateKeys(startKey, endKey) > 0) {
    return [];
  }

  const dateKeys: DateKey[] = [];
  for (
    let cursor = startKey;
    compareDateKeys(cursor, endKey) <= 0;
    cursor = addDaysToDateKey(cursor, 1)
  ) {
    dateKeys.push(cursor);
  }

  return dateKeys;
}

/**
 * Get the date key for the start of the ISO week (Monday by default).
 */
export function getWeekStartDateKey(
  date: DateInput,
  weekStartsOn: Weekday = ISO_WEEK_START,
  context: DateContext = {}
): DateKey {
  const dateKey = formatDateKey(date, context);
  const dayOfWeek = getDayOfWeek(dateKey);
  const diff = (dayOfWeek - weekStartsOn + 7) % 7;
  return addDaysToDateKey(dateKey, -diff);
}

/**
 * Normalize a schedule-like array of weekdays.
 */
export function normalizeWeekdaySchedule(days?: readonly number[] | null): Schedule {
  if (!days || days.length === 0) {
    return EVERY_DAY_SCHEDULE;
  }

  const uniqueDays = new Set<Weekday>();
  for (const day of days) {
    if (!Number.isInteger(day) || day < 1 || day > 7) {
      throw new RangeError(`Invalid weekday value: ${String(day)}`);
    }

    uniqueDays.add(day as Weekday);
  }

  return Array.from(uniqueDays).sort((left, right) => left - right);
}

/**
 * Get today's date normalized to start of day.
 */
export function getToday(context: DateContext = {}): Date {
  return normalizeToDate(context.referenceDate ?? new Date(), context);
}

/**
 * Get today as a YYYY-MM-DD key using the selected time zone.
 */
export function getTodayKey(context: DateContext = {}): DateKey {
  return formatDateKey(context.referenceDate ?? new Date(), context);
}

/**
 * Get tomorrow as a YYYY-MM-DD key using the selected time zone.
 */
export function getTomorrowKey(context: DateContext = {}): DateKey {
  return addDaysToDateKey(getTodayKey(context), 1);
}

/**
 * Check if two dates resolve to the same calendar day.
 */
export function isSameDay(left: DateInput, right: DateInput, context: DateContext = {}): boolean {
  return formatDateKey(left, context) === formatDateKey(right, context);
}

/**
 * Get the normalized date N days ago from the selected reference date.
 */
export function getDaysAgo(days: number, context: DateContext = {}): Date {
  assertInteger(days, "days");
  return parseDateKey(addDaysToDateKey(getTodayKey(context), -days));
}

/**
 * Get day of week (1-7, where 1 is Monday and 7 is Sunday).
 */
export function getDayOfWeek(date: DateInput, context: DateContext = {}): Weekday {
  const normalizedDate = parseDateKey(formatDateKey(date, context));
  const day = normalizedDate.getDay();
  return (day === 0 ? 7 : day) as Weekday;
}
