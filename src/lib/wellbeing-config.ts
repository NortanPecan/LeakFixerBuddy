// Wellbeing Tracker v1.0 - Questions Configuration
// All questions and presets are exactly as specified by user

export type Frequency = 'daily' | 'weekly'
export type Scale = '1-5' | 'hours'
export type PresetLevel = 'core' | 'expanded' | 'full'

export interface WellbeingQuestion {
  id: string                    // уникальный ключ
  category: string              // категория для группировки
  question: string              // текст вопроса (точно как у пользователя)
  scale: Scale
  labels: { low: string; high: string }
  frequency: Frequency
  presets: PresetLevel[]
  weight: number                // 0.5-1.5 для расчёта score
  order: number                 // порядок показа
}

/**
 * COMPLETE LIST OF WELLBEING QUESTIONS
 * 
 * CORE: 7 daily questions
 * EXPANDED: CORE + 3 daily + 1 weekly = 11 total
 * FULL: All 24 daily + 7 weekly = 31 total
 */
export const WELLBEING_QUESTIONS: WellbeingQuestion[] = [
  // ===========================================
  // CORE (7 ежедневных вопросов)
  // ===========================================
  
  {
    id: 'overall_state',
    category: 'Общее состояние и действия',
    question: 'Каково было моё общее состояние сегодня?',
    scale: '1-5',
    labels: { low: 'Ужасно', high: 'Отлично' },
    frequency: 'daily',
    presets: ['core', 'expanded', 'full'],
    weight: 1.0,
    order: 1
  },
  {
    id: 'be_ideal_self',
    category: 'Общее состояние и действия',
    question: 'Был ли я сегодня тем человеком, которым хочу быть?',
    scale: '1-5',
    labels: { low: 'Совсем нет', high: 'Полностью' },
    frequency: 'daily',
    presets: ['core', 'expanded', 'full'],
    weight: 1.0,
    order: 2
  },
  {
    id: 'spiritual_practice',
    category: 'Вера / внутренний стержень',
    question: 'Занимался ли я сегодня духовными практиками / внутренней рефлексией?',
    scale: '1-5',
    labels: { low: 'Нет', high: 'Глубоко практиковал' },
    frequency: 'daily',
    presets: ['core', 'expanded', 'full'],
    weight: 0.9,
    order: 3
  },
  {
    id: 'loved_close_ones',
    category: 'Отношения и сообщество',
    question: 'Хорошо ли я любил/поддерживал близких людей сегодня?',
    scale: '1-5',
    labels: { low: 'Игнорировал', high: 'Отдал всю любовь' },
    frequency: 'daily',
    presets: ['core', 'expanded', 'full'],
    weight: 1.0,
    order: 4
  },
  {
    id: 'mental_state_quality',
    category: 'Психическое здоровье',
    question: 'Каково было качество моего психического состояния сегодня?',
    scale: '1-5',
    labels: { low: 'Кризис', high: 'Ясность и спокойствие' },
    frequency: 'daily',
    presets: ['core', 'expanded', 'full'],
    weight: 1.0,
    order: 5
  },
  {
    id: 'body_care',
    category: 'Физическое здоровье',
    question: 'Насколько хорошо я позаботился о теле (сон, питание, движение)?',
    scale: '1-5',
    labels: { low: 'Запустил', high: 'Отлично позаботился' },
    frequency: 'daily',
    presets: ['core', 'expanded', 'full'],
    weight: 0.9,
    order: 6
  },
  {
    id: 'work_enjoyment',
    category: 'Работа и деньги',
    question: 'Получал ли я удовольствие от работы сегодня?',
    scale: '1-5',
    labels: { low: 'Ненавидел', high: 'Наслаждался' },
    frequency: 'daily',
    presets: ['core', 'expanded', 'full'],
    weight: 0.8,
    order: 7
  },

  // ===========================================
  // EXPANDED (дополнительные ежедневные)
  // ===========================================
  
  {
    id: 'meaning',
    category: 'Смысл и включённость',
    question: 'Чувствовал ли я смысл в том, что делал сегодня?',
    scale: '1-5',
    labels: { low: 'Пустота', high: 'Глубокий смысл' },
    frequency: 'daily',
    presets: ['expanded', 'full'],
    weight: 1.0,
    order: 101
  },
  {
    id: 'achievement',
    category: 'Достижения и рост',
    question: 'Было ли ощущение достижения / прогресса сегодня?',
    scale: '1-5',
    labels: { low: 'Стагнация', high: 'Прорыв' },
    frequency: 'daily',
    presets: ['expanded', 'full'],
    weight: 0.9,
    order: 102
  },
  {
    id: 'values_alignment',
    category: 'Характер и привычки',
    question: 'Жил ли я сегодня в соответствии со своими ценностями и характером?',
    scale: '1-5',
    labels: { low: 'Предал себя', high: 'Полная целостность' },
    frequency: 'daily',
    presets: ['expanded', 'full'],
    weight: 1.0,
    order: 103
  },

  // ===========================================
  // EXPANDED (еженедельные)
  // ===========================================
  
  {
    id: 'hobbies_balance',
    category: 'Развлечения',
    question: 'Было ли моё увлечение хобби и развлечениями на этой неделе здоровым (без перегибов)?',
    scale: '1-5',
    labels: { low: 'Перегиб/запой', high: 'Здоровый баланс' },
    frequency: 'weekly',
    presets: ['expanded', 'full'],
    weight: 0.7,
    order: 201
  },

  // ===========================================
  // FULL (дополнительные ежедневные)
  // ===========================================
  
  // Психическое здоровье (дополнительные для Full)
  {
    id: 'morning_ritual',
    category: 'Психическое здоровье',
    question: 'Сделал ли я сегодня свой утренний ритуал?',
    scale: '1-5',
    labels: { low: 'Пропустил', high: 'Полностью выполнил' },
    frequency: 'daily',
    presets: ['full'],
    weight: 0.8,
    order: 301
  },
  {
    id: 'stress_management',
    category: 'Психическое здоровье',
    question: 'Как я справлялся со стрессом сегодня?',
    scale: '1-5',
    labels: { low: 'Сломался', high: 'Отлично справился' },
    frequency: 'daily',
    presets: ['full'],
    weight: 0.9,
    order: 302
  },
  {
    id: 'mental_health_time',
    category: 'Психическое здоровье',
    question: 'Уделил ли я ≥5 минут психическому здоровью (дневник, медитация и т.п.)?',
    scale: '1-5',
    labels: { low: 'Нет', high: 'Да, больше 20 мин' },
    frequency: 'daily',
    presets: ['full'],
    weight: 0.8,
    order: 303
  },

  // Физическое здоровье (детализация для Full)
  {
    id: 'physical_feeling',
    category: 'Физическое здоровье',
    question: 'Как я чувствовал себя физически сегодня?',
    scale: '1-5',
    labels: { low: 'Болезнь/боль', high: 'Отличная форма' },
    frequency: 'daily',
    presets: ['full'],
    weight: 0.9,
    order: 304
  },
  {
    id: 'sleep_hours',
    category: 'Физическое здоровье',
    question: 'Сколько часов я спал?',
    scale: 'hours',
    labels: { low: '0ч', high: '10ч+' },
    frequency: 'daily',
    presets: ['full'],
    weight: 0.8,
    order: 305
  },
  {
    id: 'sleep_quality',
    category: 'Физическое здоровье',
    question: 'Каково было качество моего сна?',
    scale: '1-5',
    labels: { low: 'Бессонница', high: 'Глубокий сон' },
    frequency: 'daily',
    presets: ['full'],
    weight: 0.8,
    order: 306
  },
  {
    id: 'healthy_eating',
    category: 'Физическое здоровье',
    question: 'Насколько здорово я ел сегодня?',
    scale: '1-5',
    labels: { low: 'Только мусор', high: 'Идеально чисто' },
    frequency: 'daily',
    presets: ['full'],
    weight: 0.8,
    order: 307
  },
  {
    id: 'training',
    category: 'Физическое здоровье',
    question: 'Тренировался ли я сегодня?',
    scale: '1-5',
    labels: { low: 'Нет', high: 'Интенсивная тренировка' },
    frequency: 'daily',
    presets: ['full'],
    weight: 0.9,
    order: 308
  },

  // Работа и деньги (дополнительные для Full)
  {
    id: 'work_hours',
    category: 'Работа и деньги',
    question: 'Сколько часов я работал?',
    scale: 'hours',
    labels: { low: '0ч', high: '12ч+' },
    frequency: 'daily',
    presets: ['full'],
    weight: 0.5,
    order: 309
  },

  // Отношения и сообщество (детализация для Full)
  {
    id: 'loved_partner',
    category: 'Отношения и сообщество',
    question: 'Хорошо ли я любил/поддерживал партнёра сегодня?',
    scale: '1-5',
    labels: { low: 'Игнорировал', high: 'Отдал всю любовь' },
    frequency: 'daily',
    presets: ['full'],
    weight: 1.0,
    order: 310
  },
  {
    id: 'loved_friends',
    category: 'Отношения и сообщество',
    question: 'Хорошо ли я любил/поддерживал друзей сегодня?',
    scale: '1-5',
    labels: { low: 'Игнорировал', high: 'Отдал всю любовь' },
    frequency: 'daily',
    presets: ['full'],
    weight: 0.9,
    order: 311
  },

  // Смысл и включённость (дополнительные для Full)
  {
    id: 'positive_emotions',
    category: 'Смысл и включённость',
    question: 'Испытывал ли я положительные эмоции сегодня?',
    scale: '1-5',
    labels: { low: 'Тоска', high: 'Радость' },
    frequency: 'daily',
    presets: ['full'],
    weight: 0.9,
    order: 312
  },
  {
    id: 'flow_state',
    category: 'Смысл и включённость',
    question: 'Был ли я вовлечён в то, что делал (flow)?',
    scale: '1-5',
    labels: { low: 'Отвлекался', high: 'Полный поток' },
    frequency: 'daily',
    presets: ['full'],
    weight: 0.8,
    order: 313
  },

  // Достижения и рост (дополнительные для Full)
  {
    id: 'daily_goals',
    category: 'Достижения и рост',
    question: 'Выполнил ли я свои дневные цели?',
    scale: '1-5',
    labels: { low: 'Ничего', high: 'Всё выполнено' },
    frequency: 'daily',
    presets: ['full'],
    weight: 0.9,
    order: 314
  },

  // Характер и привычки (детализация для Full)
  {
    id: 'virtues_practice',
    category: 'Характер и привычки',
    question: 'Практиковал ли я те качества/добродетели, над которыми работаю?',
    scale: '1-5',
    labels: { low: 'Забыл', high: 'Активно практиковал' },
    frequency: 'daily',
    presets: ['full'],
    weight: 0.9,
    order: 315
  },
  {
    id: 'habits_practice',
    category: 'Характер и привычки',
    question: 'Практиковал ли я те привычки, которые строю?',
    scale: '1-5',
    labels: { low: 'Сорвался', high: 'Все привычки' },
    frequency: 'daily',
    presets: ['full'],
    weight: 0.9,
    order: 316
  },

  // ===========================================
  // FULL (еженедельные)
  // ===========================================
  
  {
    id: 'family_weekly',
    category: 'Отношения и сообщество',
    question: 'Хорошо ли я любил/поддерживал семью на этой неделе?',
    scale: '1-5',
    labels: { low: 'Игнорировал', high: 'Отдал всю любовь' },
    frequency: 'weekly',
    presets: ['full'],
    weight: 1.0,
    order: 401
  },
  {
    id: 'community_contribution',
    category: 'Отношения и сообщество',
    question: 'Внёс ли я вклад в общество / сообщество на этой неделе?',
    scale: '1-5',
    labels: { low: 'Нет', high: 'Значимый вклад' },
    frequency: 'weekly',
    presets: ['full'],
    weight: 0.8,
    order: 402
  },
  {
    id: 'financial_reasonable',
    category: 'Работа и деньги',
    question: 'Был ли я разумен финансово на этой неделе?',
    scale: '1-5',
    labels: { low: 'Импульсивные траты', high: 'Полный контроль' },
    frequency: 'weekly',
    presets: ['full'],
    weight: 0.7,
    order: 403
  },
  {
    id: 'mind_stimulation',
    category: 'Достижения и рост',
    question: 'Был ли мой ум стимулирован, учился ли я новому на этой неделе?',
    scale: '1-5',
    labels: { low: 'Стагнация', high: 'Много нового' },
    frequency: 'weekly',
    presets: ['full'],
    weight: 0.8,
    order: 404
  },
  {
    id: 'generosity',
    category: 'Характер и привычки',
    question: 'Был ли я полезен или щедр по отношению к другим на этой неделе?',
    scale: '1-5',
    labels: { low: 'Эгоистично', high: 'Очень щедр' },
    frequency: 'weekly',
    presets: ['full'],
    weight: 0.8,
    order: 405
  },
  {
    id: 'entertainment_balance',
    category: 'Развлечения',
    question: 'Было ли моё потребление развлечений и хобби здоровым?',
    scale: '1-5',
    labels: { low: 'Перегиб', high: 'Здоровый баланс' },
    frequency: 'weekly',
    presets: ['full'],
    weight: 0.7,
    order: 406
  }
]

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

