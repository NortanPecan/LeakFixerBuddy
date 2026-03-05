/**
 * Fitness Utilities - Pure Functions
 * Translated from fitness.js
 */

import type {
  ActivityEntry,
  CaloriesSummary,
  DateKey,
  FitnessDayData,
  FoodEntry,
  GymIntensity,
  WaterData,
  Supplement,
  SupplementIntake,
  SupplementTemplateIntake,
} from './types'

// ===================== ID GENERATION =====================

/** Generate unique ID */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

// ===================== DATE FORMATTING =====================

/** Format date to YYYY-MM-DD key */
export function formatDateKey(date: Date): DateKey {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Format time to HH:MM */
export function formatTimeHM(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

/** Get today's date key */
export function getTodayKey(): DateKey {
  return formatDateKey(new Date())
}

/** Parse date key to Date object */
export function parseDateKey(dateKey: DateKey): Date {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** Compare two date keys: returns -1, 0, or 1 */
export function compareDateKeys(a: DateKey, b: DateKey): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

/** Check if date is today */
export function isToday(dateKey: DateKey): boolean {
  return dateKey === getTodayKey()
}

/** Check if date is in the future */
export function isFutureDate(dateKey: DateKey): boolean {
  return compareDateKeys(dateKey, getTodayKey()) > 0
}

/** Check if date is in the past */
export function isPastDate(dateKey: DateKey): boolean {
  return compareDateKeys(dateKey, getTodayKey()) < 0
}

/** Get date key N days from now */
export function getDateKeyDaysFromNow(days: number): DateKey {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return formatDateKey(date)
}

// ===================== DAY DATA HELPERS =====================

/** Create empty day data structure */
export function createEmptyDayData(): FitnessDayData {
  return {
    activities: [],
    foods: [],
    water: undefined,
    workDay: undefined,
    supplements: [],
  }
}

/** Ensure day data has all required fields with defaults */
export function normalizeDayData(day: Partial<FitnessDayData>): FitnessDayData {
  return {
    activities: Array.isArray(day.activities) ? day.activities : [],
    foods: Array.isArray(day.foods) ? day.foods : [],
    water: day.water && typeof day.water === 'object' ? day.water : undefined,
    workDay: day.workDay,
    supplements: Array.isArray(day.supplements) ? day.supplements : [],
    mood: day.mood,
    energy: day.energy,
  }
}

// ===================== WATER HELPERS =====================

/** Create default water data from baseline */
export function createDefaultWaterData(baselineMl: number = 2000): WaterData {
  return {
    targetMl: baselineMl,
    currentMl: 0,
  }
}

/** Calculate water progress percentage */
export function getWaterProgress(water: WaterData): number {
  if (water.targetMl <= 0) return 0
  return Math.min(100, (water.currentMl / water.targetMl) * 100)
}

/** Add water amount */
export function addWater(water: WaterData, amountMl: number): WaterData {
  return {
    ...water,
    currentMl: Math.max(0, water.currentMl + amountMl),
  }
}

// ===================== CALORIES CALCULATIONS =====================

/** MET values for activities (Metabolic Equivalent of Task) */
const MET_VALUES: Record<string, number> = {
  // Gym/Strength
  gym_light: 3.0,
  gym_medium: 5.0,
  gym_high: 6.0,
  strength_light: 3.0,
  strength_medium: 5.0,
  strength_high: 6.0,

  // Cardio
  run: 7.0,
  walk: 3.5,
  bike: 5.0,
  swim: 6.0,
  cardio_other: 5.0,

  // Home exercises
  pushups: 3.8,
  pullups: 4.8,
  squats: 5.0,
  plank: 3.0,
  burpees: 8.0,
  jumping_jacks: 4.0,
  home_other: 4.0,

  // Daily activities
  cleaning: 3.3,
  gardening: 4.0,
  stretching: 2.3,
  daily_other: 3.0,

  // Steps
  steps: 0.04, // per step, approximate
}

/** Calculate calories burned for an activity */
export function calculateActivityCalories(
  activity: ActivityEntry,
  weightKg: number = 70
): number {
  if (activity.calories) return activity.calories

  let metKey: string
  let duration = 0

  switch (activity.kind) {
    case 'gym':
    case 'strength':
      metKey = `${activity.kind}_${activity.intensity || 'medium'}`
      duration = activity.durationMinutes
      break

    case 'cardio':
    case 'cardio_indoor':
    case 'cardio_outdoor':
      metKey = activity.cardioType || 'cardio_other'
      duration = activity.durationMinutes
      break

    case 'home':
    case 'home_exercise':
      metKey = activity.exerciseType || 'home_other'
      duration = activity.durationMinutes || Math.ceil((activity.repetitions || 10) / 10)
      break

    case 'daily':
      metKey = activity.activityType || 'daily_other'
      duration = activity.durationMinutes
      break

    case 'steps':
      // Steps use different calculation
      return Math.round(activity.steps * (MET_VALUES.steps || 0.04) * weightKg * 0.000125)

    default:
      return 0
  }

  const met = MET_VALUES[metKey] || 4.0
  // Calories = MET × weight (kg) × duration (hours)
  return Math.round(met * weightKg * (duration / 60))
}

/** Calculate total calories burned from activities */
export function calculateTotalBurned(
  activities: ActivityEntry[],
  weightKg: number = 70
): number {
  return activities.reduce(
    (sum, activity) => sum + calculateActivityCalories(activity, weightKg),
    0
  )
}

/** Calculate total calories eaten from foods */
export function calculateTotalEaten(foods: FoodEntry[]): number {
  return foods.reduce((sum, food) => sum + (food.calories || 0), 0)
}

/** Get calories summary for display */
export function getCaloriesSummary(
  foods: FoodEntry[],
  activities: ActivityEntry[],
  weightKg: number = 70
): CaloriesSummary {
  const eaten = calculateTotalEaten(foods)
  const burned = calculateTotalBurned(activities, weightKg)
  const balance = eaten - burned

  // Balance color logic
  let balanceColor: 'green' | 'red' | 'neutral'
  if (balance <= 300) {
    balanceColor = 'green'
  } else if (balance >= 500) {
    balanceColor = 'red'
  } else {
    balanceColor = 'neutral'
  }

  return { eaten, burned, balance, balanceColor }
}

// ===================== SUPPLEMENT HELPERS =====================

/** Build planned intake ID for tracking */
export function buildPlannedIntakeId(
  supplementId: string,
  dateKey: DateKey,
  templateIndex: number
): string {
  return `plan_${supplementId}_${dateKey}_${templateIndex}`
}

/** Normalize supplement definition */
export function normalizeSupplement(supplement: Partial<Supplement>): Supplement {
  const now = new Date().toISOString()
  const templates: SupplementTemplateIntake[] =
    Array.isArray(supplement.templateIntakes) && supplement.templateIntakes.length > 0
      ? supplement.templateIntakes.map((t) => ({
          defaultDose: Number(t?.defaultDose) > 0 ? Number(t.defaultDose) : 1,
          time: typeof t?.time === 'string' ? t.time : '',
        }))
      : [{ defaultDose: Number(supplement.standardDailyDose) || 1, time: '' }]

  return {
    id: supplement.id || generateId(),
    name: supplement.name || '',
    unit: supplement.unit || 'мг',
    daily: Boolean(supplement.daily),
    dailyStartDate: supplement.dailyStartDate || null,
    dailyEndDate: supplement.dailyEndDate || null,
    standardDailyDose: Number(supplement.standardDailyDose) > 0
      ? Number(supplement.standardDailyDose)
      : templates[0].defaultDose,
    templateIntakes: templates,
    history: Array.isArray(supplement.history) ? supplement.history : [],
    createdAt: supplement.createdAt || now,
    updatedAt: supplement.updatedAt || now,
  }
}

/** Normalize supplement intake event */
export function normalizeSupplementIntake(intake: Partial<SupplementIntake>): SupplementIntake {
  return {
    id: intake.id || generateId(),
    plannedId: intake.plannedId || null,
    time: intake.time || '',
    dose: Number(intake.dose) > 0 ? Number(intake.dose) : 1,
    checked: Boolean(intake.checked),
    edited: Boolean(intake.edited),
  }
}

/** Check if date is within supplement's daily interval */
export function isDateInSupplementInterval(
  supplement: Supplement,
  dateKey: DateKey
): boolean {
  if (!supplement.daily) return false
  if (!supplement.dailyStartDate) return false
  if (supplement.dailyEndDate && dateKey > supplement.dailyEndDate) return false
  if (dateKey < supplement.dailyStartDate) return false
  return true
}

/** Build planned intakes for a date from supplement templates */
export function buildPlannedIntakes(
  supplement: Supplement,
  dateKey: DateKey
): SupplementIntake[] {
  if (!supplement.templateIntakes.length) return []
  if (!isDateInSupplementInterval(supplement, dateKey)) return []

  return supplement.templateIntakes.map((template, index) => ({
    id: buildPlannedIntakeId(supplement.id, dateKey, index),
    plannedId: buildPlannedIntakeId(supplement.id, dateKey, index),
    time: template.time || '',
    dose: Number(template.defaultDose) > 0 ? Number(template.defaultDose) : 1,
    checked: false,
    edited: false,
  }))
}

/** Sort intakes by time */
export function sortSupplementIntakes(intakes: SupplementIntake[]): SupplementIntake[] {
  return [...intakes].sort((a, b) => {
    const timeA = a.time || '99:99'
    const timeB = b.time || '99:99'
    if (timeA !== timeB) return timeA.localeCompare(timeB)
    return String(a.id).localeCompare(String(b.id))
  })
}

// ===================== MACRO CALCULATIONS =====================

/** Calculate macros summary */
export function calculateMacros(foods: FoodEntry[]) {
  return {
    protein: foods.reduce((sum, f) => sum + (f.protein || 0), 0),
    fat: foods.reduce((sum, f) => sum + (f.fat || 0), 0),
    carbs: foods.reduce((sum, f) => sum + (f.carbs || 0), 0),
  }
}

/** Format macros for display */
export function formatMacros(food: FoodEntry): string {
  const parts: string[] = []
  if (food.protein) parts.push(`Б:${food.protein}`)
  if (food.fat) parts.push(`Ж:${food.fat}`)
  if (food.carbs) parts.push(`У:${food.carbs}`)
  return parts.join(', ')
}
