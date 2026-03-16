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
  if (typeof date === 'string') {
    // For YYYY-MM-DD strings, parse as local to avoid UTC offset issues
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return parseDateKey(date)
    }
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d
  }
  const d = new Date(date)
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
 * Uses LOCAL date components to avoid UTC timezone off-by-one bugs
 */
export function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Parse a YYYY-MM-DD string to a normalized Date (local midnight)
 * Uses explicit year/month/day to avoid UTC parsing issues
 */
export function parseDateKey(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day, 0, 0, 0, 0)
}

/**
 * Get today's date normalized to start of day
 */
export function getToday(): Date {
  return normalizeToDate(new Date())
}

/**
 * Get today as a YYYY-MM-DD string using LOCAL date (not UTC)
 * Use this instead of new Date().toISOString().split('T')[0]
 */
export function getTodayKey(): string {
  return formatDateKey(new Date())
}

/**
 * Get tomorrow as a YYYY-MM-DD string using LOCAL date
 */
export function getTomorrowKey(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return formatDateKey(d)
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
