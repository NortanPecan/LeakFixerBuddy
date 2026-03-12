/**
 * Fitness Module Types
 * Translated from fitness.js JSDoc to TypeScript
 */

// ===================== PROFILE TYPES =====================

/** Body measurements in cm */
export interface BodyMeasurements {
  waist?: number
  hips?: number
  chest?: number
  bicep?: number
  thigh?: number
}

/** Work activity profile */
export type WorkProfile = 'sedentary' | 'moderate' | 'active' | 'very_active'

/** User fitness profile settings */
export interface ProfileFitnessSettings {
  weight?: number       // kg
  height?: number       // cm
  age?: number          // years
  targetWeight?: number // kg
  workProfile?: WorkProfile
  waterBaselineMl?: number // daily water target
  measurements?: BodyMeasurements
}

// ===================== ACTIVITY TYPES =====================

/** Activity kind identifier */
export type ActivityKind =
  | 'gym'
  | 'strength'
  | 'cardio'
  | 'cardio_indoor'
  | 'cardio_outdoor'
  | 'home'
  | 'home_exercise'
  | 'steps'
  | 'daily'

/** Gym workout intensity */
export type GymIntensity = 'light' | 'medium' | 'high'

/** Cardio type */
export type CardioType = 'run' | 'walk' | 'bike' | 'swim' | 'other'

/** Home exercise type */
export type HomeExerciseType =
  | 'pushups'
  | 'pullups'
  | 'squats'
  | 'plank'
  | 'burpees'
  | 'jumping_jacks'
  | 'other'

/** Daily activity type */
export type DailyActivityType =
  | 'cleaning'
  | 'gardening'
  | 'walking'
  | 'stretching'
  | 'other'

/** Gym/Strength workout entry */
export interface GymEntry {
  id: string
  kind: 'gym' | 'strength'
  durationMinutes: number
  intensity?: GymIntensity
  calories?: number
  gymData?: {
    periodId?: string
    cycleIndex?: number
    dayIndex?: number
  }
}

/** Cardio workout entry */
export interface CardioEntry {
  id: string
  kind: 'cardio' | 'cardio_indoor' | 'cardio_outdoor'
  durationMinutes: number
  cardioType?: CardioType
  distanceKm?: number
  calories?: number
}

/** Home exercise entry */
export interface HomeExerciseEntry {
  id: string
  kind: 'home' | 'home_exercise'
  exerciseType: HomeExerciseType
  durationMinutes?: number
  repetitions?: number
  calories?: number
}

/** Steps entry */
export interface StepsEntry {
  id: string
  kind: 'steps'
  steps: number
  calories?: number
}

/** Daily activity entry */
export interface DailyActivityEntry {
  id: string
  kind: 'daily'
  activityType: DailyActivityType
  durationMinutes: number
  calories?: number
}

/** Union type for all activity entries */
export type ActivityEntry =
  | GymEntry
  | CardioEntry
  | HomeExerciseEntry
  | StepsEntry
  | DailyActivityEntry

// ===================== NUTRITION TYPES =====================

/** Food entry source */
export type FoodSource = 'manual' | 'auto'

/** Food/nutrition entry */
export interface FoodEntry {
  id: string
  name: string
  amount?: string | null
  calories?: number | null
  protein?: number | null
  fat?: number | null
  carbs?: number | null
  time: string
  source: FoodSource
}

// ===================== WATER TYPES =====================

/** Water tracking data */
export interface WaterData {
  targetMl: number
  currentMl: number
}

// ===================== SUPPLEMENT TYPES =====================

/** Supplement unit */
export type SupplementUnit = 'мг' | 'г' | 'табл' | 'капс' | 'мл'

/** Single intake event */
export interface SupplementIntake {
  id: string
  plannedId?: string | null  // reference to planned intake
  time: string               // HH:MM
  dose: number
  checked: boolean
  edited: boolean            // true if dose differs from template
}

/** Intakes for a single day */
export interface SupplementDayIntakes {
  date: string               // YYYY-MM-DD
  intakes: SupplementIntake[]
}

/** Template for auto-generating intakes */
export interface SupplementTemplateIntake {
  defaultDose: number
  time?: string              // HH:MM
}

/** Supplement definition in user's profile */
export interface Supplement {
  id: string
  name: string
  unit: SupplementUnit
  daily: boolean             // "every day" flag
  dailyStartDate?: string | null  // YYYY-MM-DD
  dailyEndDate?: string | null    // YYYY-MM-DD (inclusive)
  standardDailyDose: number
  templateIntakes: SupplementTemplateIntake[]
  history: SupplementDayIntakes[]
  createdAt: string
  updatedAt: string
}

/** User's supplements profile */
export interface SupplementsProfile {
  supplements: Supplement[]
}

// ===================== DAILY STATE TYPES =====================

/** Work day intensity */
export type WorkDayIntensity = 'low' | 'normal' | 'high'

/** Complete fitness day data */
export interface FitnessDayData {
  activities: ActivityEntry[]
  foods: FoodEntry[]
  water?: WaterData
  workDay?: WorkDayIntensity
  supplements: SupplementIntake[]
  mood?: number              // 1-10
  energy?: number            // 1-10
}

// ===================== VIEW MODEL TYPES =====================

/** Calories summary for display */
export interface CaloriesSummary {
  eaten: number
  burned: number
  balance: number
  balanceColor: 'green' | 'red' | 'neutral'
}

/** Activity list item for UI */
export interface ActivityListItem {
  id: string
  kind: ActivityKind
  label: string
  duration: string
  calories: number
  icon: string
}

/** Food list item for UI */
export interface FoodListItem {
  id: string
  name: string
  amount: string
  caloriesText: string
  macrosText: string
  timeText: string
  source: FoodSource
}

/** Supplement list item for UI */
export interface SupplementListItem {
  id: string
  supplementId: string
  supplementName: string
  unit: SupplementUnit
  time: string
  dose: number
  isPlanned: boolean
  isChecked: boolean
  isEdited: boolean
}

// ===================== GYM TYPES =====================

/** Muscle group */
export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'legs'
  | 'core'
  | 'full_body'

/** Exercise in gym day */
export interface GymExercise {
  id: string
  name: string
  muscleGroup: MuscleGroup
  sets?: number
  reps?: number
  weight?: number
  notes?: string
}

/** Day in gym cycle */
export interface GymDay {
  index: number
  name: string
  exercises: GymExercise[]
  completed?: boolean
}

/** Cycle in gym period */
export interface GymCycle {
  index: number
  name: string
  days: GymDay[]
}

/** Gym training period */
export interface GymPeriod {
  id: string
  name: string
  startDate: string
  endDate?: string
  cycles: GymCycle[]
  currentCycleIndex?: number
  currentDayIndex?: number
}

// ===================== PROGRESS TYPES =====================

/** User progress stats */
export interface UserProgress {
  day: number
  streak: number
  points: number
  totalWorkouts: number
  totalCaloriesBurned: number
  totalWaterMl: number
  weightProgress?: {
    start: number
    current: number
    target: number
  }
}

/** Date key format YYYY-MM-DD */
export type DateKey = string
