import { db } from '@/lib/db'
import { callAI } from '@/lib/ai-provider'

export type LeakPlanMode = 'minimum' | 'base' | 'maximum'
export type LeakPlanConfidence = 'low' | 'medium' | 'high'
export type LeakPlanActionKind = 'task' | 'ritual' | 'skill' | 'trait' | 'challenge' | 'content'

export interface LeakPlanActionDraft {
  kind: LeakPlanActionKind
  title: string
  description?: string | null
  payload?: Record<string, unknown> | null
}

export interface LeakPlanDraft {
  mode: LeakPlanMode
  summary: string
  confidenceLabel: LeakPlanConfidence
  confidenceReason: string
  actions: LeakPlanActionDraft[]
}

interface LeakPlanInput {
  userId: string
  leak: {
    id: string
    title: string
    description: string | null
    severity: string
    sphere: string | null
    contextSnapshot?: unknown
  }
  retryFocus?: {
    actionId?: string | null
    actionTitle: string
    actionKind?: string | null
    failureReason?: string | null
  } | null
}

interface LeakHistoryContext {
  linkedEntities: Array<{
    entityType: string
    label: string
    sourceActionTitle: string | null
    sourceActionKind: string | null
    sourcePlanMode: string | null
    createdAt: string
  }>
  actionFeedback: Array<{
    actionTitle: string
    actionKind: string
    result: string
    comment: string | null
    updatedAt: string
  }>
}

const PLAN_MODES: LeakPlanMode[] = ['minimum', 'base', 'maximum']
const ACTION_KINDS: LeakPlanActionKind[] = ['task', 'ritual', 'skill', 'trait', 'challenge', 'content']
const CONFIDENCE_LABELS: LeakPlanConfidence[] = ['low', 'medium', 'high']

const SYSTEM_PROMPT = `Ты строишь 3 реалистичных плана решения лика для LeakFixer Buddy.

Ответь только JSON без markdown:
{
  "plans": [
    {
      "mode": "minimum",
      "summary": "Короткое объяснение режима",
      "confidenceLabel": "medium",
      "confidenceReason": "Почему шанс именно такой",
      "actions": [
        {
          "kind": "task",
          "title": "Конкретное действие",
          "description": "Краткое пояснение",
          "payload": { "suggestedDeadline": "today" }
        }
      ]
    }
  ]
}

Правила:
- Всегда верни 3 режима: minimum, base, maximum.
- minimum должен быть реально выполним даже в тяжёлой неделе.
- base должен быть нормальным рабочим планом.
- maximum должен быть сильным, но всё ещё реалистичным.
- В каждом режиме дай от 2 до 5 действий.
- kind используй только из списка: task, ritual, skill, trait, challenge, content.
- Пиши по-русски.
- Не обещай 100% результат.
- Учитывай контекст пользователя и уже сработавшие решения, если они есть.`

function parseJsonBlock(raw: string): unknown {
  const match = raw.match(/```json\s*([\s\S]+?)\s*```/) ?? raw.match(/(\{[\s\S]+\})/)
  if (!match) return null

  try {
    return JSON.parse(match[1]) as unknown
  } catch {
    return null
  }
}

function normalizeAction(rawAction: unknown): LeakPlanActionDraft | null {
  if (!rawAction || typeof rawAction !== 'object') return null

  const candidate = rawAction as Record<string, unknown>
  const rawKind = typeof candidate.kind === 'string' ? candidate.kind : 'task'
  const kind = ACTION_KINDS.includes(rawKind as LeakPlanActionKind)
    ? (rawKind as LeakPlanActionKind)
    : 'task'

  const title = typeof candidate.title === 'string' ? candidate.title.trim() : ''
  if (!title) return null

  const description = typeof candidate.description === 'string'
    ? candidate.description.trim()
    : null

  const payload =
    candidate.payload && typeof candidate.payload === 'object' && !Array.isArray(candidate.payload)
      ? (candidate.payload as Record<string, unknown>)
      : null

  return {
    kind,
    title,
    description,
    payload,
  }
}

