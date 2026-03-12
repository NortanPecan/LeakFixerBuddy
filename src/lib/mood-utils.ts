/**
 * Mood status utilities
 * Shared across store, API routes, and components
 */

export interface MoodStatusResult {
  status: string
  color: string
}

/**
 * Get mood status with color
 * Used in UI components that need both text and styling
 */
export function getMoodStatus(mood: number): MoodStatusResult {
  if (mood >= 9) return { status: 'Пиковое состояние! 🚀', color: '#fcd34d' }
  if (mood >= 7) return { status: 'Хороший тон, есть ресурс', color: '#34d399' }
  if (mood >= 5) return { status: 'Нормально, можно лучше', color: '#60a5fa' }
  if (mood >= 3) return { status: 'Низкий ресурс, береги силы', color: '#fb923c' }
  return { status: 'Кризис, нужна поддержка', color: '#f87171' }
}

/**
 * Get mood status text only
 * Used in API responses where color is not needed
 */
export function getMoodStatusText(mood: number): string {
  const result = getMoodStatus(mood)
  return result.status
}

/**
 * Mood thresholds for reference
 */
export const MOOD_THRESHOLDS = {
  PEAK: 9,      // Пиковое состояние
  GOOD: 7,      // Хороший тон
  STABLE: 5,    // Нормально
  LOW: 3,       // Низкий ресурс
  CRISIS: 0,    // Кризис
} as const
