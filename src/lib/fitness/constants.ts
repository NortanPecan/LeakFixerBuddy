/**
 * Fitness constants - Activity calories reference
 */

import type { GymIntensity, CardioType, HomeExerciseType, DailyActivityType } from './types'

/** Calories burned per minute at 70kg body weight */
export const ACTIVITY_CALORIES_PER_MIN: Record<string, number> = {
  // Gym/Strength by intensity
  gym_light: 4,
  gym_medium: 6,
  gym_high: 8,
  strength_light: 4,
  strength_medium: 6,
  strength_high: 8,

  // Cardio types
  run: 11,
  walk: 4,
  bike: 7,
  swim: 8,
  cardio_other: 6,

  // Home exercises
  pushups: 5,
  pullups: 6,
  squats: 6,
  plank: 4,
  burpees: 10,
  jumping_jacks: 5,
  home_other: 5,

  // Daily activities
  cleaning: 4,
  gardening: 5,
  stretching: 3,
  daily_other: 4,
}

/** Calories per 1000 steps (approximate at 70kg) */
export const CALORIES_PER_1000_STEPS = 35

/** Default water baseline in ml */
export const DEFAULT_WATER_BASELINE_ML = 2000

/** Water quick add options in ml */
export const WATER_QUICK_ADD_OPTIONS = [150, 250, 350, 500]

/** Balance thresholds for color coding */
export const BALANCE_GREEN_MAX = 300
export const BALANCE_RED_THRESHOLD = 500

/** Calorie targets by work profile */
export const CALORIE_TARGETS_BY_PROFILE: Record<string, { base: number; activity: number }> = {
  sedentary: { base: 1800, activity: 200 },
  moderate: { base: 2000, activity: 300 },
  active: { base: 2200, activity: 400 },
  very_active: { base: 2400, activity: 500 },
}

/** Activity icons for display */
export const ACTIVITY_ICONS: Record<string, string> = {
  gym: '🏋️',
  strength: '💪',
  cardio: '🏃',
  cardio_indoor: '🏃‍♂️',
  cardio_outdoor: '🏃‍♀️',
  home: '🏠',
  home_exercise: '🤸',
  steps: '👟',
  daily: '🧹',
  run: '🏃',
  walk: '🚶',
  bike: '🚴',
  swim: '🏊',
  cleaning: '🧹',
  gardening: '🌱',
  stretching: '🧘',
}

/** Water hydration status */
export function getHydrationStatus(currentMl: number, targetMl: number): {
  percent: number
  status: 'dehydrated' | 'low' | 'normal' | 'good' | 'excellent'
  color: string
} {
  const percent = targetMl > 0 ? Math.round((currentMl / targetMl) * 100) : 0

  if (percent < 25) return { percent, status: 'dehydrated', color: '#EF4444' }
  if (percent < 50) return { percent, status: 'low', color: '#F97316' }
  if (percent < 75) return { percent, status: 'normal', color: '#EAB308' }
  if (percent < 100) return { percent, status: 'good', color: '#22C55E' }
  return { percent, status: 'excellent', color: '#10B981' }
}