function normalizePlan(rawPlan: unknown, fallbackMode: LeakPlanMode): LeakPlanDraft {
  const candidate = rawPlan && typeof rawPlan === 'object' ? (rawPlan as Record<string, unknown>) : {}
  const rawMode = typeof candidate.mode === 'string' ? candidate.mode : fallbackMode
  const mode = PLAN_MODES.includes(rawMode as LeakPlanMode)
    ? (rawMode as LeakPlanMode)
    : fallbackMode

  const rawConfidence = typeof candidate.confidenceLabel === 'string'
    ? candidate.confidenceLabel
    : 'medium'
  const confidenceLabel = CONFIDENCE_LABELS.includes(rawConfidence as LeakPlanConfidence)
    ? (rawConfidence as LeakPlanConfidence)
    : 'medium'

  const actions = Array.isArray(candidate.actions)
    ? candidate.actions
        .map(normalizeAction)
        .filter((item): item is LeakPlanActionDraft => Boolean(item))
        .slice(0, 5)
    : []

  return {
    mode,
    summary:
      typeof candidate.summary === 'string' && candidate.summary.trim().length > 0
        ? candidate.summary.trim()
        : `Режим ${mode}`,
    confidenceLabel,
    confidenceReason:
      typeof candidate.confidenceReason === 'string' && candidate.confidenceReason.trim().length > 0
        ? candidate.confidenceReason.trim()
        : 'Гипотеза: оценка основана на текущем контексте пользователя и типичных триггерах этого leak.',
    actions,
  }
}

function buildFallbackPlans(leak: LeakPlanInput['leak']): LeakPlanDraft[] {
  const title = leak.title.trim()
  const detail = leak.description?.trim() || `Наблюдение: ${title}`
  const sphere = leak.sphere ? `Сфера: ${leak.sphere}.` : ''

  return [
    {
      mode: 'minimum',
      summary: 'Минимальный режим, чтобы начать исправление без перегруза.',
      confidenceLabel: 'medium',
      confidenceReason: 'Подходит, когда нужна очень лёгкая точка входа и важна стабильность.',
      actions: [
        {
          kind: 'task',
          title: `Зафиксировать один триггер для "${title}"`,
          description: `${detail}. ${sphere}`.trim(),
          payload: { suggestedDeadline: 'today' },
        },
        {
          kind: 'task',
          title: `Сделать одно маленькое действие против "${title}"`,
          description: 'Выбери действие, которое займёт до 10 минут и не требует идеальных условий.',
          payload: { suggestedDeadline: 'this_week' },
        },
      ],
    },
    {
      mode: 'base',
      summary: 'Рабочий режим с регулярным действием и одним контролем результата.',
      confidenceLabel: 'high',
      confidenceReason: 'Хороший баланс между реалистичностью и шансом увидеть заметный сдвиг.',
      actions: [
        {
          kind: 'task',
          title: `Разобрать причину "${title}" и записать 2 наблюдения`,
          description: detail,
          payload: { suggestedDeadline: 'today' },
        },
        {
          kind: 'ritual',
          title: `Добавить короткий ритуал против "${title}"`,
          description: 'Повторяй ежедневно или в ключевые дни, когда риск лика выше.',
          payload: { days: [1, 2, 3, 4, 5, 6, 7] },
        },
        {
          kind: 'task',
          title: `Проверить прогресс по "${title}" через 7 дней`,
          description: 'Сравни, стало ли меньше повторений и что реально помогло.',
          payload: { suggestedDeadline: 'next_week' },
        },
      ],
    },
    {
      mode: 'maximum',
      summary: 'Сильный режим с ритуалом, контролем среды и дополнительным вызовом.',
      confidenceLabel: 'medium',
      confidenceReason: 'Может дать лучший эффект, если у пользователя есть ресурс удерживать более насыщенный план.',
      actions: [
        {
          kind: 'task',
          title: `Убрать 1 главный триггер для "${title}"`,
          description: 'Измени окружение или расписание так, чтобы лик запускался реже.',
          payload: { suggestedDeadline: 'this_week' },
        },
        {
          kind: 'ritual',
          title: `Сделать ежедневный ритуал поддержки против "${title}"`,
          description: 'Ритуал должен быть конкретным и легко отмечаться в приложении.',
          payload: { days: [1, 2, 3, 4, 5, 6, 7] },
        },
        {
          kind: 'challenge',
          title: `Запустить челлендж по теме "${title}"`,
          description: 'Нужен короткий период с понятным критерием победы.',
          payload: { suggestedDurationDays: 14 },
        },
        {
          kind: 'content',
          title: `Подобрать один материал по теме "${title}"`,
          description: 'Что прочитать или посмотреть, чтобы усилить план действия.',
          payload: { contentType: 'article' },
        },
      ],
    },
  ]
}

