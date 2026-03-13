/**
 * GYM module constants
 * Shared across GymScreen and sub-components
 */

export const TRAINING_TYPES = [
  { value: 'strength', label: 'На силу', desc: 'Рост рабочих весов и силы' },
  { value: 'endurance', label: 'На выносливость', desc: 'Больше объём и длительность' },
  { value: 'custom', label: 'Своё название', desc: 'Задай своё название' },
]

export const SPLIT_TYPES = [
  { value: 'split', label: 'Сплит', desc: 'Разделение по группам: грудь/спина/ноги…' },
  { value: 'fullbody', label: 'Фулбоди', desc: 'Все тело за тренировку, 2–4 раза в неделю' },
  { value: 'ppl', label: 'PPL', desc: 'Push/Pull/Legs' },
  { value: 'upper_lower', label: 'Верх/Низ', desc: 'Чередование верха и низа' },
  { value: 'custom', label: 'Своя схема', desc: 'Сам задашь дни и мышцы' },
]

export const MUSCLE_GROUPS = [
  { value: 'chest', label: 'Грудь', color: 'bg-red-500/20 text-red-300' },
  { value: 'back', label: 'Спина', color: 'bg-blue-500/20 text-blue-300' },
  { value: 'legs', label: 'Ноги', color: 'bg-green-500/20 text-green-300' },
  { value: 'shoulders', label: 'Плечи', color: 'bg-orange-500/20 text-orange-300' },
  { value: 'biceps', label: 'Бицепс', color: 'bg-purple-500/20 text-purple-300' },
  { value: 'triceps', label: 'Трицепс', color: 'bg-pink-500/20 text-pink-300' },
  { value: 'core', label: 'Пресс', color: 'bg-yellow-500/20 text-yellow-300' },
]

export const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export const EXERCISE_DATABASE: Record<string, string[]> = {
  chest: ['Жим лёжа', 'Жим гантелей', 'Разводка гантелей', 'Отжимания', 'Жим на наклонной', 'Кроссовер'],
  back: ['Тяга штанги', 'Подтягивания', 'Тяга гантели', 'Горизонтальная тяга', 'Тяга верхнего блока', 'Гиперэкстензия'],
  legs: ['Приседания', 'Жим ногами', 'Выпады', 'Румынская тяга', 'Разгибание ног', 'Сгибание ног', 'Икры'],
  shoulders: ['Армейский жим', 'Махи гантелями', 'Тяга к подбородку', 'Жим Арнольда', 'Разводка в наклоне'],
  biceps: ['Подъём штанги', 'Подъём гантелей', 'Молотки', 'Концентрированные сгибания', 'Сгибание на скамье'],
  triceps: ['Французский жим', 'Разгибание на блоке', 'Отжимания на брусьях', 'Разгибание гантели', 'Кик-бэк'],
  core: ['Скручивания', 'Планка', 'Подъём ног', 'Русский твист', 'Боковая планка', 'Уголок'],
}

// Day schedule item type
export interface DayScheduleItem {
  type: 'workout' | 'rest'
  dayNum: number
  workoutNum?: number
  name?: string
  muscleGroups?: string[]
}

// Workout day config for wizard
export interface WorkoutDayConfig {
  dayNum: number
  muscles: string[]
  name: string
}

