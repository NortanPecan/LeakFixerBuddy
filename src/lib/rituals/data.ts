// Ritual types
export type RitualType = 'regular' | 'bad' | 'one_time'
export type RitualCategory = 'health' | 'money' | 'learning' | 'relationships' | 'mind' | 'productivity'
export type TimeWindow = 'morning' | 'day' | 'evening' | 'any'
export type AttributeKey = 'health' | 'mind' | 'will'
export type MoodType = 'good' | 'neutral' | 'bad'

// Category labels
export const CATEGORY_LABELS: Record<RitualCategory, { label: string; color: string; icon: string }> = {
  health: { label: 'Здоровье', color: 'bg-red-500/20 text-red-300', icon: '❤️' },
  money: { label: 'Деньги', color: 'bg-yellow-500/20 text-yellow-300', icon: '💰' },
  learning: { label: 'Обучение', color: 'bg-blue-500/20 text-blue-300', icon: '📚' },
  relationships: { label: 'Отношения', color: 'bg-pink-500/20 text-pink-300', icon: '👥' },
  mind: { label: 'Психика', color: 'bg-purple-500/20 text-purple-300', icon: '🧠' },
  productivity: { label: 'Продуктивность', color: 'bg-emerald-500/20 text-emerald-300', icon: '⚡' },
}

// Attribute labels
export const ATTRIBUTE_LABELS: Record<AttributeKey, { label: string; icon: string; color: string }> = {
  health: { label: 'Здоровье', icon: '❤️', color: 'bg-red-500' },
  mind: { label: 'Интеллект', icon: '🧠', color: 'bg-blue-500' },
  will: { label: 'Воля', icon: '💪', color: 'bg-emerald-500' },
}

// Time window labels
export const TIME_WINDOW_LABELS: Record<TimeWindow, string> = {
  morning: 'Утро',
  day: 'День',
  evening: 'Вечер',
  any: 'Любое время',
}

// Days of week
export const DAYS_OF_WEEK = [
  { value: 1, label: 'Пн', short: 'П' },
  { value: 2, label: 'Вт', short: 'В' },
  { value: 3, label: 'Ср', short: 'С' },
  { value: 4, label: 'Чт', short: 'Ч' },
  { value: 5, label: 'Пт', short: 'П' },
  { value: 6, label: 'Сб', short: 'С' },
  { value: 7, label: 'Вс', short: 'В' },
]

// Day presets
export const DAY_PRESETS = [
  { value: 'everyday', label: 'Каждый день', days: [1, 2, 3, 4, 5, 6, 7] },
  { value: 'weekdays', label: 'Будни', days: [1, 2, 3, 4, 5] },
  { value: 'weekends', label: 'Выходные', days: [6, 7] },
  { value: 'custom', label: 'Свои дни', days: [] },
]

// Ritual interface for frontend
export interface Ritual {
  id: string
  userId: string
  title: string
  type: RitualType
  category: RitualCategory
  days: number[] // Parsed array of day numbers (1-7, where 1=Monday)
  timeWindow: TimeWindow
  reminder: boolean
  reminderTime?: string
  goalShort?: string
  description?: string
  isFromPreset: boolean
  presetId?: string
  status: 'active' | 'archived'
  attributes: AttributeKey[]
  sortOrder: number
  createdAt: Date
  updatedAt: Date
  
  // Computed
  streak?: number
  completedToday?: boolean
  completionsCount?: number
  isScheduledToday?: boolean
}

// Ritual completion interface
export interface RitualCompletion {
  id: string
  ritualId: string
  userId: string
  date: Date
  completed: boolean
  note?: string
  mood?: MoodType
  createdAt: Date
}

// User attribute interface
export interface UserAttribute {
  id: string
  userId: string
  key: AttributeKey
  points: number
  level: number
}

// Achievement interface
export interface Achievement {
  id: string
  userId: string
  code: string
  metadata?: Record<string, unknown>
  obtainedAt: Date
}

// Catalog item (for preset and catalog)
export interface CatalogRitual {
  id: string
  title: string
  category: RitualCategory
  days: number[]
  timeWindow: TimeWindow
  goalShort: string
  description?: string
  attributes: AttributeKey[]
  icon?: string
}

// Preset interface
export interface RitualPreset {
  id: string
  name: string
  description: string
  icon: string
  rituals: CatalogRitual[]
}