function normalizeHistoryContext(raw: unknown): LeakHistoryContext {
  if (!raw || typeof raw !== 'object') {
    return { linkedEntities: [], actionFeedback: [] }
  }

  const candidate = raw as Record<string, unknown>
  const linkedEntities = Array.isArray(candidate.linkedEntities)
    ? candidate.linkedEntities
        .map((item) => {
          if (!item || typeof item !== 'object') return null
          const entity = item as Record<string, unknown>
          const entityType = typeof entity.entityType === 'string' ? entity.entityType : ''
          const label = typeof entity.label === 'string' ? entity.label : ''
          const createdAt = typeof entity.createdAt === 'string' ? entity.createdAt : ''
          if (!entityType || !label || !createdAt) return null

          return {
            entityType,
            label,
            sourceActionTitle:
              typeof entity.sourceActionTitle === 'string' ? entity.sourceActionTitle : null,
            sourceActionKind:
              typeof entity.sourceActionKind === 'string' ? entity.sourceActionKind : null,
            sourcePlanMode:
              typeof entity.sourcePlanMode === 'string' ? entity.sourcePlanMode : null,
            createdAt,
          }
        })
        .filter(
          (
            item,
          ): item is {
            entityType: string
            label: string
            sourceActionTitle: string | null
            sourceActionKind: string | null
            sourcePlanMode: string | null
            createdAt: string
          } => Boolean(item),
        )
    : []

  const actionFeedback = Array.isArray(candidate.actionFeedback)
    ? candidate.actionFeedback
        .map((item) => {
          if (!item || typeof item !== 'object') return null
          const feedback = item as Record<string, unknown>
          const actionTitle = typeof feedback.actionTitle === 'string' ? feedback.actionTitle : ''
          const actionKind = typeof feedback.actionKind === 'string' ? feedback.actionKind : ''
          const result = typeof feedback.result === 'string' ? feedback.result : ''
          const updatedAt = typeof feedback.updatedAt === 'string' ? feedback.updatedAt : ''
          if (!actionTitle || !actionKind || !result || !updatedAt) return null

          return {
            actionTitle,
            actionKind,
            result,
            comment: typeof feedback.comment === 'string' ? feedback.comment : null,
            updatedAt,
          }
        })
        .filter(
          (
            item,
          ): item is {
            actionTitle: string
            actionKind: string
            result: string
            comment: string | null
            updatedAt: string
          } => Boolean(item),
        )
    : []

  return { linkedEntities, actionFeedback }
}

