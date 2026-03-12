/**
 * Date utilities for daily tracking
 * 
 * All dates in the daily tracking system are normalized to start of day (00:00:00.000)
 * to ensure consistent comparison and upsert operations in SQLite.
 */

/**
 * Normalize a date to the start of day (00:00:00.000 local time)
 * This is the canonical format for storing and comparing dates in the database.
 */
export function normalizeToDate(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Get start of day (00:00:00.000) for a date
 */
export function getStartOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Get end of day (23:59:59.999) for a date
 */
export function getEndOfDay(date: Date): Date {
  const d = getStartOfDay(date)
  d.setDate(d.getDate() + 1)
  return d
}

/**
 * Format a date as YYYY-MM-DD string (for API parameters)
 */
export function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Parse a YYYY-MM-DD string to a normalized Date
 */
export function parseDateKey(dateStr: string): Date {
  return normalizeToDate(dateStr)
}

/**
 * Get today's date normalized to start of day
 */
export function getToday(): Date {
  return normalizeToDate(new Date())
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(d1: Date, d2: Date): boolean {
  return formatDateKey(d1) === formatDateKey(d2)
}

/**
 * Get date N days ago
 */
export function getDaysAgo(days: number): Date {
  const d = getToday()
  d.setDate(d.getDate() - days)
  return d
}

/**
 * Get day of week (1-7, where 1 is Monday and 7 is Sunday)
 */
export function getDayOfWeek(date: Date): number {
  return date.getDay() || 7
}
