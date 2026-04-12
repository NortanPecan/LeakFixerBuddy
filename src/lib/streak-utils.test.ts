import { describe, expect, it } from 'vitest'
import {
  calculateHabitStreak,
  calculateRitualStreak,
  calculateStreak,
  getNextScheduledDate,
  isScheduledDay,
  parseScheduleDays,
  type CompletionEntry,
} from './streak-utils'
import { EVERY_DAY_SCHEDULE } from './date-types'
import { formatDateKey } from './date-utils'

function entry(date: string, completed = true, count?: number): CompletionEntry {
  return { date, completed, count }
}

describe('streak-utils', () => {
  it('keeps the current streak alive when today is still incomplete', () => {
    const result = calculateRitualStreak({
      completions: [
        entry('2026-04-11'),
        entry('2026-04-10'),
      ],
      referenceDate: '2026-04-12',
      periodDays: 5,
      scheduledDays: EVERY_DAY_SCHEDULE,
    })

    expect(result).toEqual({
      streak: 2,
      maxStreak: 2,
      scheduledDays: 5,
      completedScheduledDays: 2,
      completionRate: 40,
    })
  })

  it('ignores gaps on unscheduled days for ritual streaks', () => {
    const result = calculateRitualStreak({
      completions: [
        entry('2026-04-10'),
        entry('2026-04-08'),
        entry('2026-04-06'),
      ],
      referenceDate: '2026-04-10',
      periodDays: 7,
      scheduledDays: [1, 3, 5],
    })

    expect(result.streak).toBe(3)
    expect(result.maxStreak).toBe(3)
    expect(result.scheduledDays).toBe(3)
    expect(result.completedScheduledDays).toBe(3)
    expect(result.completionRate).toBe(100)
  })

  it('treats an empty schedule as every day', () => {
    const result = calculateRitualStreak({
      completions: [entry('2026-04-11')],
      referenceDate: '2026-04-12',
      periodDays: 2,
      scheduledDays: [],
    })

    expect(result.streak).toBe(1)
    expect(result.scheduledDays).toBe(2)
  })

  it('aggregates duplicate day entries before evaluating target completion', () => {
    const result = calculateRitualStreak({
      completions: [
        entry('2026-04-11', false, 1),
        entry('2026-04-11', false, 2),
        entry('2026-04-10', false, 3),
      ],
      referenceDate: '2026-04-12',
      periodDays: 3,
      dailyTarget: 3,
    })

    expect(result.streak).toBe(2)
    expect(result.maxStreak).toBe(2)
    expect(result.completedScheduledDays).toBe(2)
    expect(result.completionRate).toBe(67)
  })

  it('uses count >= dailyTarget for daily habits', () => {
    const result = calculateHabitStreak({
      completions: [
        entry('2026-04-12', false, 1),
        entry('2026-04-11', false, 2),
        entry('2026-04-10', false, 2),
        entry('2026-04-09', false, 1),
      ],
      frequency: 'daily',
      dailyTarget: 2,
      referenceDate: '2026-04-12',
      periodDays: 4,
    })

    expect(result).toEqual({
      streak: 2,
      maxStreak: 2,
      scheduledDays: 4,
      completedScheduledDays: 2,
      completionRate: 50,
    })
  })

  it('calculates weekly habits as consecutive successful weeks', () => {
    const result = calculateHabitStreak({
      completions: [
        entry('2026-04-14', true, 1),
        entry('2026-04-16', true, 1),
        entry('2026-04-06', true, 1),
        entry('2026-04-08', true, 1),
        entry('2026-04-10', true, 1),
        entry('2026-03-30', true, 1),
        entry('2026-04-01', true, 1),
        entry('2026-04-03', true, 1),
        entry('2026-04-05', true, 1),
        entry('2026-03-23', true, 1),
        entry('2026-03-25', true, 1),
      ],
      frequency: 'weekly',
      weeklyTarget: 3,
      referenceDate: '2026-04-19',
      periodDays: 28,
    })

    expect(result).toEqual({
      streak: 2,
      maxStreak: 2,
      scheduledDays: 12,
      completedScheduledDays: 10,
      completionRate: 83,
    })
  })

  it('counts the current week when the weekly target is already met', () => {
    const result = calculateHabitStreak({
      completions: [
        entry('2026-04-13', true, 1),
        entry('2026-04-15', true, 1),
        entry('2026-04-18', true, 1),
        entry('2026-04-06', true, 1),
        entry('2026-04-08', true, 1),
        entry('2026-04-10', true, 1),
        entry('2026-03-30', true, 1),
        entry('2026-04-01', true, 1),
        entry('2026-04-03', true, 1),
      ],
      frequency: 'weekly',
      weeklyTarget: 3,
      referenceDate: '2026-04-19',
      periodDays: 21,
    })

    expect(result.streak).toBe(3)
    expect(result.maxStreak).toBe(3)
    expect(result.completionRate).toBe(100)
  })

  it('resolves date boundaries using the provided time zone', () => {
    const result = calculateRitualStreak({
      completions: [
        { date: '2026-04-12T00:30:00.000Z', completed: true },
        { date: '2026-04-11T00:30:00.000Z', completed: true },
      ],
      referenceDate: '2026-04-12T08:00:00.000Z',
      timeZone: 'America/Los_Angeles',
      periodDays: 3,
    })

    expect(result.streak).toBe(2)
    expect(result.maxStreak).toBe(2)
    expect(result.completedScheduledDays).toBe(2)
  })

  it('keeps the legacy calculateStreak wrapper backward compatible', () => {
    const result = calculateStreak(
      [entry('2026-04-11'), entry('2026-04-10')],
      [1, 2, 3, 4, 5, 6, 7],
      { referenceDate: '2026-04-12', periodDays: 3 }
    )

    expect(result.streak).toBe(2)
    expect(result.scheduledDays).toBe(3)
  })

  it('parses schedules with empty and invalid payloads as every day', () => {
    expect(parseScheduleDays('[]')).toEqual(EVERY_DAY_SCHEDULE)
    expect(parseScheduleDays(undefined)).toEqual(EVERY_DAY_SCHEDULE)
    expect(parseScheduleDays('not-json')).toEqual(EVERY_DAY_SCHEDULE)
  })

  it('determines scheduled days using normalized weekday contracts', () => {
    expect(isScheduledDay('2026-04-13', [1, 3, 5])).toBe(true)
    expect(isScheduledDay('2026-04-14', [1, 3, 5])).toBe(false)
    expect(isScheduledDay('2026-04-14', [])).toBe(true)
  })

  it('returns the next scheduled date using the normalized schedule', () => {
    expect(formatDateKey(getNextScheduledDate(new Date('2026-04-14T10:00:00.000Z'), [1, 3, 5]))).toBe('2026-04-15')
    expect(formatDateKey(getNextScheduledDate(new Date('2026-04-14T10:00:00.000Z'), []))).toBe('2026-04-15')
  })
})
