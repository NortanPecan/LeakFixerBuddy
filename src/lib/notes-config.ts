// Note types and zones configuration

export const NOTE_TYPES = [
  { id: 'thought', label: 'Мысли', icon: '💭', description: 'Быстрая мысль или идея' },
  { id: 'diary', label: 'Дневник', icon: '📔', description: 'Рефлексия, запись о дне' },
  { id: 'content', label: 'Контент', icon: '📚', description: 'Конспект книги, статьи, подкаста' },
  { id: 'reframe', label: 'Рефрейминг', icon: '🔄', description: 'Смена мышления: мысль → новый взгляд → действие' },
] as const

export const NOTE_ZONES = [
  { id: 'general', label: 'Общее', icon: '🌐' },
  { id: 'steam', label: 'Steam', icon: '🎮' },
  { id: 'leakfixer', label: 'LeakFixer', icon: '🔧' },
  { id: 'ai', label: 'ИИ', icon: '🤖' },
  { id: 'poker', label: 'Покер', icon: '🃏' },
  { id: 'health', label: 'Здоровье', icon: '💪' },
] as const

export type NoteType = typeof NOTE_TYPES[number]['id']
export type NoteZone = typeof NOTE_ZONES[number]['id']

// Reframe action structure
export interface ReframeAction {
  text: string
  linkedEntity?: {
    type: 'task' | 'chainStep' | 'ritual' | null
    id: string | null
  } | null
}

// Reframe note data structure (stored in note.text as JSON)
export interface ReframeData {
  situation: string
  oldThought: string
  newView: string
  actions: ReframeAction[]
}

// Helper to get type info
export function getNoteTypeInfo(type: string) {
  return NOTE_TYPES.find(t => t.id === type) || NOTE_TYPES[0]
}

// Helper to get zone info
export function getNoteZoneInfo(zone: string) {
  return NOTE_ZONES.find(z => z.id === zone) || NOTE_ZONES[0]
}

// Parse reframe data from note text
export function parseReframeData(text: string): ReframeData | null {
  try {
    const data = JSON.parse(text)
    if (data.oldThought && data.newView) {
      return data as ReframeData
    }
    return null
  } catch {
    return null
  }
}

// Serialize reframe data to note text
export function serializeReframeData(data: ReframeData): string {
  return JSON.stringify(data)
}

// Get preview for reframe card
export function getReframePreview(data: ReframeData, maxLength = 60): { oldThought: string; newView: string } {
  return {
    oldThought: data.oldThought.length > maxLength 
      ? data.oldThought.substring(0, maxLength) + '...' 
      : data.oldThought,
    newView: data.newView.length > maxLength 
      ? data.newView.substring(0, maxLength) + '...' 
      : data.newView,
  }
}

// Count linked actions
export function countLinkedActions(data: ReframeData): number {
  return data.actions.filter(a => a.linkedEntity?.id).length
}