/**
 * Get questions for a specific preset and frequency
 */
export function getQuestionsForPreset(
  preset: PresetLevel, 
  frequency?: Frequency
): WellbeingQuestion[] {
  return WELLBEING_QUESTIONS.filter(q => 
    q.presets.includes(preset) && 
    (frequency ? q.frequency === frequency : true)
  ).sort((a, b) => a.order - b.order)
}

/**
 * Get daily questions count for preset
 */
export function getDailyQuestionsCount(preset: PresetLevel): number {
  return getQuestionsForPreset(preset, 'daily').length
}

/**
 * Get weekly questions count for preset
 */
export function getWeeklyQuestionsCount(preset: PresetLevel): number {
  return getQuestionsForPreset(preset, 'weekly').length
}

/**
 * Get unique categories for a preset
 */
export function getCategoriesForPreset(preset: PresetLevel): string[] {
  const questions = getQuestionsForPreset(preset)
  return [...new Set(questions.map(q => q.category))]
}

/**
 * Get questions grouped by category
 */
export function getQuestionsGroupedByCategory(
  preset: PresetLevel,
  frequency?: Frequency
): Record<string, WellbeingQuestion[]> {
  const questions = getQuestionsForPreset(preset, frequency)
  const grouped: Record<string, WellbeingQuestion[]> = {}
  
  for (const q of questions) {
    if (!grouped[q.category]) {
      grouped[q.category] = []
    }
    grouped[q.category].push(q)
  }
  
  return grouped
}

/**
 * Preset metadata for UI
 */
export const PRESET_INFO: Record<PresetLevel, {
  name: string
  nameRu: string
  dailyMinutes: string
  dailyQuestions: number
  weeklyQuestions: number
  description: string
}> = {
  core: {
    name: 'Core',
    nameRu: 'Лёгкий',
    dailyMinutes: '1-2 мин',
    dailyQuestions: 7,
    weeklyQuestions: 0,
    description: 'Базовые вопросы о состоянии, отношениях, здоровье и работе'
  },
  expanded: {
    name: 'Expanded',
    nameRu: 'Расширенный',
    dailyMinutes: '3-4 мин',
    dailyQuestions: 10,
    weeklyQuestions: 1,
    description: '+ Смыслы, достижения, ценности и еженедельный вопрос'
  },
  full: {
    name: 'Full',
    nameRu: 'Полный',
    dailyMinutes: '5-7 мин',
    dailyQuestions: 24,
    weeklyQuestions: 7,
    description: 'Полное покрытие всех сфер жизни с детализацией'
  }
}
