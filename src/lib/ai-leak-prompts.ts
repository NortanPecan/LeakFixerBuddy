/**
 * AI Leak Analysis — Prompt builder + response parser
 *
 * Формат ответа AI: JSON внутри ```json ... ``` блока.
 * Если парсинг не удался — graceful fallback на текстовый ответ.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface LeakSolution {
  text: string
  deadline: string        // "сегодня", "через 3 дня", "на этой неделе", "до пятницы"
  priority: 'high' | 'medium' | 'low'
}

export interface LeakAnalysis {
  cause: string           // Главная причина лика (1-2 предложения)
  solutions: LeakSolution[] // 3 конкретных действия с дедлайнами
  personalizedInsight: string // Персонализированное наблюдение на основе паттернов
  urgency: 'now' | 'thisWeek' | 'thisMonth'
  provider?: 'groq' | 'gemini'
}

export interface UserContextForPrompt {
  leakProfile: string[]               // топ-3 типа ликов из UserProfile
  profile: {
    age?: number
    workProfile?: string              // sedentary, mixed, physical, variable
    targetWeight?: number
  }
  recentStats: {
    avgMood: number
    avgEnergy: number
    gymDays: number                   // за последние 7 дней
    ritualRate: number                // % выполнения ритуалов
    sleepAvg: number                  // средний сон за неделю
    avgCalories: number
  }
  pastPatterns: PastPattern[]         // что уже пробовали
}

export interface PastPattern {
  leakType: string
  triedSolutions: string[]
  whatWorked: string[]
}

// ─── Leak type → русское описание ──────────────────────────────────────────

const LEAK_LABELS: Record<string, string> = {
  low_energy:                'низкая энергия',
  chronic_low_energy:        'хронически низкая энергия',
  no_gym:                    'нет тренировок',
  gym_dropout:               'прекратил ходить в зал',
  ritual_consistency:        'непоследовательность в ритуалах',
  ritual_erosion:            'угасание ритуалов',
  missed_checkins:           'пропущенные чекапы',
  calorie_spikes:            'скачки калорий',
  no_habits:                 'нет отслеживания привычек',
  weekend_ritual_drop:       'провалы ритуалов в выходные',
  high_stress:               'высокий стресс',
  sleep_deficit:             'недосып',
  expense_spike:             'всплески расходов',
  tracking_dropout:          'прекратил вести трекинг',
  low_tracking:              'мало данных для анализа',
  expense_category_pattern:  'паттерн трат по категориям',
  ritual_pattern:            'паттерн в ритуалах',
  gym_mood:                  'зал влияет на настроение',
  energy_to_day_quality:     'энергия утром влияет на день',
  rituals_quality:           'ритуалы влияют на качество дня',
}

function getLeakLabel(leakType: string): string {
  return LEAK_LABELS[leakType] ?? leakType.replace(/_/g, ' ')
}

// ─── Work profile → русское описание ───────────────────────────────────────

const WORK_PROFILES: Record<string, string> = {
  sedentary: 'сидячая (офис, удалёнка)',
  mixed:     'смешанная',
  physical:  'физическая',
  variable:  'разная',
}

// ─── System prompt ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Ты — персональный коуч по саморазвитию в приложении LeakFixer Buddy.

Приложение отслеживает "лики" — поведенческие паттерны, снижающие эффективность в здоровье, финансах, привычках, фитнесе и психологии.

Твоя задача:
1. Определить ГЛУБИННУЮ причину лика (не симптом, а корень)
2. Дать 3 КОНКРЕТНЫХ действия с реалистичными дедлайнами
3. Добавить персонализированное наблюдение на основе паттернов пользователя

Правила ответа:
- Отвечай ТОЛЬКО на русском языке
- Будь конкретным и практичным, не общими словами
- Учитывай контекст пользователя (расписание, профиль, что уже пробовал)
- Дедлайны должны быть реалистичными: "сегодня", "за 3 дня", "на этой неделе"
- Не осуждай, не нагнетай, поддерживай

Формат ответа — строго JSON:
\`\`\`json
{
  "cause": "Главная причина в 1-2 предложениях",
  "solutions": [
    { "text": "Конкретное действие 1", "deadline": "сегодня", "priority": "high" },
    { "text": "Конкретное действие 2", "deadline": "за 3 дня", "priority": "medium" },
    { "text": "Конкретное действие 3", "deadline": "на этой неделе", "priority": "low" }
  ],
  "personalizedInsight": "Персонализированное наблюдение на основе паттернов пользователя",
  "urgency": "thisWeek"
}
\`\`\`
urgency: "now" (срочно), "thisWeek" (на этой неделе), "thisMonth" (в этом месяце)`

// ─── User message builder ───────────────────────────────────────────────────

export function buildLeakAnalysisMessage(
  leakType: string,
  leakMessage: string,
  severity: string,
  ctx: UserContextForPrompt
): string {
  const leakLabel = getLeakLabel(leakType)
  const workLabel = ctx.profile.workProfile
    ? (WORK_PROFILES[ctx.profile.workProfile] ?? ctx.profile.workProfile)
    : 'не указана'

  const profilePart = [
    ctx.profile.age ? `Возраст: ${ctx.profile.age} лет` : null,
    `Работа: ${workLabel}`,
    ctx.profile.targetWeight ? `Цель по весу: ${ctx.profile.targetWeight} кг` : null,
  ].filter(Boolean).join(', ')

  const statsPart = [
    ctx.recentStats.avgMood > 0      ? `настроение ${ctx.recentStats.avgMood.toFixed(1)}/10` : null,
    ctx.recentStats.avgEnergy > 0    ? `энергия ${ctx.recentStats.avgEnergy.toFixed(1)}/10` : null,
    ctx.recentStats.sleepAvg > 0     ? `сон ${ctx.recentStats.sleepAvg.toFixed(1)} ч` : null,
    ctx.recentStats.gymDays >= 0     ? `тренировок за неделю: ${ctx.recentStats.gymDays}` : null,
    ctx.recentStats.ritualRate >= 0  ? `ритуалы: ${Math.round(ctx.recentStats.ritualRate)}%` : null,
    ctx.recentStats.avgCalories > 0  ? `ккал/день: ${Math.round(ctx.recentStats.avgCalories)}` : null,
  ].filter(Boolean).join(', ')

  const otherLeaks = ctx.leakProfile
    .filter(l => l !== leakType)
    .map(l => getLeakLabel(l))
    .join(', ')

  const pastPart = ctx.pastPatterns
    .filter(p => p.leakType === leakType && (p.triedSolutions.length > 0 || p.whatWorked.length > 0))
    .map(p => {
      const parts: string[] = []
      if (p.triedSolutions.length > 0) parts.push(`пробовал: ${p.triedSolutions.join(', ')}`)
      if (p.whatWorked.length > 0) parts.push(`сработало: ${p.whatWorked.join(', ')}`)
      return parts.join('; ')
    })
    .join('\n')

  return `## Лик пользователя: ${leakLabel} (${severity})

Описание: ${leakMessage}

## Профиль пользователя
${profilePart || 'Нет данных'}

## Статистика за последние 7 дней
${statsPart || 'Нет данных'}

## Другие лики пользователя
${otherLeaks || 'Нет других ликов'}

## История попыток исправить этот лик
${pastPart || 'Первый раз сталкивается с этим ликом'}

Проанализируй лик и дай конкретные рекомендации.`
}

export function getLeakAnalysisSystemPrompt(): string {
  return SYSTEM_PROMPT
}

// ─── Response parser ────────────────────────────────────────────────────────

export function parseLeakAnalysis(raw: string): LeakAnalysis {
  // Extract JSON from ```json ... ``` block or raw JSON
  const jsonMatch = raw.match(/```json\s*([\s\S]+?)\s*```/) ?? raw.match(/(\{[\s\S]+\})/)

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]) as Partial<LeakAnalysis>

      const solutions: LeakSolution[] = Array.isArray(parsed.solutions)
        ? parsed.solutions.slice(0, 3).map((s) => ({
            text:     typeof s.text === 'string'     ? s.text     : String(s),
            deadline: typeof s.deadline === 'string' ? s.deadline : 'на этой неделе',
            priority: (['high', 'medium', 'low'] as const).includes(s.priority as 'high')
              ? (s.priority as 'high' | 'medium' | 'low')
              : 'medium',
          }))
        : []

      return {
        cause:               parsed.cause ?? raw,
        solutions,
        personalizedInsight: parsed.personalizedInsight ?? '',
        urgency:             (['now', 'thisWeek', 'thisMonth'] as const).includes(parsed.urgency as 'now')
          ? (parsed.urgency as 'now' | 'thisWeek' | 'thisMonth')
          : 'thisWeek',
      }
    } catch {
      // fall through to text fallback
    }
  }

  // Fallback: wrap raw text as single solution
  return {
    cause: raw.slice(0, 300),
    solutions: [{ text: raw.slice(0, 200), deadline: 'на этой неделе', priority: 'medium' }],
    personalizedInsight: '',
    urgency: 'thisWeek',
  }
}

// ─── Telegram message formatter ─────────────────────────────────────────────

export function formatLeakAnalysisForTelegram(
  leakType: string,
  analysis: LeakAnalysis,
  provider: string
): string {
  const urgencyLabel: Record<string, string> = {
    now:       '🔴 Срочно',
    thisWeek:  '🟡 На этой неделе',
    thisMonth: '🟢 В этом месяце',
  }
  const priorityEmoji: Record<string, string> = {
    high: '🔴', medium: '🟡', low: '🟢',
  }
  const providerLabel = provider === 'groq' ? 'Groq Llama' : 'Gemini'

  let msg = `🔍 <b>AI-анализ лика: ${getLeakLabel(leakType)}</b>\n`
  msg += `${urgencyLabel[analysis.urgency] ?? '🟡 На этой неделе'}\n\n`
  msg += `💡 <b>Причина:</b>\n${analysis.cause}\n\n`

  if (analysis.solutions.length > 0) {
    msg += `✅ <b>Что делать:</b>\n`
    analysis.solutions.forEach((s, i) => {
      msg += `\n${i + 1}. ${priorityEmoji[s.priority] ?? '🟡'} ${s.text}\n`
      msg += `   📅 Дедлайн: ${s.deadline}\n`
    })
  }

  if (analysis.personalizedInsight) {
    msg += `\n🧠 <b>Персональное наблюдение:</b>\n${analysis.personalizedInsight}\n`
  }

  msg += `\n<i>Анализ: ${providerLabel}</i>`
  return msg
}
