export type DateInput = Date | string

export type DateKey = `${number}-${number}-${number}`

export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7

export type Schedule = readonly Weekday[]

export type HabitFrequency = 'daily' | 'weekly'

export interface DateContext {
  readonly referenceDate?: DateInput
  readonly timeZone?: string
}

export interface RequiredDateContext {
  readonly referenceDate: DateInput
  readonly timeZone?: string
}

export interface CompletionStatus {
  readonly completed: boolean
  readonly count: number
  readonly target: number
}

export const EVERY_DAY_SCHEDULE = [1, 2, 3, 4, 5, 6, 7] as const satisfies Schedule

export const ISO_WEEK_START: Weekday = 1