async function loadLeakHistoryContext(userId: string, leakId: string): Promise<LeakHistoryContext> {
  const [linkedEntities, feedbackRows] = await Promise.all([
    db.leakActionLink.findMany({
      where: {
        leakId,
        leak: {
          userId,
        },
      },
      select: {
        entityType: true,
        label: true,
        metadata: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 24,
    }),
    db.leakFeedback.findMany({
      where: {
        leakId,
        leak: {
          userId,
        },
      },
      select: {
        result: true,
        comment: true,
        updatedAt: true,
        solutionAction: {
          select: {
            title: true,
            kind: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 24,
    }),
  ])

  return {
    linkedEntities: linkedEntities.map((link) => {
      const metadata =
        link.metadata && typeof link.metadata === 'object' && !Array.isArray(link.metadata)
          ? (link.metadata as Record<string, unknown>)
          : {}

      return {
        entityType: link.entityType,
        label: link.label,
        sourceActionTitle:
          typeof metadata.sourceActionTitle === 'string' ? metadata.sourceActionTitle : null,
        sourceActionKind:
          typeof metadata.sourceActionKind === 'string' ? metadata.sourceActionKind : null,
        sourcePlanMode:
          typeof metadata.sourcePlanMode === 'string' ? metadata.sourcePlanMode : null,
        createdAt: link.createdAt.toISOString(),
      }
    }),
    actionFeedback: feedbackRows.map((row) => ({
      actionTitle: row.solutionAction.title,
      actionKind: row.solutionAction.kind,
      result: row.result,
      comment: row.comment,
      updatedAt: row.updatedAt.toISOString(),
    })),
  }
}

export async function generateLeakPlans(input: LeakPlanInput): Promise<{
  plans: LeakPlanDraft[]
  provider: 'groq' | 'gemini' | 'fallback'
}> {
  const { userId, leak, retryFocus } = input

  const [existingPattern, leakHistory] = await Promise.all([
    db.userAiPattern.findUnique({
      where: { userId_leakType: { userId, leakType: leak.title } },
      select: {
        whatWorked: true,
        triedSolutions: true,
      },
    }),
    loadLeakHistoryContext(userId, leak.id),
  ])

  const whatWorked = Array.isArray(existingPattern?.whatWorked)
    ? (existingPattern?.whatWorked as string[])
    : []
  const triedSolutions = Array.isArray(existingPattern?.triedSolutions)
    ? (existingPattern?.triedSolutions as Array<{ text?: string }>).map((item) => item.text).filter(Boolean)
    : []

  const snapshotContext =
    leak.contextSnapshot && typeof leak.contextSnapshot === 'object' && !Array.isArray(leak.contextSnapshot)
      ? (leak.contextSnapshot as Record<string, unknown>)
      : null
  const snapshotHistory = normalizeHistoryContext(snapshotContext?.history)
  const mergedHistory: LeakHistoryContext = {
    linkedEntities: [...leakHistory.linkedEntities, ...snapshotHistory.linkedEntities].slice(0, 30),
    actionFeedback: [...leakHistory.actionFeedback, ...snapshotHistory.actionFeedback].slice(0, 30),
  }

  const feedbackSummary =
    mergedHistory.actionFeedback.length > 0
      ? mergedHistory.actionFeedback
          .map(
            (item) =>
              `${item.actionKind}:${item.actionTitle} => ${item.result}${item.comment ? ` (${item.comment})` : ''}`,
          )
          .join('; ')
      : null
  const entitySummary =
    mergedHistory.linkedEntities.length > 0
      ? mergedHistory.linkedEntities
          .map(
            (item) =>
              `${item.entityType}:${item.label}${item.sourceActionTitle ? ` [from ${item.sourceActionTitle}]` : ''}`,
          )
          .join('; ')
      : null

  const retryFocusLine =
    retryFocus && retryFocus.actionTitle.trim().length > 0
      ? [
          `Retry focus: ${retryFocus.actionTitle.trim()}`,
          retryFocus.actionKind ? `kind=${retryFocus.actionKind}` : null,
          retryFocus.failureReason ? `reason=${retryFocus.failureReason}` : null,
        ]
          .filter(Boolean)
          .join(' | ')
      : null
  const retryFocusKey = retryFocus?.actionTitle?.trim().toLowerCase() || null
  const successfulAntiExamples = mergedHistory.actionFeedback
    .filter(
      (item) =>
        item.result === 'worked' &&
        (!retryFocusKey || item.actionTitle.trim().toLowerCase() !== retryFocusKey),
    )
    .slice(0, 5)
    .map((item) => `${item.actionKind}:${item.actionTitle}`)
  const failedRetryExamples =
    retryFocusKey
      ? mergedHistory.actionFeedback
          .filter(
            (item) =>
              item.result === 'not_worked' && item.actionTitle.trim().toLowerCase() === retryFocusKey,
          )
          .slice(0, 3)
          .map((item) => `${item.actionTitle}${item.comment ? ` (${item.comment})` : ''}`)
      : []

  const userMessage = [
    retryFocusLine,
    `Лик: ${leak.title}`,
    leak.description ? `Описание: ${leak.description}` : null,
    `Severity: ${leak.severity}`,
    leak.sphere ? `Сфера: ${leak.sphere}` : null,
    leak.contextSnapshot ? `Контекст: ${JSON.stringify(leak.contextSnapshot)}` : null,
    whatWorked.length > 0 ? `Что уже срабатывало: ${whatWorked.join('; ')}` : null,
    triedSolutions.length > 0 ? `Что уже пробовали: ${triedSolutions.join('; ')}` : null,
    entitySummary ? `Что уже создавали из этого leak: ${entitySummary}` : null,
    feedbackSummary ? `Фидбек по действиям: ${feedbackSummary}` : null,
    successfulAntiExamples.length > 0
      ? `Успешные анти-примеры (не заменять retry-целью): ${successfulAntiExamples.join('; ')}`
      : null,
    failedRetryExamples.length > 0
      ? `Что уже не сработало у retry-цели: ${failedRetryExamples.join('; ')}`
      : null,
    'Требование к confidenceReason: укажи конкретный фактор из контекста и формулируй это как гипотезу, не как доказанный факт.',
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const aiResult = await callAI(SYSTEM_PROMPT, userMessage, {
      userId,
      callType: 'leak-plan',
      leakType: leak.title,
    })

    const parsed = parseJsonBlock(aiResult.text) as { plans?: unknown[] } | null
    const rawPlans = Array.isArray(parsed?.plans) ? parsed?.plans : []

    const byMode = new Map<LeakPlanMode, LeakPlanDraft>()
    PLAN_MODES.forEach((mode, index) => {
      const normalized = normalizePlan(rawPlans[index], mode)
      if (normalized.actions.length === 0) {
        const fallback = buildFallbackPlans(leak).find((item) => item.mode === mode)
        byMode.set(mode, fallback || normalized)
      } else {
        byMode.set(mode, normalized)
      }
    })

    return {
      plans: PLAN_MODES.map((mode) => byMode.get(mode) || buildFallbackPlans(leak).find((item) => item.mode === mode)!).filter(Boolean),
      provider: aiResult.provider,
    }
  } catch {
    return {
      plans: buildFallbackPlans(leak),
      provider: 'fallback',
    }
  }
}
