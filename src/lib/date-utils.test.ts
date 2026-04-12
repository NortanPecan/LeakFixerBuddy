import { describe, expect, it } from 'vitest'
import {
  addDaysToDateKey,
  assertDateKey,
  compareDateKeys,
  diffDateKeys,
  enumerateDateKeys,
  formatDateKey,
  getDayOfWeek,
  getEndOfDay,
  getStartOfNextDay,
  getTodayKey,
  getTomorrowKey,
  getWeekStartDateKey,
  normalizeToDate,
  parseDateKey,
} from './date-utils'

describe('date-utils', () => {
  it.each([
    ['2026-02-28', true],
    ['2024-02-29', true],
    ['2026-02-29', false],
    ['2026-13-01', false],
    ['2026-00-01', false],
    ['2026-04-31', false],
    ['invalid', false],
  ])('validates date keys: %s', (value, isValid) => {
    if (isValid) {
      expect(assertDateKey(value)).toBe(value)
      expect(formatDateKey(parseDateKey(value))).toBe(value)
      return
    }

    expect(() => assertDateKey(value)).toThrow(RangeError)
    expect(() => parseDateKey(value)).toThrow(RangeError)
  })

  it('formats date keys using the provided time zone', () => {
    const instant = new Date('2026-04-12T02:30:00.000Z')

    expect(formatDateKey(instant, { timeZone: 'America/Los_Angeles' })).toBe('2026-04-11')
    expect(formatDateKey(instant, { timeZone: 'Europe/Samara' })).toBe('2026-04-12')
    expect(formatDateKey(instant, { timeZone: 'Asia/Tokyo' })).toBe('2026-04-12')
  })

  it('normalizes to canonical local midnight for date keys', () => {
    const normalized = normalizeToDate('2026-04-12')

    expect(formatDateKey(normalized)).toBe('2026-04-12')
    expect(normalized.getHours()).toBe(0)
    expect(normalized.getMinutes()).toBe(0)
    expect(normalized.getSeconds()).toBe(0)
    expect(normalized.getMilliseconds()).toBe(0)
  })

  it('provides explicit end-of-day and next-day boundaries', () => {
    const endOfDay = getEndOfDay('2026-04-12')
    const startOfNextDay = getStartOfNextDay('2026-04-12')

    expect(endOfDay.getHours()).toBe(23)
    expect(endOfDay.getMinutes()).toBe(59)
    expect(endOfDay.getSeconds()).toBe(59)
    expect(endOfDay.getMilliseconds()).toBe(999)
    expect(startOfNextDay.getTime() - endOfDay.getTime()).toBe(1)
  })

  it('adds days across leap years and month boundaries', () => {
    expect(addDaysToDateKey('2024-02-28', 1)).toBe('2024-02-29')
    expect(addDaysToDateKey('2024-02-29', 1)).toBe('2024-03-01')
    expect(addDaysToDateKey('2026-01-01', -1)).toBe('2025-12-31')
  })

  it('compares and diffs date keys deterministically', () => {
    expect(compareDateKeys('2026-04-12', '2026-04-12')).toBe(0)
    expect(compareDateKeys('2026-04-11', '2026-04-12')).toBe(-1)
    expect(compareDateKeys('2026-04-13', '2026-04-12')).toBe(1)
    expect(diffDateKeys('2026-04-12', '2026-04-09')).toBe(3)
  })

  it('enumerates inclusive date-key ranges', () => {
    expect(enumerateDateKeys('2026-04-10', '2026-04-12')).toEqual([
      '2026-04-10',
      '2026-04-11',
      '2026-04-12',
    ])
  })

  it.each([
    ['2026-04-13', 1],
    ['2026-04-14', 2],
    ['2026-04-15', 3],
    ['2026-04-16', 4],
    ['2026-04-17', 5],
    ['2026-04-18', 6],
    ['2026-04-19', 7],
  ] as const)('returns ISO weekday for %s', (dateKey, weekday) => {
    expect(getDayOfWeek(dateKey)).toBe(weekday)
  })

  it('computes the start of the ISO week', () => {
    expect(getWeekStartDateKey('2026-04-19')).toBe('2026-04-13')
    expect(getWeekStartDateKey('2026-04-13')).toBe('2026-04-13')
  })

  it('derives today and tomorrow keys from a deterministic reference date', () => {
    const context = {
      referenceDate: new Date('2026-04-12T21:15:00.000Z'),
      timeZone: 'America/Los_Angeles',
    } as const

    expect(getTodayKey(context)).toBe('2026-04-12')
    expect(getTomorrowKey(context)).toBe('2026-04-13')
  })
})