// Workout templates for quick setup
export const WORKOUT_TEMPLATES = [
  {
    id: 'upper_lower_6',
    name: 'Верх/Низ (4 за 6)',
    description: 'Верх, Низ, Отдых, Отдых, Верх, Низ',
    cycleLength: 6,
    workoutsPerCycle: 4,
    splitType: 'upper_lower',
    daySchedule: [
      { type: 'workout' as const, workoutNum: 1, name: 'Тренировка 1', muscleGroups: ['chest', 'back', 'shoulders'] },
      { type: 'workout' as const, workoutNum: 2, name: 'Тренировка 2', muscleGroups: ['legs'] },
      { type: 'rest' as const },
      { type: 'rest' as const },
      { type: 'workout' as const, workoutNum: 3, name: 'Тренировка 3', muscleGroups: ['chest', 'back', 'shoulders'] },
      { type: 'workout' as const, workoutNum: 4, name: 'Тренировка 4', muscleGroups: ['legs'] },
    ],
  },
  {
    id: 'ppl_6',
    name: 'PPL (3 за 6)',
    description: 'Push, Pull, Legs, Отдых × 3',
    cycleLength: 6,
    workoutsPerCycle: 3,
    splitType: 'ppl',
    daySchedule: [
      { type: 'workout' as const, workoutNum: 1, name: 'Тренировка 1', muscleGroups: ['chest', 'shoulders', 'triceps'] },
      { type: 'workout' as const, workoutNum: 2, name: 'Тренировка 2', muscleGroups: ['back', 'biceps'] },
      { type: 'workout' as const, workoutNum: 3, name: 'Тренировка 3', muscleGroups: ['legs'] },
      { type: 'rest' as const },
      { type: 'rest' as const },
      { type: 'rest' as const },
    ],
  },
  {
    id: 'split_7',
    name: 'Классический сплит (4 за 7)',
    description: 'Грудь, Спина, Ноги, Отдых, Плечи, Отдых, Отдых',
    cycleLength: 7,
    workoutsPerCycle: 4,
    splitType: 'split',
    daySchedule: [
      { type: 'workout' as const, workoutNum: 1, name: 'Тренировка 1', muscleGroups: ['chest', 'triceps'] },
      { type: 'workout' as const, workoutNum: 2, name: 'Тренировка 2', muscleGroups: ['back', 'biceps'] },
      { type: 'workout' as const, workoutNum: 3, name: 'Тренировка 3', muscleGroups: ['legs'] },
      { type: 'rest' as const },
      { type: 'workout' as const, workoutNum: 4, name: 'Тренировка 4', muscleGroups: ['shoulders', 'core'] },
      { type: 'rest' as const },
      { type: 'rest' as const },
    ],
  },
  {
    id: 'fullbody_7',
    name: 'Фулбоди (3 за 7)',
    description: 'Пн/Ср/Пт — всё тело, остальные отдых',
    cycleLength: 7,
    workoutsPerCycle: 3,
    splitType: 'fullbody',
    daySchedule: [
      { type: 'workout' as const, workoutNum: 1, name: 'Тренировка 1', muscleGroups: ['chest', 'back', 'legs'] },
      { type: 'rest' as const },
      { type: 'workout' as const, workoutNum: 2, name: 'Тренировка 2', muscleGroups: ['shoulders', 'legs', 'core'] },
      { type: 'rest' as const },
      { type: 'workout' as const, workoutNum: 3, name: 'Тренировка 3', muscleGroups: ['chest', 'back', 'legs'] },
      { type: 'rest' as const },
      { type: 'rest' as const },
    ],
  },
  {
    id: 'intense_5',
    name: 'Интенсив (5 за 7)',
    description: '5 дней тренировок подряд, 2 дня отдых',
    cycleLength: 7,
    workoutsPerCycle: 5,
    splitType: 'split',
    daySchedule: [
      { type: 'workout' as const, workoutNum: 1, name: 'Тренировка 1', muscleGroups: ['chest'] },
      { type: 'workout' as const, workoutNum: 2, name: 'Тренировка 2', muscleGroups: ['back'] },
      { type: 'workout' as const, workoutNum: 3, name: 'Тренировка 3', muscleGroups: ['legs'] },
      { type: 'workout' as const, workoutNum: 4, name: 'Тренировка 4', muscleGroups: ['shoulders'] },
      { type: 'workout' as const, workoutNum: 5, name: 'Тренировка 5', muscleGroups: ['biceps', 'triceps'] },
      { type: 'rest' as const },
      { type: 'rest' as const },
    ],
  },
]

// Helper function to get workout name by type
export function getWorkoutName(type: string, workoutNum: number): string {
  switch (type) {
    case 'split':
      return `Тренировка ${workoutNum}`
    case 'fullbody':
      return `Фулбоди ${workoutNum}`
    case 'ppl':
      return ['Push', 'Pull', 'Legs'][workoutNum - 1] || `Тренировка ${workoutNum}`
    case 'upper_lower':
      return workoutNum % 2 === 1 ? 'Верх' : 'Низ'
    default:
      return `Тренировка ${workoutNum}`
  }
}
