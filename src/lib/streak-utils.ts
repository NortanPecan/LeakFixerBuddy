/**
 * Streak calculation utilities
 *
 * Provides consistent streak calculation across different entity types:
 * - Rituals: respects scheduled days (e.g., weekdays only)
 * - Habits: respects frequency (e.g., 3 times per week)
 * - Challenges: generic streak based on consecutive completions
 */

import { normalizeToDate, formatDateKey, getDayOfWeek } from './date-utils'

export interface CompletionEntry {
  date: Date | string
  completed: boolean
}

export interface StreakResult {
  /** Current consecutive completions */
  streak: number
  /** Maximum streak in the period */
  maxStreak: number
  /** Number of scheduled days in the period */
  scheduledDays: number
  /** Number of completed scheduled days */
  completedScheduledDays: number
  /** Completion rate for scheduled days only */
  completionRate: number
}

/**
 * Calculate streak for an entity with scheduled days
 *
 * @param completions - Array of completion records with date and completed flag
 * @param scheduledDays - Array of day numbers (1=Monday, 7=Sunday) when the entity is scheduled
 * @param periodDays - Number of days to look back (default 30)
 * @returns StreakResult with streak, maxStreak, and completion metrics
 */
export function calculateStreak(
  completions: CompletionEntry[],
  scheduledDays: number[] = [1, 2, 3, 4, 5, 6, 7], // Default: every day
  periodDays: number = 30
): StreakResult {
  const today = normalizeToDate(new Date())

  // Build a map of completions by date
  const completionMap = new Map<string, boolean>()
  for (const c of completions) {
    const dateKey = formatDateKey(normalizeToDate(c.date))
    completionMap.set(dateKey, c.completed)
  }

  // Calculate streak: go backwards from today
  let streak = 0
  let checkDate = new Date(today)

  for (let i = 0; i < periodDays; i++) {
    const dateStr = formatDateKey(checkDate)
    const dayOfWeek = getDayOfWeek(checkDate)

    // Only check days that are scheduled
    if (scheduledDays.includes(dayOfWeek)) {
      const isCompleted = completionMap.get(dateStr)

      if (isCompleted) {
        streak++
      } else if (checkDate < today) {
        // Past scheduled day without completion breaks streak
        break
      }
      // Future or today without completion doesn't break streak yet
    }

    // Move to previous day
    checkDate.setDate(checkDate.getDate() - 1)
  }

  // Calculate max streak and scheduled days count
  let maxStreak = 0
  let currentStreak = 0
  let scheduledDaysCount = 0
  let completedScheduledDays = 0

  // Go through the entire period to count scheduled days and find max streak
  checkDate = new Date(today)
  checkDate.setDate(checkDate.getDate() - periodDays + 1)

  for (let i = 0; i < periodDays; i++) {
    const dateStr = formatDateKey(checkDate)
    const dayOfWeek = getDayOfWeek(checkDate)

    if (scheduledDays.includes(dayOfWeek)) {
      scheduledDaysCount++
      const isCompleted = completionMap.get(dateStr)

      if (isCompleted) {
        completedScheduledDays++
        currentStreak++
        maxStreak = Math.max(maxStreak, currentStreak)
      } else {
        currentStreak = 0
      }
    }

    checkDate.setDate(checkDate.getDate() + 1)
  }

  const completionRate = scheduledDaysCount > 0
    ? Math.round((completedScheduledDays / scheduledDaysCount) * 100)
    : 0

  return {
    streak,
    maxStreak,
    scheduledDays: scheduledDaysCount,
    completedScheduledDays,
    completionRate
  }
}

/**
 * Calculate streak for habits with frequency support
 *
 * @param completions - Array of completion records
 * @param frequency - 'daily' or 'weekly'
 * @param weeklyTarget - If frequency is 'weekly', how many times per week
 * @param periodDays - Number of days to look back
 * @returns StreakResult
 */
export function calculateHabitStreak(
  completions: CompletionEntry[],
  frequency: 'daily' | 'weekly' = 'daily',
  weeklyTarget: number = 7,
  periodDays: number = 30
): StreakResult {
  if (frequency === 'daily') {
    // Daily habits: every day is a scheduled day
    return calculateStreak(completions, [1, 2, 3, 4, 5, 6, 7], periodDays)
  }

  // Weekly habits: more complex logic
  // For now, treat as daily but adjust completion rate
  const result = calculateStreak(completions, [1, 2, 3, 4, 5, 6, 7], periodDays)

  // Adjust completion rate based on weekly target
  // For weekly habits, we expect `weeklyTarget` completions per 7 days
  const weeksInPeriod = Math.ceil(periodDays / 7)
  const expectedCompletions = weeksInPeriod * weeklyTarget
  const actualCompletions = completions.filter(c => c.completed).length

  const adjustedCompletionRate = expectedCompletions > 0
    ? Math.min(100, Math.round((actualCompletions / expectedCompletions) * 100))
    : 0

  return {
    ...result,
    completionRate: adjustedCompletionRate,
    scheduledDays: expectedCompletions,
    completedScheduledDays: actualCompletions
  }
}

/**
 * Check if a date is a scheduled day for the given schedule
 */
export function isScheduledDay(date: Date, scheduledDays: number[]): boolean {
  const dayOfWeek = getDayOfWeek(date)
  return scheduledDays.includes(dayOfWeek)
}

/**
 * Get the next scheduled date after a given date
 */
export function getNextScheduledDate(fromDate: Date, scheduledDays: number[]): Date {
  const nextDate = new Date(fromDate)
  nextDate.setDate(nextDate.getDate() + 1)

  // Look for next scheduled day within 7 days
  for (let i = 0; i < 7; i++) {
    if (isScheduledDay(nextDate, scheduledDays)) {
      return nextDate
    }
    nextDate.setDate(nextDate.getDate() + 1)
  }

  // Fallback: return the date a week later
  return nextDate
}
