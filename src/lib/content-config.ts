// Content types and statuses configuration
import { NOTE_ZONES, getNoteZoneInfo } from './notes-config'

export const CONTENT_TYPES = [
  { id: 'book', label: 'Книга', icon: '📖', unit: 'страниц', progressType: 'pages' },
  { id: 'movie', label: 'Фильм/Сериал', icon: '🎬', unit: 'мин', progressType: 'minutes' },
  { id: 'course', label: 'Курс', icon: '🎓', unit: 'уроков', progressType: 'lessons' },
  { id: 'podcast', label: 'Подкаст', icon: '🎧', unit: 'min', progressType: 'minutes' },
  { id: 'video', label: 'Видео', icon: '🎥', unit: 'min', progressType: 'minutes' },
] as const

export const CONTENT_STATUSES = [
  { id: 'planned', label: 'Планирую', icon: '📋', color: 'text-muted-foreground' },
  { id: 'in_progress', label: 'В процессе', icon: '▶️', color: 'text-amber-600' },
  { id: 'completed', label: 'Завершено', icon: '✅', color: 'text-emerald-500' },
] as const

// Re-export zones from notes-config
export const CONTENT_ZONES = NOTE_ZONES
export { getNoteZoneInfo }

// Helper to get type info
export function getContentTypeInfo(type: string) {
  return CONTENT_TYPES.find(t => t.id === type) || CONTENT_TYPES[0]
}

// Helper to get status info
export function getContentStatusInfo(status: string) {
  return CONTENT_STATUSES.find(s => s.id === status) || CONTENT_STATUSES[0]
}

// Helper to calculate progress percentage
export function calculateProgress(item: { totalUnits?: number | null; currentUnits?: number | null }): number {
  if (!item.totalUnits || !item.currentUnits) return 0
  return Math.round((item.currentUnits / item.totalUnits) * 100)
}

// Format progress string
export function formatProgress(item: { totalUnits?: number | null; currentUnits?: number | null; unitType?: string | null }): string {
  if (!item.totalUnits || !item.currentUnits) return ''

  const unitLabels: Record<string, string> = {
    pages: 'стр.',
    lessons: 'уроков',
    minutes: 'мин',
    percent: '%',
  }

  const unit = unitLabels[item.unitType || 'pages'] || ''
  const current = item.currentUnits || 0
  const total = item.totalUnits || 0

  if (item.unitType === 'percent') {
    return `${current}%`
  }

  return `${current}/${total} ${unit}`
}
