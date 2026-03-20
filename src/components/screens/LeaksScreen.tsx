'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAppStore, type Screen } from '@/lib/store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LeakAiAnalysisCard } from '@/components/LeakAiAnalysisCard'
import { showErrorToast, showSuccessToast } from '@/lib/network-utils'
import { Brain, Lightbulb, NotebookPen, RefreshCw, Sparkles } from 'lucide-react'

interface LeakEntity {
  id: string
  title: string
  description: string | null
  source: 'manual' | 'signal' | 'imported' | 'ai_suggested'
  status: 'new' | 'in_progress' | 'resolved' | 'archived'
  severity: 'info' | 'warning' | 'critical'
  sphere: string | null
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
  contextSnapshot?: Record<string, unknown> | null
  actions: LeakActionLink[]
}

interface LeakActionLink {
  id: string
  entityType: 'task' | 'ritual' | 'challenge' | 'content' | 'skill' | 'trait'
  entityId: string
  label: string
  status: string
  metadata?: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

interface LeakPlanAction {
  id: string
  kind: 'task' | 'ritual' | 'skill' | 'trait' | 'challenge' | 'content'
  title: string
  description: string | null
  payload?: Record<string, unknown> | null
  sortOrder: number
  createdAt: string
  updatedAt: string
  feedbacks: LeakPlanFeedback[]
}

interface LeakPlanFeedback {
  id: string
  leakId: string
  solutionActionId: string
  result: 'worked' | 'partially' | 'not_worked'
  comment: string | null
  createdAt: string
  updatedAt: string
}

interface LeakSolutionPlan {
  id: string
  leakId: string
  mode: 'minimum' | 'base' | 'maximum'
  summary: string
  confidenceLabel: 'low' | 'medium' | 'high'
  confidenceReason: string | null
  isSelected: boolean
  source: string
  createdAt: string
  updatedAt: string
  actions: LeakPlanAction[]
}

interface LeakHint {
  type: string
  severity: 'info' | 'warning' | 'critical'
  message: string
  emoji: string
  days?: string[]
}

interface LeakPattern {
  leakType: string
  analysisCount: number
  whatWorked: string[]
  clusterKey?: string
  clusterLabel?: string
  clusterSize?: number
  clusterConfidence?: number
  clusterRawConfidence?: number
  clusterConflict?: 'none' | 'mixed' | 'high'
  clusterConflictRatio?: number
  clusterWorkedCount?: number
  clusterPartialCount?: number
  clusterFailedCount?: number
  clusterLeakTypes?: string[]
  clusterWorkedExamples?: string[]
  clusterFailedExamples?: string[]
  linkType?: 'exact' | 'fuzzy' | 'none'
  triedSolutions?: Array<{
    text: string
    worked: boolean | null
    result?: 'worked' | 'partially' | 'not_worked'
    comment?: string | null
    updatedAt?: string | null
    sourceActionKind?: string | null
    sourcePlanMode?: string | null
    linkedEntityType?: string | null
    linkedEntityLabel?: string | null
  }>
  workedCount?: number
  partialCount?: number
  failedCount?: number
  workedExamples?: Array<{
    text: string
    worked: boolean | null
    result?: 'worked' | 'partially' | 'not_worked'
    comment?: string | null
    updatedAt?: string | null
    sourceActionKind?: string | null
    sourcePlanMode?: string | null
    linkedEntityType?: string | null
    linkedEntityLabel?: string | null
  }>
  updatedAt: string
  activeLeakCount?: number
  activeLeaks?: Array<{
    id: string
    title: string
    status: string
    updatedAt: string
    matchType?: 'exact' | 'fuzzy'
  }>
}

interface NextBestActionHint {
  type: 'generate' | 'create_entity' | 'give_feedback' | 'retry' | 'switch_mode' | 'regenerate_context'
  reason: string
  actionId?: string | null
  targetMode?: LeakSolutionPlan['mode'] | null
  confidence: 'low' | 'medium' | 'high'
  correlationId?: string | null
  factors?: Array<{ key: string; weight: number; detail?: string }>
}

interface ContextDriftHint {
  isStale: boolean
  score: number
  generatedAt: string | null
  checkedAt: string
  changedMetrics: Array<{
    key: string
    before: number
    now: number
    deltaPct: number
  }>
}

interface ExecutionScoreHint {
  value: number
  breakdown: {
    createdCoverage: number
    feedbackCoverage: number
    workedShare: number
    attemptsPenalty: number
    driftPenalty: number
  }
}

interface AdaptiveModeHint {
  targetMode: LeakSolutionPlan['mode']
  reason: string
}

interface LeakPolicyHint {
  policyVersion?: number
  computedAt?: string
  selectedMode: LeakSolutionPlan['mode'] | null
  nextBestAction: NextBestActionHint | null
  contextDrift: ContextDriftHint | null
  executionScore: ExecutionScoreHint | null
  adaptiveModeSuggestion: AdaptiveModeHint | null
  runJournal?: Array<{
    type: string
    at: string
    actionId?: string | null
    note?: string | null
    policyCorrelationId?: string | null
    policyActionType?: string | null
    actionTitle?: string | null
    result?: string | null
    factors?: Array<{ key: string; weight: number; detail?: string }>
  }>
  summary?: {
    accepted: number
    rejected: number
    outcomes: number
    outcomeWorked: number
    outcomePartial: number
    outcomeFailed: number
    rejectReasons: Record<string, number>
  }
}

interface LeakDraft {
  leakType: string
  leakMessage: string
  severity: 'info' | 'warning' | 'critical'
}

type LeakStatusFilter = 'all' | 'new' | 'in_progress' | 'resolved' | 'archived'
type LeakSourceFilter = 'all' | 'manual' | 'signal' | 'imported' | 'ai_suggested'
type LeakSortOption = 'updated_desc' | 'created_desc' | 'severity_desc'
type LeakFocusFilter = 'all' | 'focus'
type LeakGroupOption = 'none' | 'sphere' | 'source'
type PatternFilter = 'all' | 'linked'
type FeedbackHistoryFilter = 'all' | 'problem'
type FeedbackLogItem = {
  actionId: string | null
  actionTitle: string
  actionKind: string
  mode: string | null
  result: LeakPlanFeedback['result']
  comment: string | null
  updatedAt: string
}

const SEVERITY_OPTIONS: Array<{
  id: 'info' | 'warning' | 'critical'
  label: string
  description: string
}> = [
  { id: 'info', label: 'Сигнал', description: 'Наблюдение, которое стоит проверить' },
  { id: 'warning', label: 'Проблема', description: 'Повторяется и уже мешает' },
  { id: 'critical', label: 'Срочно', description: 'Сильно влияет и требует реакции' },
]

const STATUS_OPTIONS: Array<{ id: LeakStatusFilter; label: string }> = [
  { id: 'all', label: 'Все' },
  { id: 'new', label: 'Новые' },
  { id: 'in_progress', label: 'В работе' },
  { id: 'resolved', label: 'Решённые' },
  { id: 'archived', label: 'Архив' },
]

const SOURCE_OPTIONS: Array<{ id: LeakSourceFilter; label: string }> = [
  { id: 'all', label: 'Все источники' },
  { id: 'manual', label: 'Ручные' },
  { id: 'signal', label: 'Сигналы' },
  { id: 'ai_suggested', label: 'AI' },
  { id: 'imported', label: 'Импорт' },
]

const SORT_OPTIONS: Array<{ id: LeakSortOption; label: string }> = [
  { id: 'updated_desc', label: 'Сначала обновлённые' },
  { id: 'created_desc', label: 'Сначала новые' },
  { id: 'severity_desc', label: 'Сначала критичные' },
]

const GROUP_OPTIONS: Array<{ id: LeakGroupOption; label: string }> = [
  { id: 'none', label: 'Без групп' },
  { id: 'sphere', label: 'По сфере' },
  { id: 'source', label: 'По источнику' },
]

const STATUS_LABELS: Record<Exclude<LeakStatusFilter, 'all'>, string> = {
  new: 'Новый',
  in_progress: 'В работе',
  resolved: 'Решён',
  archived: 'Архив',
}

const STATUS_STYLES: Record<Exclude<LeakStatusFilter, 'all'>, string> = {
  new: 'bg-white/10 text-white/80 border-white/10',
  in_progress: 'bg-indigo-500/10 text-indigo-200 border-indigo-500/20',
  resolved: 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20',
  archived: 'bg-white/5 text-white/45 border-white/10',
}

const SEVERITY_STYLES: Record<'info' | 'warning' | 'critical', string> = {
  info: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
  warning: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  critical: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
}

const PLAN_MODE_LABELS: Record<LeakSolutionPlan['mode'], string> = {
  minimum: 'Минимум',
  base: 'База',
  maximum: 'Максимум',
}

const PLAN_MODE_STYLES: Record<LeakSolutionPlan['mode'], string> = {
  minimum: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
  base: 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20',
  maximum: 'bg-fuchsia-500/10 text-fuchsia-200 border-fuchsia-500/20',
}

const PLAN_CONFIDENCE_STYLES: Record<LeakSolutionPlan['confidenceLabel'], string> = {
  low: 'bg-rose-500/10 text-rose-200 border-rose-500/20',
  medium: 'bg-amber-500/10 text-amber-200 border-amber-500/20',
  high: 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20',
}

const PLAN_KIND_LABELS: Record<LeakPlanAction['kind'], string> = {
  task: 'Задача',
  ritual: 'Ритуал',
  skill: 'Навык',
  trait: 'Качество',
  challenge: 'Челлендж',
  content: 'Материал',
}

const SPHERE_OPTIONS = [
  { id: 'work', label: 'Работа' },
  { id: 'body', label: 'Тело' },
  { id: 'relationships', label: 'Отношения' },
  { id: 'mindset', label: 'Мышление' },
  { id: 'finance', label: 'Финансы' },
  { id: 'learning', label: 'Развитие' },
  { id: 'poker', label: 'Покер' },
] as const

const LEAK_GUIDANCE_STYLES = {
  indigo: 'border-indigo-500/20 bg-indigo-500/10',
  emerald: 'border-emerald-500/20 bg-emerald-500/10',
  amber: 'border-amber-500/20 bg-amber-500/10',
} as const

function getCurrentMonday(): string {
  const today = new Date()
  const day = today.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().split('T')[0]
}

function formatDate(date: string) {
  try {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return date
  }
}

function buildLeakMessage(leak: LeakEntity) {
  return leak.description?.trim() || leak.title
}

function normalizeLookupValue(value: string | null | undefined) {
  return String(value || '').trim().toLowerCase()
}


function normalizeLeak(rawLeak: LeakEntity): LeakEntity {
  return {
    ...rawLeak,
    actions: Array.isArray(rawLeak.actions) ? rawLeak.actions : [],
    contextSnapshot:
      rawLeak.contextSnapshot && typeof rawLeak.contextSnapshot === 'object'
        ? rawLeak.contextSnapshot
        : null,
  }
}

function normalizePlan(rawPlan: LeakSolutionPlan): LeakSolutionPlan {
  return {
    ...rawPlan,
    actions: Array.isArray(rawPlan.actions)
      ? rawPlan.actions.map((action) => ({
          ...action,
          payload:
            action.payload && typeof action.payload === 'object' && !Array.isArray(action.payload)
              ? action.payload
              : null,
          feedbacks: Array.isArray(action.feedbacks) ? action.feedbacks : [],
        }))
      : [],
  }
}

function normalizePlans(rawPlans: LeakSolutionPlan[]) {
  return Array.isArray(rawPlans) ? rawPlans.map(normalizePlan) : []
}

function getActionScreen(entityType: LeakActionLink['entityType']): Screen {
  switch (entityType) {
    case 'task':
      return 'tasks'
    case 'ritual':
      return 'rituals'
    case 'content':
      return 'development'
    case 'skill':
      return 'skills'
    case 'trait':
      return 'traits'
    case 'challenge':
    default:
      return 'challenges'
  }
}

function getActionLabel(entityType: LeakActionLink['entityType']) {
  switch (entityType) {
    case 'task':
      return 'Задача'
    case 'ritual':
      return 'Ритуал'
    case 'content':
      return 'Материал'
    case 'skill':
      return 'Навык'
    case 'trait':
      return 'Качество'
    case 'challenge':
    default:
      return 'Челлендж'
  }
}

function getSourceLabel(source: LeakEntity['source']) {
  switch (source) {
    case 'manual':
      return 'Ручной ввод'
    case 'signal':
      return 'Автосигнал'
    case 'imported':
      return 'Импорт'
    case 'ai_suggested':
    default:
      return 'AI'
  }
}

function getFeedbackResultLabel(result: LeakPlanFeedback['result']) {
  if (result === 'worked') return 'Сработало'
  if (result === 'partially') return 'Частично'
  return 'Не помогло'
}

function getConfidenceLabelText(label: LeakSolutionPlan['confidenceLabel']) {
  if (label === 'high') return 'Высокий'
  if (label === 'medium') return 'Средний'
  return 'Низкий'
}

function getSphereLabel(sphere: string | null | undefined) {
  if (!sphere) return 'Без сферы'

  const option = SPHERE_OPTIONS.find((item) => item.id === sphere)
  return option?.label || sphere
}

function isConvertedPlanAction(action: LeakPlanAction) {
  return Boolean(action.payload?.convertedEntityId && action.payload?.convertedEntityType)
}

function getLatestPlanFeedback(action: LeakPlanAction) {
  return action.feedbacks?.[0] || null
}

function getSelectedPlan(plans?: LeakSolutionPlan[]) {
  return plans?.find((plan) => plan.isSelected) || plans?.[0] || null
}

type LeakGuidanceTone = keyof typeof LEAK_GUIDANCE_STYLES
type LeakGuidanceAction = 'generate' | 'retry' | 'resolve' | 'reopen' | null

function getPlanActionAnchorId(leakId: string, actionId: string) {
  return `leak-plan-action-${leakId}-${actionId}`
}

function buildLeakGuidance(leak: LeakEntity, plans?: LeakSolutionPlan[]) {
  const selectedPlan = getSelectedPlan(plans)

  if (!selectedPlan) {
    return {
      tone: 'indigo' as LeakGuidanceTone,
      title: 'Собери три режима решения',
      description: 'Minimum, base и maximum помогут быстро выбрать реалистичный путь, а не зависнуть на одном совете.',
      action: 'generate' as LeakGuidanceAction,
      actionLabel: 'Сделать 3 плана',
      selectedPlan: null,
      totalActions: 0,
      createdActions: 0,
      workedActions: 0,
      partialActions: 0,
      failedActions: 0,
      pendingActions: 0,
      feedbackActions: 0,
      bottleneckText: 'Нет выбранного режима: сначала собери минимум/base/maximum.',
      bottleneckActionId: null,
    }
  }

  const totalActions = selectedPlan.actions.length
  const createdActions = selectedPlan.actions.filter(isConvertedPlanAction).length
  const workedActions = selectedPlan.actions.filter(
    (action) => getLatestPlanFeedback(action)?.result === 'worked',
  ).length
  const partialActions = selectedPlan.actions.filter(
    (action) => getLatestPlanFeedback(action)?.result === 'partially',
  ).length
  const failedActions = selectedPlan.actions.filter(
    (action) => getLatestPlanFeedback(action)?.result === 'not_worked',
  ).length
  const feedbackActions = workedActions + partialActions + failedActions
  const pendingActions = Math.max(totalActions - createdActions, 0)
  const firstPendingAction = selectedPlan.actions.find((action) => !isConvertedPlanAction(action)) || null
  const firstNoFeedbackAction =
    selectedPlan.actions.find((action) => isConvertedPlanAction(action) && !getLatestPlanFeedback(action)) || null
  const firstFailedAction =
    selectedPlan.actions.find((action) => getLatestPlanFeedback(action)?.result === 'not_worked') || null

  if (leak.status === 'resolved' || leak.status === 'archived') {
    return {
      tone: 'indigo' as LeakGuidanceTone,
      title: 'Leak сейчас закрыт',
      description:
        failedActions > 0 || partialActions > 0 || pendingActions > 0
          ? 'Если проблема вернулась, верни leak в работу и продолжай уже с обновлённым режимом.'
          : 'Если симптом вернётся, его можно быстро вернуть в работу без создания нового leak.',
      action: 'reopen' as LeakGuidanceAction,
      actionLabel: 'Вернуть в работу',
      selectedPlan,
      totalActions,
      createdActions,
      workedActions,
      partialActions,
      failedActions,
      pendingActions,
      feedbackActions,
      bottleneckText:
        firstFailedAction?.title ||
        firstNoFeedbackAction?.title ||
        firstPendingAction?.title ||
        'Leak закрыт, но можно вернуть в работу при повторении симптома.',
      bottleneckActionId: firstFailedAction?.id || firstNoFeedbackAction?.id || firstPendingAction?.id || null,
    }
  }

  if (failedActions > 0) {
    return {
      tone: 'amber' as LeakGuidanceTone,
      title: 'Часть решений не сработала',
      description: 'Пересобери план или выбери другой режим, чтобы не застрять на нерабочем сценарии.',
      action: 'retry' as LeakGuidanceAction,
      actionLabel: 'Попробовать заново',
      selectedPlan,
      totalActions,
      createdActions,
      workedActions,
      partialActions,
      failedActions,
      pendingActions,
      feedbackActions,
      bottleneckText: firstFailedAction
        ? `Сбойный шаг: ${firstFailedAction.title}`
        : 'Есть неуспешные шаги, лучше пересобрать подход.',
      bottleneckActionId: firstFailedAction?.id || null,
    }
  }

  if (pendingActions > 0) {
    return {
      tone: 'indigo' as LeakGuidanceTone,
      title: `Выбран режим «${PLAN_MODE_LABELS[selectedPlan.mode]}»`,
      description: `Создано ${createdActions} из ${totalActions} действий. Остальные можно применить по одному или целиком.`,
      action: null,
      actionLabel: '',
      selectedPlan,
      totalActions,
      createdActions,
      workedActions,
      partialActions,
      failedActions,
      pendingActions,
      feedbackActions,
      bottleneckText: firstPendingAction
        ? `Не создано: ${firstPendingAction.title}`
        : 'Есть неприменённые шаги в выбранном режиме.',
      bottleneckActionId: firstPendingAction?.id || null,
    }
  }

  if (createdActions > 0 && feedbackActions < createdActions) {
    return {
      tone: 'amber' as LeakGuidanceTone,
      title: 'План уже применён',
      description: 'Теперь важно отметить, что реально помогло, чтобы leak-модуль учился на живом опыте.',
      action: null,
      actionLabel: '',
      selectedPlan,
      totalActions,
      createdActions,
      workedActions,
      partialActions,
      failedActions,
      pendingActions,
      feedbackActions,
      bottleneckText: firstNoFeedbackAction
        ? `Нет feedback: ${firstNoFeedbackAction.title}`
        : 'Не по всем созданным шагам есть feedback.',
      bottleneckActionId: firstNoFeedbackAction?.id || null,
    }
  }

  if (workedActions > 0 && leak.status !== 'resolved') {
    return {
      tone: 'emerald' as LeakGuidanceTone,
      title: 'Есть рабочие решения',
      description: `Сработало ${workedActions} действий. Если проблема больше не возвращается, можно закрывать leak.`,
      action: 'resolve' as LeakGuidanceAction,
      actionLabel: 'Отметить решённым',
      selectedPlan,
      totalActions,
      createdActions,
      workedActions,
      partialActions,
      failedActions,
      pendingActions,
      feedbackActions,
      bottleneckText: 'Есть рабочие шаги: зафиксируй результат и закрой leak, если симптом ушёл.',
      bottleneckActionId: null,
    }
  }

  if (partialActions > 0) {
    return {
      tone: 'amber' as LeakGuidanceTone,
      title: 'Можно усилить текущий подход',
      description: 'Что-то уже помогает, но не полностью. Пересобери режим или попробуй другой сценарий.',
      action: 'retry' as LeakGuidanceAction,
      actionLabel: 'Усилить план',
      selectedPlan,
      totalActions,
      createdActions,
      workedActions,
      partialActions,
      failedActions,
      pendingActions,
      feedbackActions,
      bottleneckText: 'Есть частично успешные шаги: стоит усилить режим или сменить сценарий.',
      bottleneckActionId: null,
    }
  }

  return {
    tone: 'indigo' as LeakGuidanceTone,
    title: 'План готов к следующему шагу',
    description: 'Можно открыть созданные сущности, собрать новый режим или уточнить leak, если контекст изменился.',
    action: 'retry' as LeakGuidanceAction,
    actionLabel: 'Пересобрать план',
    selectedPlan,
    totalActions,
    createdActions,
    workedActions,
    partialActions,
    failedActions,
    pendingActions,
    feedbackActions,
    bottleneckText: 'Критичных блокеров нет: можно тестировать следующий шаг или уточнять контекст.',
    bottleneckActionId: null,
  }
}

function getMinutesSince(date: string | null | undefined) {
  if (!date) return null
  const ts = new Date(date).getTime()
  if (!Number.isFinite(ts)) return null
  return Math.max(0, Math.round((Date.now() - ts) / 60000))
}

function isLeakEntityType(value: string): value is LeakActionLink['entityType'] {
  return (
    value === 'task' ||
    value === 'ritual' ||
    value === 'challenge' ||
    value === 'content' ||
    value === 'skill' ||
    value === 'trait'
  )
}

function getContextSnapshotItems(contextSnapshot?: Record<string, unknown> | null) {
  if (!contextSnapshot) return []

  const LABELS: Record<string, string> = {
    days: 'Дни',
    analysisCount: 'AI-анализов',
    whatWorked: 'Что помогало',
    contextUpdatedAt: 'Контекст обновлён',
    moodAvg: 'Среднее настроение',
    energyAvg: 'Средняя энергия',
    stressAvg: 'Средний стресс',
    sleepHoursAvg: 'Сон (часы)',
    sleepQualityAvg: 'Качество сна',
    mealsLogged: 'Записей еды',
    mealsWithBadQuality: 'Плохих приёмов еды',
    caloriesAvg: 'Средние калории',
    workoutsCompleted: 'Тренировок',
    ritualsCompleted: 'Выполнено ритуалов',
    waterAvg: 'Средняя вода (мл)',
    waterTargetAvg: 'Средняя цель воды (мл)',
    waterGoalHitRate: 'Попадание в цель воды (%)',
    expenseSum7d: 'Расход за 7 дней',
    incomeSum7d: 'Доход за 7 дней',
    netCashflow7d: 'Net cashflow за 7 дней',
    expenseDays7d: 'Дней с расходами (7д)',
    openTasks: 'Открытых задач',
    activeSupplements: 'Активных добавок',
    supplementIntakeChecked7d: 'Приёмов добавок (7д)',
    supplementAdherenceRate: 'Дисциплина добавок (%)',
    emotionLogsCount7d: 'Эмоций отмечено (7д)',
    emotionIntensityAvg: 'Средняя интенсивность эмоций',
    negativeEmotionShare: 'Негативные эмоции (%)',
    morningCheckins: 'Утренних check-in',
    eveningCheckins: 'Вечерних check-in',
    dayRatingAvg: 'Средняя оценка дня',
    plannedEnergyAvg: 'Планируемая энергия',
    doneTasks: 'Выполнено задач',
    lookbackDays: 'Глубина контекста (дней)',
    planActionsTotal: 'Шагов в плане',
    linkedEntitiesTotal: 'Создано сущностей',
    feedbackGivenTotal: 'Feedback получено',
    feedbackCoverageRate: 'Покрытие feedback (%)',
    feedbackWorkedCount: 'Сработало (count)',
    feedbackPartiallyCount: 'Частично (count)',
    feedbackFailedCount: 'Не помогло (count)',
    latestFeedbackResult: 'Последний feedback',
    latestFeedbackAt: 'Последний feedback (дата)',
    latestFeedbackActionTitle: 'Последний feedback (шаг)',
    recentFeedbackWindowSize: 'Свежих feedback',
    recentFeedbackNegativeShare: 'Негативный feedback (%)',
    recentFeedbackWorkedShare: 'Рабочий feedback (%)',
    retryResolvedAt: 'Retry закрыт',
    selectedPlanMode: 'Выбранный режим',
    lastStableMode: 'Последний стабильный режим',
    lastStableAt: 'Режим стабилизировался',
  }

  const lines: string[] = []

  const pushValue = (key: string, value: unknown) => {
    if (value === null || value === undefined || value === '') return
    const label = LABELS[key] || key

    if (Array.isArray(value)) {
      const normalized = value
        .map((item) => (typeof item === 'string' || typeof item === 'number' ? String(item) : null))
        .filter((item): item is string => Boolean(item))
      if (normalized.length > 0) {
        lines.push(`${label}: ${normalized.join(', ')}`)
      }
      return
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      lines.push(`${label}: ${String(value)}`)
    }
  }

  Object.entries(contextSnapshot).forEach(([key, value]) => {
    if (key === 'live' && value && typeof value === 'object' && !Array.isArray(value)) {
      const live = value as Record<string, unknown>
      if (typeof live.generatedAt === 'string') {
        lines.push(`Контекст собран: ${formatDate(live.generatedAt)}`)
      }
      if (live.metrics && typeof live.metrics === 'object' && !Array.isArray(live.metrics)) {
        const metrics = live.metrics as Record<string, unknown>
        Object.entries(metrics).forEach(([metricKey, metricValue]) => {
          if (
            metricKey === 'latestFeedbackResult' ||
            metricKey === 'latestFeedbackAt' ||
            metricKey === 'latestFeedbackActionTitle'
          ) {
            return
          }
          pushValue(metricKey, metricValue)
        })

        const latestFeedbackResult =
          typeof metrics.latestFeedbackResult === 'string'
            ? metrics.latestFeedbackResult
            : null
        const latestFeedbackAt =
          typeof metrics.latestFeedbackAt === 'string'
            ? metrics.latestFeedbackAt
            : null
        const latestFeedbackActionTitle =
          typeof metrics.latestFeedbackActionTitle === 'string'
            ? metrics.latestFeedbackActionTitle
            : null
        if (latestFeedbackResult || latestFeedbackActionTitle || latestFeedbackAt) {
          const resultLabel =
            latestFeedbackResult === 'worked'
              ? 'Сработало'
              : latestFeedbackResult === 'partially'
                ? 'Частично'
                : latestFeedbackResult === 'not_worked'
                  ? 'Не помогло'
                  : latestFeedbackResult
          const parts = [
            latestFeedbackActionTitle ? `шаг: ${latestFeedbackActionTitle}` : null,
            resultLabel ? `результат: ${resultLabel}` : null,
            latestFeedbackAt ? `дата: ${formatDate(latestFeedbackAt)}` : null,
          ].filter(Boolean)
          if (parts.length > 0) {
            lines.push(`Последний feedback: ${parts.join(' • ')}`)
          }
        }
      }
      if (typeof live.lookbackDays === 'number') {
        pushValue('lookbackDays', live.lookbackDays)
      }
      return
    }

    if (key === 'history') {
      return
    }

    if (key === 'retry' && value && typeof value === 'object' && !Array.isArray(value)) {
      const retry = value as Record<string, unknown>
      if (typeof retry.actionTitle === 'string') {
        lines.push(`Retry-фокус: ${retry.actionTitle}`)
      }
      if (typeof retry.failureReason === 'string' && retry.failureReason.trim()) {
        lines.push(`Почему не сработало: ${retry.failureReason}`)
      }
      if (typeof retry.requestedAt === 'string') {
        lines.push(`Retry запрошен: ${formatDate(retry.requestedAt)}`)
      }
      return
    }
    if (key === 'retryResolvedAt') {
      if (typeof value === 'string') {
        lines.push(`Retry закрыт: ${formatDate(value)}`)
      }
      return
    }

    pushValue(key, value)
  })

  return lines
}

function getRetryFocus(contextSnapshot?: Record<string, unknown> | null) {
  if (!contextSnapshot) return null
  const retry =
    contextSnapshot.retry && typeof contextSnapshot.retry === 'object' && !Array.isArray(contextSnapshot.retry)
      ? (contextSnapshot.retry as Record<string, unknown>)
      : null
  if (!retry) return null

  return {
    actionTitle: typeof retry.actionTitle === 'string' ? retry.actionTitle : null,
    actionKind: typeof retry.actionKind === 'string' ? retry.actionKind : null,
    failureReason: typeof retry.failureReason === 'string' ? retry.failureReason : null,
    requestedAt: typeof retry.requestedAt === 'string' ? retry.requestedAt : null,
  }
}

function getLeakActionMetadata(action: LeakActionLink) {
  if (!action.metadata || typeof action.metadata !== 'object' || Array.isArray(action.metadata)) {
    return null
  }

  return action.metadata as Record<string, unknown>
}

function isFocusLeak(leak: LeakEntity) {
  if (!leak.contextSnapshot || typeof leak.contextSnapshot !== 'object' || Array.isArray(leak.contextSnapshot)) {
    return false
  }

  return Boolean((leak.contextSnapshot as Record<string, unknown>).isFocus)
}

function getLinkedEntityForPlanAction(leak: LeakEntity, action: LeakPlanAction) {
  const byMetadata = leak.actions.find((link) => {
    const metadata = getLeakActionMetadata(link)
    return metadata?.sourceActionId === action.id
  })

  if (byMetadata) return byMetadata

  const convertedEntityId =
    typeof action.payload?.convertedEntityId === 'string' ? action.payload.convertedEntityId : null
  const convertedEntityType =
    typeof action.payload?.convertedEntityType === 'string'
      ? action.payload.convertedEntityType
      : null
  if (!convertedEntityId || !convertedEntityType) return null

  return (
    leak.actions.find(
      (link) => link.entityId === convertedEntityId && link.entityType === convertedEntityType,
    ) || null
  )
}

function getFeedbackByActionId(plans?: LeakSolutionPlan[]) {
  const map = new Map<string, LeakPlanFeedback>()
  plans?.forEach((plan) => {
    plan.actions.forEach((action) => {
      const latest = getLatestPlanFeedback(action)
      if (!latest) return

      const existing = map.get(action.id)
      if (!existing || new Date(latest.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
        map.set(action.id, latest)
      }
    })
  })
  return map
}

function getPlanActionById(plans?: LeakSolutionPlan[]) {
  const map = new Map<string, LeakPlanAction>()
  plans?.forEach((plan) => {
    plan.actions.forEach((action) => {
      map.set(action.id, action)
    })
  })
  return map
}

function normalizePattern(rawPattern: unknown): LeakPattern | null {
  if (!rawPattern || typeof rawPattern !== 'object') return null
  const pattern = rawPattern as Record<string, unknown>
  if (typeof pattern.leakType !== 'string' || !pattern.leakType.trim()) return null

  const normalizeTried = (item: unknown) => {
    if (!item || typeof item !== 'object') return null
    const candidate = item as Record<string, unknown>
    if (typeof candidate.text !== 'string' || !candidate.text.trim()) return null

    const result = candidate.result
    return {
      text: candidate.text.trim(),
      worked: typeof candidate.worked === 'boolean' ? candidate.worked : null,
      result:
        result === 'worked' || result === 'partially' || result === 'not_worked'
          ? result
          : undefined,
      comment: typeof candidate.comment === 'string' ? candidate.comment : null,
      updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : null,
      sourceActionKind: typeof candidate.sourceActionKind === 'string' ? candidate.sourceActionKind : null,
      sourcePlanMode: typeof candidate.sourcePlanMode === 'string' ? candidate.sourcePlanMode : null,
      linkedEntityType: typeof candidate.linkedEntityType === 'string' ? candidate.linkedEntityType : null,
      linkedEntityLabel: typeof candidate.linkedEntityLabel === 'string' ? candidate.linkedEntityLabel : null,
    } as LeakPattern['triedSolutions'][number]
  }

  const triedSolutions = Array.isArray(pattern.triedSolutions)
    ? pattern.triedSolutions
        .map(normalizeTried)
        .filter((item): item is NonNullable<ReturnType<typeof normalizeTried>> => Boolean(item))
    : []
  const fallbackWorkedExamples = triedSolutions
    .filter((item) => item.result === 'worked' || item.worked === true)
    .slice(0, 6)
  const workedExamples = Array.isArray(pattern.workedExamples)
    ? pattern.workedExamples
        .map(normalizeTried)
        .filter((item): item is NonNullable<ReturnType<typeof normalizeTried>> => Boolean(item))
    : fallbackWorkedExamples

  return {
    leakType: pattern.leakType.trim(),
    analysisCount: typeof pattern.analysisCount === 'number' ? pattern.analysisCount : 0,
    whatWorked: Array.isArray(pattern.whatWorked)
      ? pattern.whatWorked.filter((item): item is string => typeof item === 'string')
      : [],
    linkType:
      pattern.linkType === 'exact' || pattern.linkType === 'fuzzy' || pattern.linkType === 'none'
        ? pattern.linkType
        : undefined,
    triedSolutions,
    workedCount:
      typeof pattern.workedCount === 'number'
        ? pattern.workedCount
        : triedSolutions.filter((item) => item.result === 'worked').length,
    partialCount:
      typeof pattern.partialCount === 'number'
        ? pattern.partialCount
        : triedSolutions.filter((item) => item.result === 'partially').length,
    failedCount:
      typeof pattern.failedCount === 'number'
        ? pattern.failedCount
        : triedSolutions.filter((item) => item.result === 'not_worked').length,
    clusterKey: typeof pattern.clusterKey === 'string' ? pattern.clusterKey : undefined,
    clusterLabel: typeof pattern.clusterLabel === 'string' ? pattern.clusterLabel : undefined,
    clusterSize: typeof pattern.clusterSize === 'number' ? pattern.clusterSize : undefined,
    clusterConfidence:
      typeof pattern.clusterConfidence === 'number' ? pattern.clusterConfidence : undefined,
    clusterWorkedCount:
      typeof pattern.clusterWorkedCount === 'number' ? pattern.clusterWorkedCount : undefined,
    clusterPartialCount:
      typeof pattern.clusterPartialCount === 'number' ? pattern.clusterPartialCount : undefined,
    clusterFailedCount:
      typeof pattern.clusterFailedCount === 'number' ? pattern.clusterFailedCount : undefined,
    clusterLeakTypes: Array.isArray(pattern.clusterLeakTypes)
      ? pattern.clusterLeakTypes.filter((item): item is string => typeof item === 'string').slice(0, 8)
      : undefined,
    clusterWorkedExamples: Array.isArray(pattern.clusterWorkedExamples)
      ? pattern.clusterWorkedExamples.filter((item): item is string => typeof item === 'string').slice(0, 6)
      : undefined,
    clusterFailedExamples: Array.isArray(pattern.clusterFailedExamples)
      ? pattern.clusterFailedExamples.filter((item): item is string => typeof item === 'string').slice(0, 6)
      : undefined,
    workedExamples,
    updatedAt: typeof pattern.updatedAt === 'string' ? pattern.updatedAt : new Date().toISOString(),
    activeLeakCount: typeof pattern.activeLeakCount === 'number' ? pattern.activeLeakCount : undefined,
    activeLeaks: Array.isArray(pattern.activeLeaks)
      ? pattern.activeLeaks
          .filter((item): item is { id: string; title: string; status: string; updatedAt: string; matchType?: 'exact' | 'fuzzy' } => {
            if (!item || typeof item !== 'object') return false
            const leak = item as Record<string, unknown>
            return (
              typeof leak.id === 'string' &&
              typeof leak.title === 'string' &&
              typeof leak.status === 'string' &&
              typeof leak.updatedAt === 'string'
            )
          })
          .map((item) => ({
            ...item,
            matchType:
              item.matchType === 'exact' || item.matchType === 'fuzzy'
                ? item.matchType
                : undefined,
          }))
      : undefined,
  }
}

function getPatternLinkTypeForLeak(pattern: LeakPattern, leak: LeakEntity): 'exact' | 'fuzzy' | 'none' {
  const fromActiveLeak = pattern.activeLeaks?.find((item) => item.id === leak.id)
  if (fromActiveLeak?.matchType === 'exact' || fromActiveLeak?.matchType === 'fuzzy') {
    return fromActiveLeak.matchType
  }

  const patternKey = normalizeLookupValue(pattern.leakType)
  const leakKey = normalizeLookupValue(leak.title)
  if (!patternKey || !leakKey) return 'none'
  if (patternKey === leakKey) return 'exact'
  if (patternKey.includes(leakKey) || leakKey.includes(patternKey)) return 'fuzzy'
  return 'none'
}

function getBestPatternForLeak(patterns: LeakPattern[], leak: LeakEntity): LeakPattern | null {
  if (!patterns.length) return null

  const exact = patterns.find((pattern) => getPatternLinkTypeForLeak(pattern, leak) === 'exact')
  if (exact) return exact

  const fuzzy = patterns.find((pattern) => getPatternLinkTypeForLeak(pattern, leak) === 'fuzzy')
  return fuzzy || null
}

function getLeakFeedbackTimeline(leak: LeakEntity, plans?: LeakSolutionPlan[]) {
  const rows: Array<{
    actionId: string
    actionTitle: string
    actionKind: LeakPlanAction['kind']
    result: LeakPlanFeedback['result']
    comment: string | null
    updatedAt: string
    mode: LeakSolutionPlan['mode']
    linkedEntity: LeakActionLink | null
  }> = []

  plans?.forEach((plan) => {
    plan.actions.forEach((action) => {
      const feedback = getLatestPlanFeedback(action)
      if (!feedback) return

      rows.push({
        actionId: action.id,
        actionTitle: action.title,
        actionKind: action.kind,
        result: feedback.result,
        comment: feedback.comment,
        updatedAt: feedback.updatedAt,
        mode: plan.mode,
        linkedEntity: getLinkedEntityForPlanAction(leak, action),
      })
    })
  })

  return rows.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

function getFeedbackLogFromSnapshot(contextSnapshot?: Record<string, unknown> | null): FeedbackLogItem[] {
  if (!contextSnapshot || typeof contextSnapshot !== 'object' || Array.isArray(contextSnapshot)) {
    return []
  }

  const raw = contextSnapshot.feedbackLog
  if (!Array.isArray(raw)) return []

  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const candidate = item as Record<string, unknown>
      if (
        typeof candidate.actionTitle !== 'string' ||
        typeof candidate.actionKind !== 'string' ||
        typeof candidate.updatedAt !== 'string'
      ) {
        return null
      }
      if (
        candidate.result !== 'worked' &&
        candidate.result !== 'partially' &&
        candidate.result !== 'not_worked'
      ) {
        return null
      }
      return {
        actionId: typeof candidate.actionId === 'string' ? candidate.actionId : null,
        actionTitle: candidate.actionTitle,
        actionKind: candidate.actionKind,
        mode: typeof candidate.mode === 'string' ? candidate.mode : null,
        result: candidate.result as LeakPlanFeedback['result'],
        comment: typeof candidate.comment === 'string' ? candidate.comment : null,
        updatedAt: candidate.updatedAt,
      }
    })
    .filter((item): item is FeedbackLogItem => Boolean(item))
}

function getLeakFeedbackByAction(leak: LeakEntity, plans?: LeakSolutionPlan[]) {
  const rawEvents = getFeedbackLogFromSnapshot(leak.contextSnapshot)
  const grouped = new Map<string, {
    actionId: string | null
    actionTitle: string
    actionKind: LeakPlanAction['kind']
    mode: LeakSolutionPlan['mode'] | null
    result: LeakPlanFeedback['result']
    comment: string | null
    updatedAt: string
    attempts: number
    linkedEntity: LeakActionLink | null
  }>()

  const planActionsById = new Map<string, { action: LeakPlanAction; mode: LeakSolutionPlan['mode'] }>()
  plans?.forEach((plan) => {
    plan.actions.forEach((action) => {
      planActionsById.set(action.id, { action, mode: plan.mode })
    })
  })

  rawEvents
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .forEach((item) => {
      const fallbackKey = `${item.actionKind}|${normalizeLookupValue(item.actionTitle)}`
      const key = item.actionId || fallbackKey
      const existing = grouped.get(key)
      const planAction = item.actionId ? planActionsById.get(item.actionId)?.action : null
      const linkedEntity = planAction ? getLinkedEntityForPlanAction(leak, planAction) : null
      if (!existing) {
        grouped.set(key, {
          actionId: item.actionId,
          actionTitle: item.actionTitle,
          actionKind: item.actionKind as LeakPlanAction['kind'],
          mode:
            item.mode && (item.mode === 'minimum' || item.mode === 'base' || item.mode === 'maximum')
              ? item.mode
              : (item.actionId ? planActionsById.get(item.actionId)?.mode || null : null),
          result: item.result,
          comment: item.comment,
          updatedAt: item.updatedAt,
          attempts: 1,
          linkedEntity,
        })
        return
      }
      existing.attempts += 1
    })

  if (grouped.size === 0) {
    getLeakFeedbackTimeline(leak, plans).forEach((item) => {
      const key = item.actionId || `${item.actionKind}|${normalizeLookupValue(item.actionTitle)}`
      if (!grouped.has(key)) {
        grouped.set(key, {
          actionId: item.actionId,
          actionTitle: item.actionTitle,
          actionKind: item.actionKind,
          mode: item.mode,
          result: item.result,
          comment: item.comment,
          updatedAt: item.updatedAt,
          attempts: 1,
          linkedEntity: item.linkedEntity,
        })
      }
    })
  }

  return Array.from(grouped.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}

function getSnapshotMode(
  contextSnapshot: Record<string, unknown> | null | undefined,
  key: 'selectedPlanMode' | 'lastStableMode',
) {
  if (!contextSnapshot || typeof contextSnapshot !== 'object' || Array.isArray(contextSnapshot)) {
    return null
  }
  const value = contextSnapshot[key]
  if (value !== 'minimum' && value !== 'base' && value !== 'maximum') {
    return null
  }
  return value as LeakSolutionPlan['mode']
}

function getLatestWorkedOutcome(leak: LeakEntity, plans?: LeakSolutionPlan[]) {
  const workedRows: Array<{
    actionTitle: string
    actionKind: LeakPlanAction['kind']
    mode: LeakSolutionPlan['mode']
    updatedAt: string
    linkedEntity: LeakActionLink | null
  }> = []

  plans?.forEach((plan) => {
    plan.actions.forEach((action) => {
      const feedback = getLatestPlanFeedback(action)
      if (!feedback || feedback.result !== 'worked') return

      workedRows.push({
        actionTitle: action.title,
        actionKind: action.kind,
        mode: plan.mode,
        updatedAt: feedback.updatedAt,
        linkedEntity: getLinkedEntityForPlanAction(leak, action),
      })
    })
  })

  workedRows.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  return workedRows[0] || null
}

function getLeakGroupKey(leak: LeakEntity, groupBy: LeakGroupOption) {
  if (groupBy === 'sphere') {
    return leak.sphere || '__no_sphere__'
  }

  if (groupBy === 'source') {
    return leak.source
  }

  return '__all__'
}

function getLeakGroupLabel(groupKey: string, groupBy: LeakGroupOption) {
  if (groupBy === 'sphere') {
    return groupKey === '__no_sphere__' ? 'Без сферы' : getSphereLabel(groupKey)
  }

  if (groupBy === 'source') {
    return getSourceLabel(groupKey as LeakEntity['source'])
  }

  return 'Все leaks'
}

function getLiveContextMetrics(contextSnapshot?: Record<string, unknown> | null) {
  if (!contextSnapshot || typeof contextSnapshot !== 'object' || Array.isArray(contextSnapshot)) {
    return null
  }

  const live =
    contextSnapshot.live && typeof contextSnapshot.live === 'object' && !Array.isArray(contextSnapshot.live)
      ? (contextSnapshot.live as Record<string, unknown>)
      : null
  const metrics =
    live?.metrics && typeof live.metrics === 'object' && !Array.isArray(live.metrics)
      ? (live.metrics as Record<string, unknown>)
      : null

  return metrics
}

function getContextMetricNumber(
  contextSnapshot: Record<string, unknown> | null | undefined,
  key: string,
) {
  const metrics = getLiveContextMetrics(contextSnapshot)
  if (!metrics) return null
  return typeof metrics[key] === 'number' ? metrics[key] : null
}

function getSnapshotHistory(contextSnapshot?: Record<string, unknown> | null) {
  if (!contextSnapshot || typeof contextSnapshot !== 'object' || Array.isArray(contextSnapshot)) {
    return { linkedEntities: [], actionFeedback: [] } as const
  }
  const history =
    contextSnapshot.history && typeof contextSnapshot.history === 'object' && !Array.isArray(contextSnapshot.history)
      ? (contextSnapshot.history as Record<string, unknown>)
      : null
  if (!history) {
    return { linkedEntities: [], actionFeedback: [] } as const
  }

  const linkedEntities = Array.isArray(history.linkedEntities)
    ? history.linkedEntities
        .map((item) => {
          if (!item || typeof item !== 'object') return null
          const row = item as Record<string, unknown>
          if (
            typeof row.entityType !== 'string' ||
            typeof row.label !== 'string' ||
            typeof row.createdAt !== 'string'
          ) {
            return null
          }
          return {
            entityType: row.entityType,
            label: row.label,
            sourceActionTitle: typeof row.sourceActionTitle === 'string' ? row.sourceActionTitle : null,
            sourceActionKind: typeof row.sourceActionKind === 'string' ? row.sourceActionKind : null,
            sourcePlanMode: typeof row.sourcePlanMode === 'string' ? row.sourcePlanMode : null,
            createdAt: row.createdAt,
          }
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
    : []

  const actionFeedback = Array.isArray(history.actionFeedback)
    ? history.actionFeedback
        .map((item) => {
          if (!item || typeof item !== 'object') return null
          const row = item as Record<string, unknown>
          if (
            typeof row.actionTitle !== 'string' ||
            typeof row.actionKind !== 'string' ||
            typeof row.result !== 'string' ||
            typeof row.updatedAt !== 'string'
          ) {
            return null
          }
          return {
            actionTitle: row.actionTitle,
            actionKind: row.actionKind,
            result: row.result,
            comment: typeof row.comment === 'string' ? row.comment : null,
            updatedAt: row.updatedAt,
          }
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
    : []

  return { linkedEntities, actionFeedback } as const
}

function getRecentFeedbackTrend(contextSnapshot?: Record<string, unknown> | null) {
  const metrics = getLiveContextMetrics(contextSnapshot)
  if (!metrics) return null

  const windowSize =
    typeof metrics.recentFeedbackWindowSize === 'number'
      ? metrics.recentFeedbackWindowSize
      : null
  const negativeShare =
    typeof metrics.recentFeedbackNegativeShare === 'number'
      ? metrics.recentFeedbackNegativeShare
      : null
  const workedShare =
    typeof metrics.recentFeedbackWorkedShare === 'number'
      ? metrics.recentFeedbackWorkedShare
      : null

  if (windowSize === null || windowSize <= 0 || negativeShare === null) return null

  return {
    windowSize,
    negativeShare,
    workedShare,
    isRisky: windowSize >= 3 && negativeShare >= 67,
    isStable: windowSize >= 3 && workedShare !== null && workedShare >= 67 && negativeShare <= 33,
  }
}

function buildContextHypotheses(contextSnapshot?: Record<string, unknown> | null) {
  const metrics = getLiveContextMetrics(contextSnapshot)
  if (!metrics) return []

  const toNum = (key: string) => (typeof metrics[key] === 'number' ? (metrics[key] as number) : null)
  const hypotheses: string[] = []

  const energyAvg = toNum('energyAvg')
  const moodAvg = toNum('moodAvg')
  const sleepHoursAvg = toNum('sleepHoursAvg')
  const stressAvg = toNum('stressAvg')
  const workoutsCompleted = toNum('workoutsCompleted')
  const ritualsCompleted = toNum('ritualsCompleted')
  const mealsWithBadQuality = toNum('mealsWithBadQuality')
  const waterGoalHitRate = toNum('waterGoalHitRate')
  const netCashflow7d = toNum('netCashflow7d')
  const expenseDays7d = toNum('expenseDays7d')
  const openTasks = toNum('openTasks')
  const activeSupplements = toNum('activeSupplements')
  const supplementAdherenceRate = toNum('supplementAdherenceRate')
  const negativeEmotionShare = toNum('negativeEmotionShare')
  const planActionsTotal = toNum('planActionsTotal')
  const feedbackCoverageRate = toNum('feedbackCoverageRate')
  const feedbackWorkedCount = toNum('feedbackWorkedCount')
  const feedbackFailedCount = toNum('feedbackFailedCount')
  const latestFeedbackResult =
    typeof metrics.latestFeedbackResult === 'string' ? metrics.latestFeedbackResult : null
  const recentFeedbackWindowSize = toNum('recentFeedbackWindowSize')
  const recentFeedbackNegativeShare = toNum('recentFeedbackNegativeShare')
  const recentFeedbackWorkedShare = toNum('recentFeedbackWorkedShare')

  if (sleepHoursAvg !== null && sleepHoursAvg < 6.5) {
    hypotheses.push('Наблюдение: недосып может усиливать leak. Стоит проверить связь сна и срывов.')
  }
  if (stressAvg !== null && stressAvg >= 7) {
    hypotheses.push('Наблюдение: высокий стресс совпадает с leak. Проверь, нужен ли anti-stress шаг в режиме.')
  }
  if (energyAvg !== null && energyAvg <= 5) {
    hypotheses.push('Наблюдение: низкая энергия — вероятный триггер leak. Имеет смысл добавить более лёгкий режим.')
  }
  if (moodAvg !== null && moodAvg <= 5) {
    hypotheses.push('Наблюдение: просадка настроения совпадает с leak. Полезно добавить быстрый стабилизирующий ритуал.')
  }
  if (workoutsCompleted !== null && workoutsCompleted === 0) {
    hypotheses.push('Наблюдение: в окне контекста нет тренировок. Проверь влияние движения на устойчивость к leak.')
  }
  if (ritualsCompleted !== null && ritualsCompleted <= 2) {
    hypotheses.push('Наблюдение: ритуалы выполнялись редко. Возможно, leak связан с потерей структуры дня.')
  }
  if (mealsWithBadQuality !== null && mealsWithBadQuality >= 3) {
    hypotheses.push('Наблюдение: качество питания часто проседает. Стоит проверить, не усиливает ли это leak.')
  }
  if (waterGoalHitRate !== null && waterGoalHitRate < 50) {
    hypotheses.push('Наблюдение: вода часто ниже цели. Проверь, влияет ли гидратация на устойчивость к leak.')
  }
  if (expenseDays7d !== null && expenseDays7d >= 5) {
    hypotheses.push('Наблюдение: почти каждый день есть расходы. Проверь импульсные траты как триггер leak.')
  }
  if (netCashflow7d !== null && netCashflow7d < 0) {
    hypotheses.push('Наблюдение: cashflow за неделю отрицательный. Для leak в финансах нужен более жёсткий minimum-режим.')
  }
  if (openTasks !== null && openTasks >= 18) {
    hypotheses.push('Наблюдение: накопилось много открытых задач. Leak может усиливаться из-за перегруза и распыления.')
  }
  if (activeSupplements !== null && activeSupplements > 0 && supplementAdherenceRate !== null && supplementAdherenceRate < 50) {
    hypotheses.push('Наблюдение: низкая дисциплина по добавкам. Это может усиливать просадки в энергии и устойчивости.')
  }
  if (negativeEmotionShare !== null && negativeEmotionShare >= 60) {
    hypotheses.push('Наблюдение: преобладают негативные эмоции. Для leak полезно добавить шаг на стабилизацию состояния.')
  }
  if (planActionsTotal !== null && planActionsTotal > 0 && feedbackCoverageRate !== null && feedbackCoverageRate < 50) {
    hypotheses.push('Наблюдение: по части шагов нет feedback. Закрой цикл обратной связи, чтобы learning работал точнее.')
  }
  if (
    feedbackWorkedCount !== null &&
    feedbackFailedCount !== null &&
    feedbackFailedCount > feedbackWorkedCount &&
    feedbackFailedCount >= 2
  ) {
    hypotheses.push('Наблюдение: нерабочих шагов больше, чем сработавших. Имеет смысл перейти на другой режим и пересобрать план.')
  }
  if (latestFeedbackResult === 'not_worked') {
    hypotheses.push('Наблюдение: последний feedback отрицательный. Лучше быстро сделать retry с фокусом на этот шаг, пока контекст свежий.')
  }
  if (
    recentFeedbackWindowSize !== null &&
    recentFeedbackWindowSize >= 3 &&
    recentFeedbackNegativeShare !== null &&
    recentFeedbackNegativeShare >= 67
  ) {
    hypotheses.push('Наблюдение: последние шаги часто не срабатывают. Стоит временно упростить режим до minimum и проверить базовые триггеры.')
  }
  if (
    recentFeedbackWindowSize !== null &&
    recentFeedbackWindowSize >= 3 &&
    recentFeedbackWorkedShare !== null &&
    recentFeedbackWorkedShare >= 67
  ) {
    hypotheses.push('Наблюдение: большинство последних шагов сработали. Можно закреплять режим и постепенно масштабировать его.')
  }

  return hypotheses.slice(0, 3)
}

function normalizeNextBestAction(value: unknown): NextBestActionHint | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Record<string, unknown>
  const type = candidate.type
  if (
    type !== 'generate' &&
    type !== 'create_entity' &&
    type !== 'give_feedback' &&
    type !== 'retry' &&
    type !== 'switch_mode' &&
    type !== 'regenerate_context'
  ) {
    return null
  }
  if (typeof candidate.reason !== 'string' || !candidate.reason.trim()) return null
  const confidence =
    candidate.confidence === 'low' || candidate.confidence === 'medium' || candidate.confidence === 'high'
      ? candidate.confidence
      : 'medium'
  const targetMode =
    candidate.targetMode === 'minimum' || candidate.targetMode === 'base' || candidate.targetMode === 'maximum'
      ? candidate.targetMode
      : null
  const factors = Array.isArray(candidate.factors)
    ? candidate.factors
        .map((item) => {
          if (!item || typeof item !== 'object') return null
          const factor = item as Record<string, unknown>
          if (typeof factor.key !== 'string' || typeof factor.weight !== 'number') return null
          return {
            key: factor.key,
            weight: factor.weight,
            detail: typeof factor.detail === 'string' ? factor.detail : undefined,
          }
        })
        .filter((item): item is NonNullable<NextBestActionHint['factors']>[number] => Boolean(item))
        .slice(0, 5)
    : []
  return {
    type,
    reason: candidate.reason.trim(),
    confidence,
    actionId: typeof candidate.actionId === 'string' ? candidate.actionId : null,
    targetMode,
    correlationId: typeof candidate.correlationId === 'string' ? candidate.correlationId : null,
    factors,
  }
}

function getPolicyEventLabel(type: string) {
  switch (type) {
    case 'policy_suggested':
      return 'Совет предложен'
    case 'policy_accepted':
      return 'Совет принят'
    case 'policy_rejected':
      return 'Совет отклонён'
    case 'policy_outcome':
      return 'Результат совета'
    default:
      return type
  }
}

function getPolicyActionLabel(type: string | null | undefined) {
  if (!type) return 'n/a'
  switch (type) {
    case 'switch_mode':
      return 'Смена режима'
    case 'retry':
      return 'Retry'
    case 'regenerate_context':
      return 'Пересбор контекста'
    case 'focus_action':
      return 'Фокус на шаг'
    case 'generate':
      return 'Генерация'
    case 'create_entity':
      return 'Создать сущность'
    case 'give_feedback':
      return 'Дать feedback'
    default:
      return type
  }
}

function getPolicyResultLabel(result: string | null | undefined) {
  if (!result) return null
  if (result === 'worked') return 'Сработало'
  if (result === 'partially') return 'Частично'
  if (result === 'not_worked') return 'Не помогло'
  return result
}

function normalizeContextDrift(value: unknown): ContextDriftHint | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Record<string, unknown>
  if (typeof candidate.isStale !== 'boolean' || typeof candidate.score !== 'number') return null
  const changedMetrics = Array.isArray(candidate.changedMetrics)
    ? candidate.changedMetrics
        .map((item) => {
          if (!item || typeof item !== 'object') return null
          const metric = item as Record<string, unknown>
          if (
            typeof metric.key !== 'string' ||
            typeof metric.before !== 'number' ||
            typeof metric.now !== 'number' ||
            typeof metric.deltaPct !== 'number'
          ) {
            return null
          }
          return {
            key: metric.key,
            before: metric.before,
            now: metric.now,
            deltaPct: metric.deltaPct,
          }
        })
        .filter((item): item is ContextDriftHint['changedMetrics'][number] => Boolean(item))
    : []
  return {
    isStale: candidate.isStale,
    score: Math.round(candidate.score),
    generatedAt: typeof candidate.generatedAt === 'string' ? candidate.generatedAt : null,
    checkedAt: typeof candidate.checkedAt === 'string' ? candidate.checkedAt : new Date().toISOString(),
    changedMetrics,
  }
}

function normalizeExecutionScore(value: unknown): ExecutionScoreHint | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Record<string, unknown>
  const breakdown =
    candidate.breakdown && typeof candidate.breakdown === 'object' && !Array.isArray(candidate.breakdown)
      ? (candidate.breakdown as Record<string, unknown>)
      : null
  if (typeof candidate.value !== 'number' || !breakdown) return null
  return {
    value: Math.round(candidate.value),
    breakdown: {
      createdCoverage: typeof breakdown.createdCoverage === 'number' ? Math.round(breakdown.createdCoverage) : 0,
      feedbackCoverage: typeof breakdown.feedbackCoverage === 'number' ? Math.round(breakdown.feedbackCoverage) : 0,
      workedShare: typeof breakdown.workedShare === 'number' ? Math.round(breakdown.workedShare) : 0,
      attemptsPenalty: typeof breakdown.attemptsPenalty === 'number' ? Math.round(breakdown.attemptsPenalty) : 0,
      driftPenalty: typeof breakdown.driftPenalty === 'number' ? Math.round(breakdown.driftPenalty) : 0,
    },
  }
}

function normalizeAdaptiveMode(value: unknown): AdaptiveModeHint | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Record<string, unknown>
  if (
    candidate.targetMode !== 'minimum' &&
    candidate.targetMode !== 'base' &&
    candidate.targetMode !== 'maximum'
  ) {
    return null
  }
  if (typeof candidate.reason !== 'string' || !candidate.reason.trim()) return null
  return {
    targetMode: candidate.targetMode,
    reason: candidate.reason.trim(),
  }
}

function normalizeLeakPolicy(value: unknown): LeakPolicyHint | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Record<string, unknown>
  const selectedMode =
    candidate.selectedMode === 'minimum' ||
    candidate.selectedMode === 'base' ||
    candidate.selectedMode === 'maximum'
      ? candidate.selectedMode
      : null
  return {
    policyVersion: typeof candidate.policyVersion === 'number' ? candidate.policyVersion : undefined,
    computedAt: typeof candidate.computedAt === 'string' ? candidate.computedAt : undefined,
    selectedMode,
    nextBestAction: normalizeNextBestAction(candidate.nextBestAction),
    contextDrift: normalizeContextDrift(candidate.contextDrift),
    executionScore: normalizeExecutionScore(candidate.executionScore),
    adaptiveModeSuggestion: normalizeAdaptiveMode(candidate.adaptiveModeSuggestion),
    runJournal: Array.isArray(candidate.runJournal)
      ? candidate.runJournal
          .map((item) => {
            if (!item || typeof item !== 'object') return null
            const event = item as Record<string, unknown>
            if (typeof event.type !== 'string' || typeof event.at !== 'string') return null
            return {
              type: event.type,
              at: event.at,
              actionId: typeof event.actionId === 'string' ? event.actionId : null,
              note: typeof event.note === 'string' ? event.note : null,
              policyCorrelationId:
                typeof event.policyCorrelationId === 'string' ? event.policyCorrelationId : null,
              policyActionType:
                typeof event.policyActionType === 'string' ? event.policyActionType : null,
              actionTitle: typeof event.actionTitle === 'string' ? event.actionTitle : null,
              result: typeof event.result === 'string' ? event.result : null,
              factors: Array.isArray(event.factors)
                ? event.factors
                    .map((factor) => {
                      if (!factor || typeof factor !== 'object') return null
                      const item = factor as Record<string, unknown>
                      if (typeof item.key !== 'string' || typeof item.weight !== 'number') return null
                      return {
                        key: item.key,
                        weight: item.weight,
                        detail: typeof item.detail === 'string' ? item.detail : undefined,
                      }
                    })
                    .filter((factor): factor is { key: string; weight: number; detail?: string } => Boolean(factor))
                : [],
            }
          })
          .filter((item): item is NonNullable<LeakPolicyHint['runJournal']>[number] => Boolean(item))
      : undefined,
    summary:
      candidate.summary && typeof candidate.summary === 'object' && !Array.isArray(candidate.summary)
        ? (() => {
            const summary = candidate.summary as Record<string, unknown>
            const rejectReasons =
              summary.rejectReasons && typeof summary.rejectReasons === 'object' && !Array.isArray(summary.rejectReasons)
                ? Object.fromEntries(
                    Object.entries(summary.rejectReasons as Record<string, unknown>).filter(
                      (entry): entry is [string, number] => typeof entry[0] === 'string' && typeof entry[1] === 'number',
                    ),
                  )
                : {}
            return {
              accepted: typeof summary.accepted === 'number' ? summary.accepted : 0,
              rejected: typeof summary.rejected === 'number' ? summary.rejected : 0,
              outcomes: typeof summary.outcomes === 'number' ? summary.outcomes : 0,
              outcomeWorked: typeof summary.outcomeWorked === 'number' ? summary.outcomeWorked : 0,
              outcomePartial: typeof summary.outcomePartial === 'number' ? summary.outcomePartial : 0,
              outcomeFailed: typeof summary.outcomeFailed === 'number' ? summary.outcomeFailed : 0,
              rejectReasons,
            }
          })()
        : undefined,
  }
}

export function LeaksScreen() {
  const { user, setScreen } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [leaks, setLeaks] = useState<LeakEntity[]>([])
  const [signals, setSignals] = useState<LeakHint[]>([])
  const [patterns, setPatterns] = useState<LeakPattern[]>([])
  const [activeTab, setActiveTab] = useState('inbox')
  const [statusFilter, setStatusFilter] = useState<LeakStatusFilter>('all')
  const [sourceFilter, setSourceFilter] = useState<LeakSourceFilter>('all')
  const [sortOption, setSortOption] = useState<LeakSortOption>('updated_desc')
  const [focusFilter, setFocusFilter] = useState<LeakFocusFilter>('all')
  const [groupBy, setGroupBy] = useState<LeakGroupOption>('none')
  const [patternFilter, setPatternFilter] = useState<PatternFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')
  const [severity, setSeverity] = useState<'info' | 'warning' | 'critical'>('warning')
  const [sphere, setSphere] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [selectedDraft, setSelectedDraft] = useState<LeakDraft | null>(null)
  const [updatingLeakId, setUpdatingLeakId] = useState<string | null>(null)
  const [editingLeakId, setEditingLeakId] = useState<string | null>(null)
  const [editingLeakTitle, setEditingLeakTitle] = useState('')
  const [editingLeakDescription, setEditingLeakDescription] = useState('')
  const [actionLeakId, setActionLeakId] = useState<string | null>(null)
  const [savingSignalKey, setSavingSignalKey] = useState<string | null>(null)
  const [expandedLeakId, setExpandedLeakId] = useState<string | null>(null)
  const [plansByLeak, setPlansByLeak] = useState<Record<string, LeakSolutionPlan[]>>({})
  const [loadingPlansLeakId, setLoadingPlansLeakId] = useState<string | null>(null)
  const [generatingPlansLeakId, setGeneratingPlansLeakId] = useState<string | null>(null)
  const [selectingPlanLeakId, setSelectingPlanLeakId] = useState<string | null>(null)
  const [applyingPlanLeakId, setApplyingPlanLeakId] = useState<string | null>(null)
  const [applyingPlanActionId, setApplyingPlanActionId] = useState<string | null>(null)
  const [savingFeedbackActionId, setSavingFeedbackActionId] = useState<string | null>(null)
  const [savingFeedbackLeakId, setSavingFeedbackLeakId] = useState<string | null>(null)
  const [feedbackCommentByAction, setFeedbackCommentByAction] = useState<Record<string, string>>({})
  const [savingPatternLeakType, setSavingPatternLeakType] = useState<string | null>(null)
  const [retryingLeakId, setRetryingLeakId] = useState<string | null>(null)
  const [focusedPlanActionId, setFocusedPlanActionId] = useState<string | null>(null)
  const [policyByLeak, setPolicyByLeak] = useState<Record<string, LeakPolicyHint | null>>({})
  const [feedbackHistoryFilterByLeak, setFeedbackHistoryFilterByLeak] = useState<
    Record<string, FeedbackHistoryFilter>
  >({})

  useEffect(() => {
    if (!focusedPlanActionId) return

    const timer = window.setTimeout(() => {
      setFocusedPlanActionId(null)
    }, 3200)

    return () => window.clearTimeout(timer)
  }, [focusedPlanActionId])

  useEffect(() => {
    if (!expandedLeakId) return
    const leakPlans = plansByLeak[expandedLeakId] || []
    const expandedLeak = leaks.find((item) => item.id === expandedLeakId)
    if (!expandedLeak) return
    const guidance = buildLeakGuidance(expandedLeak, leakPlans)

    const currentFilter = feedbackHistoryFilterByLeak[expandedLeakId] || 'all'
    if (guidance?.failedActions && guidance.failedActions > 0 && currentFilter !== 'problem') {
      setFeedbackHistoryFilterByLeak((current) => ({
        ...current,
        [expandedLeakId]: 'problem',
      }))
      return
    }

    if ((!guidance?.failedActions || guidance.failedActions === 0) && currentFilter === 'problem') {
      setFeedbackHistoryFilterByLeak((current) => ({
        ...current,
        [expandedLeakId]: 'all',
      }))
    }
  }, [expandedLeakId, plansByLeak, leaks, feedbackHistoryFilterByLeak])

  const hasDraft = title.trim().length > 0 || details.trim().length > 0

  const loadData = async (showSkeleton = false) => {
    if (!user?.id) return

    if (showSkeleton) setLoading(true)
    else setRefreshing(true)

    try {
      const weekStart = getCurrentMonday()
      const [leaksRes, signalsRes, patternsRes] = await Promise.all([
        fetch(`/api/leaks?userId=${user.id}&status=all&limit=100`),
        fetch(`/api/weekly-report?userId=${user.id}&weekStart=${weekStart}`),
        fetch(`/api/ai/patterns?userId=${user.id}`),
      ])

      const leaksData = await leaksRes.json()
      const signalsData = await signalsRes.json()
      const patternsData = await patternsRes.json()

      setLeaks(Array.isArray(leaksData.leaks) ? leaksData.leaks.map(normalizeLeak) : [])
      setPolicyByLeak({})
      setSignals(Array.isArray(signalsData.leakHints) ? signalsData.leakHints : [])
      setPatterns(
        Array.isArray(patternsData.patterns)
          ? patternsData.patterns
              .map(normalizePattern)
              .filter((item): item is LeakPattern => Boolean(item))
          : [],
      )
    } catch (error) {
      showErrorToast(error, 'load leaks module')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData(true)
  }, [user?.id])

  const filteredLeaks = useMemo(() => {
    const filtered = leaks.filter((leak) => {
      if (statusFilter !== 'all' && leak.status !== statusFilter) return false
      if (sourceFilter !== 'all' && leak.source !== sourceFilter) return false
      if (focusFilter === 'focus' && !isFocusLeak(leak)) return false

      if (!searchQuery.trim()) return true

      const normalizedQuery = searchQuery.trim().toLowerCase()
      return (
        normalizeLookupValue(leak.title).includes(normalizedQuery) ||
        normalizeLookupValue(leak.description).includes(normalizedQuery) ||
        normalizeLookupValue(leak.sphere).includes(normalizedQuery) ||
        normalizeLookupValue(getSphereLabel(leak.sphere)).includes(normalizedQuery)
      )
    })

    const severityRank: Record<LeakEntity['severity'], number> = {
      critical: 3,
      warning: 2,
      info: 1,
    }

    return filtered.sort((a, b) => {
      if (sortOption === 'created_desc') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }

      if (sortOption === 'severity_desc') {
        const byFocus = Number(isFocusLeak(b)) - Number(isFocusLeak(a))
        if (byFocus !== 0) return byFocus
        const bySeverity = severityRank[b.severity] - severityRank[a.severity]
        if (bySeverity !== 0) return bySeverity
      }

      const byFocus = Number(isFocusLeak(b)) - Number(isFocusLeak(a))
      if (byFocus !== 0) return byFocus

      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
  }, [leaks, searchQuery, sourceFilter, statusFilter, sortOption, focusFilter])

  const leakCounts = useMemo(() => {
    return leaks.reduce(
      (acc, leak) => {
        acc.all += 1
        acc[leak.status] += 1
        return acc
      },
      {
        all: 0,
        new: 0,
        in_progress: 0,
        resolved: 0,
        archived: 0,
      } as Record<LeakStatusFilter, number>,
    )
  }, [leaks])

  const focusLeakCount = useMemo(() => leaks.filter((leak) => isFocusLeak(leak)).length, [leaks])
  const groupCounts = useMemo(() => {
    if (groupBy === 'none') return {}

    return filteredLeaks.reduce<Record<string, number>>((acc, leak) => {
      const key = getLeakGroupKey(leak, groupBy)
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
  }, [filteredLeaks, groupBy])

  const visiblePatterns = useMemo(() => {
    const sorted = [...patterns].sort((a, b) => {
      const activeA = typeof a.activeLeakCount === 'number' ? a.activeLeakCount : 0
      const activeB = typeof b.activeLeakCount === 'number' ? b.activeLeakCount : 0
      if (activeB !== activeA) return activeB - activeA
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })

    if (patternFilter === 'linked') {
      return sorted.filter((pattern) => (pattern.activeLeakCount || 0) > 0)
    }

    return sorted
  }, [patterns, patternFilter])

  const priorityLeaks = useMemo(() => {
    const severityRank: Record<LeakEntity['severity'], number> = {
      critical: 3,
      warning: 2,
      info: 1,
    }

    const scoreLeak = (leak: LeakEntity) => {
      let score = severityRank[leak.severity] * 10
      if (leak.status === 'new') score += 7
      if (leak.status === 'in_progress') score += 5
      if (isFocusLeak(leak)) score += 4
      if (leak.actions.length === 0) score += 2
      return score
    }

    return leaks
      .filter((leak) => leak.status === 'new' || leak.status === 'in_progress')
      .sort((a, b) => {
        const byScore = scoreLeak(b) - scoreLeak(a)
        if (byScore !== 0) return byScore
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      })
      .slice(0, 3)
  }, [leaks])

  const createLeak = async (prepareAnalysis: boolean) => {
    if (!user?.id || !hasDraft) return

    const nextTitle = title.trim() || details.trim().slice(0, 80) || 'Новый лик'
    const nextDescription = details.trim() || null
    const duplicateLeak = findOpenLeak(nextTitle, nextDescription)
    if (duplicateLeak) {
      setActiveTab('inbox')
      setStatusFilter('all')
      setExpandedLeakId(duplicateLeak.id)
      showSuccessToast('Похожий активный leak уже есть в inbox, открыл его для продолжения')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/leaks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          title: nextTitle,
          description: nextDescription,
          severity,
          source: 'manual',
          sphere,
        }),
      })

      if (!response.ok) {
        throw response
      }

      const data = await response.json()
      const createdLeak = normalizeLeak(data.leak as LeakEntity)
      if (data.deduped) {
        setActiveTab('inbox')
        setStatusFilter('all')
        setExpandedLeakId(createdLeak.id)
        showSuccessToast('Похожий активный leak уже есть, открыл его вместо дубля')
        return
      }

      setLeaks((current) => [createdLeak, ...current])
      setExpandedLeakId(createdLeak.id)
      setTitle('')
      setDetails('')
      setSeverity('warning')
      setSphere(null)
      setActiveTab('inbox')
      setStatusFilter('all')

      if (prepareAnalysis) {
        setSelectedDraft({
          leakType: createdLeak.title,
          leakMessage: buildLeakMessage(createdLeak),
          severity: createdLeak.severity,
        })
      }

      showSuccessToast(prepareAnalysis ? 'Лик сохранён и готов к разбору' : 'Лик сохранён')
    } catch (error) {
      showErrorToast(error, 'create leak')
    } finally {
      setSubmitting(false)
    }
  }

  const updateLeakStatus = async (
    leakId: string,
    status: Exclude<LeakStatusFilter, 'all'>,
    options?: { silent?: boolean },
  ) => {
    if (!user?.id || updatingLeakId) return

    setUpdatingLeakId(leakId)
    try {
      const response = await fetch('/api/leaks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          id: leakId,
          status,
        }),
      })

      if (!response.ok) {
        throw response
      }

      const data = await response.json()
      const updatedLeak = normalizeLeak(data.leak as LeakEntity)

      setLeaks((current) =>
        current.map((leak) => (leak.id === leakId ? updatedLeak : leak)),
      )
      if (!options?.silent) {
        showSuccessToast('Статус лика обновлён')
      }
      return true
    } catch (error) {
      showErrorToast(error, 'update leak status')
      return false
    } finally {
      setUpdatingLeakId(null)
    }
  }

  const updateLeakSphere = async (leakId: string, nextSphere: string | null) => {
    if (!user?.id || updatingLeakId) return

    setUpdatingLeakId(leakId)
    try {
      const response = await fetch('/api/leaks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          id: leakId,
          sphere: nextSphere,
        }),
      })

      if (!response.ok) throw response

      const data = await response.json()
      const updatedLeak = normalizeLeak(data.leak as LeakEntity)

      setLeaks((current) =>
        current.map((leak) => (leak.id === leakId ? updatedLeak : leak)),
      )
      showSuccessToast('Сфера лика обновлена')
    } catch (error) {
      showErrorToast(error, 'update leak sphere')
    } finally {
      setUpdatingLeakId(null)
    }
  }

  const toggleLeakFocus = async (leak: LeakEntity) => {
    if (!user?.id || updatingLeakId) return

    const currentSnapshot =
      leak.contextSnapshot && typeof leak.contextSnapshot === 'object' && !Array.isArray(leak.contextSnapshot)
        ? (leak.contextSnapshot as Record<string, unknown>)
        : {}
    const nextFocusValue = !isFocusLeak(leak)

    setUpdatingLeakId(leak.id)
    try {
      const response = await fetch('/api/leaks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          id: leak.id,
          contextSnapshot: {
            ...currentSnapshot,
            isFocus: nextFocusValue,
            focusUpdatedAt: new Date().toISOString(),
          },
        }),
      })

      if (!response.ok) throw response

      const data = await response.json()
      const updatedLeak = normalizeLeak(data.leak as LeakEntity)
      setLeaks((current) => current.map((item) => (item.id === leak.id ? updatedLeak : item)))
      showSuccessToast(nextFocusValue ? 'Leak добавлен в фокус' : 'Leak убран из фокуса')
    } catch (error) {
      showErrorToast(error, 'toggle leak focus')
    } finally {
      setUpdatingLeakId(null)
    }
  }

  const startEditingLeak = (leak: LeakEntity) => {
    setEditingLeakId(leak.id)
    setEditingLeakTitle(leak.title)
    setEditingLeakDescription(leak.description || '')
    setExpandedLeakId(leak.id)
  }

  const cancelEditingLeak = () => {
    setEditingLeakId(null)
    setEditingLeakTitle('')
    setEditingLeakDescription('')
  }

  const saveLeakEdits = async (leakId: string) => {
    if (!user?.id || updatingLeakId || !editingLeakTitle.trim()) return

    setUpdatingLeakId(leakId)
    try {
      const response = await fetch('/api/leaks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          id: leakId,
          title: editingLeakTitle.trim(),
          description: editingLeakDescription.trim() || null,
        }),
      })

      if (!response.ok) throw response

      const data = await response.json()
      const updatedLeak = normalizeLeak(data.leak as LeakEntity)

      setLeaks((current) =>
        current.map((leak) => (leak.id === leakId ? updatedLeak : leak)),
      )
      cancelEditingLeak()
      showSuccessToast('Лик обновлён')
    } catch (error) {
      showErrorToast(error, 'save leak edits')
    } finally {
      setUpdatingLeakId(null)
    }
  }

  const saveLeakAction = async (
    leak: LeakEntity,
    action: {
      entityType: LeakActionLink['entityType']
      entityId: string
      label: string
      metadata?: Record<string, unknown> | null
    },
  ) => {
    if (!user?.id) return

    const response = await fetch('/api/leaks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        id: leak.id,
        status: leak.status === 'new' ? 'in_progress' : undefined,
        appendAction: action,
      }),
    })

    if (!response.ok) {
      throw response
    }

    const data = await response.json()
    const updatedLeak = normalizeLeak(data.leak as LeakEntity)
    setLeaks((current) => current.map((item) => (item.id === leak.id ? updatedLeak : item)))
    setExpandedLeakId(leak.id)
  }

  const hasActionType = (leak: LeakEntity, entityType: LeakActionLink['entityType']) =>
    leak.actions?.some((action) => action.entityType === entityType)

  const findOpenLeak = (title: string, description?: string | null) =>
    leaks.find((leak) => {
      if (leak.status === 'resolved' || leak.status === 'archived') return false

      const sameTitle = normalizeLookupValue(leak.title) === normalizeLookupValue(title)
      if (!sameTitle) return false

      if (!description) return true
      return normalizeLookupValue(leak.description) === normalizeLookupValue(description)
    })

  const loadPlansForLeak = async (leakId: string) => {
    if (!user?.id) return

    setLoadingPlansLeakId(leakId)
    try {
      const response = await fetch(`/api/leaks/${leakId}/plans?userId=${user.id}`, {
        cache: 'no-store',
      })

      if (!response.ok) throw response

      const data = await response.json()
      setPlansByLeak((current) => ({
        ...current,
        [leakId]: normalizePlans(data.plans || []),
      }))
      if (data.policy) {
        setPolicyByLeak((current) => ({
          ...current,
          [leakId]: normalizeLeakPolicy(data.policy),
        }))
      }
    } catch (error) {
      showErrorToast(error, 'load leak plans')
    } finally {
      setLoadingPlansLeakId(null)
    }
  }

  const generatePlansForLeak = async (
    leakId: string,
    regenerate = false,
    options?: {
      silent?: boolean
      retryFocus?: {
        actionId?: string | null
        actionTitle: string
        actionKind?: LeakPlanAction['kind'] | null
        failureReason?: string | null
      } | null
    },
  ) => {
    if (!user?.id) return

    setGeneratingPlansLeakId(leakId)
    try {
      const response = await fetch(`/api/leaks/${leakId}/plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          regenerate,
          retryActionId: options?.retryFocus?.actionId || undefined,
          retryActionTitle: options?.retryFocus?.actionTitle || undefined,
          retryActionKind: options?.retryFocus?.actionKind || undefined,
          retryFailureReason: options?.retryFocus?.failureReason || undefined,
        }),
      })

      if (!response.ok) throw response

      const data = await response.json()
      setPlansByLeak((current) => ({
        ...current,
        [leakId]: normalizePlans(data.plans || []),
      }))
      if (data.policy) {
        setPolicyByLeak((current) => ({
          ...current,
          [leakId]: normalizeLeakPolicy(data.policy),
        }))
      }
      if (!options?.silent) {
        showSuccessToast(regenerate ? 'Планы пересобраны' : 'Планы для лика готовы')
      }
      return true
    } catch (error) {
      showErrorToast(error, 'generate leak plans')
      return false
    } finally {
      setGeneratingPlansLeakId(null)
    }
  }

  const selectPlanMode = async (leakId: string, mode: LeakSolutionPlan['mode']) => {
    if (!user?.id) return

    setSelectingPlanLeakId(leakId)
    try {
      const response = await fetch(`/api/leaks/${leakId}/plans`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          mode,
        }),
      })

      if (!response.ok) throw response

      const data = await response.json()
      setPlansByLeak((current) => ({
        ...current,
        [leakId]: normalizePlans(data.plans || []),
      }))
      if (data.policy) {
        setPolicyByLeak((current) => ({
          ...current,
          [leakId]: normalizeLeakPolicy(data.policy),
        }))
      }
      setLeaks((current) =>
        current.map((leak) => {
          if (leak.id !== leakId) return leak
          const snapshot =
            leak.contextSnapshot && typeof leak.contextSnapshot === 'object' && !Array.isArray(leak.contextSnapshot)
              ? ({ ...leak.contextSnapshot } as Record<string, unknown>)
              : {}
          snapshot.selectedPlanMode = mode
          snapshot.contextUpdatedAt = new Date().toISOString()
          return {
            ...leak,
            contextSnapshot: snapshot,
          }
        }),
      )
      showSuccessToast(`Выбран режим: ${PLAN_MODE_LABELS[mode]}`)
    } catch (error) {
      showErrorToast(error, 'select leak plan')
    } finally {
      setSelectingPlanLeakId(null)
    }
  }

  const toggleLeakDetails = async (leakId: string) => {
    const willOpen = expandedLeakId !== leakId
    setExpandedLeakId(willOpen ? leakId : null)

    if (willOpen && !plansByLeak[leakId] && loadingPlansLeakId !== leakId) {
      await loadPlansForLeak(leakId)
      await loadPolicyForLeak(leakId)
    }
  }

  const loadPolicyForLeak = async (leakId: string) => {
    if (!user?.id) return
    try {
      const response = await fetch(`/api/leaks/${leakId}/policy?userId=${user.id}`, {
        cache: 'no-store',
      })
      if (!response.ok) throw response
      const data = await response.json()
      setPolicyByLeak((current) => ({
        ...current,
        [leakId]: normalizeLeakPolicy({
          ...(data.policy || {}),
          summary: data.summary || undefined,
          runJournal: data.runJournal || undefined,
        }),
      }))
    } catch (error) {
      showErrorToast(error, 'load leak policy')
    }
  }

  const executePolicyAction = async (
    leak: LeakEntity,
    payload: {
      actionType: 'switch_mode' | 'retry' | 'regenerate_context' | 'focus_action'
      decision?: 'accepted' | 'rejected'
      reason?: string | null
      correlationId?: string | null
      targetMode?: LeakSolutionPlan['mode']
      actionId?: string | null
      actionTitle?: string | null
      actionKind?: string | null
      factors?: Array<{ key: string; weight: number; detail?: string }>
    },
  ) => {
    if (!user?.id) return false
    try {
      const response = await fetch(`/api/leaks/${leak.id}/policy/act`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          actionType: payload.actionType,
          decision: payload.decision || 'accepted',
          reason: payload.reason || null,
          correlationId: payload.correlationId || undefined,
          targetMode: payload.targetMode || undefined,
          actionId: payload.actionId || undefined,
          actionTitle: payload.actionTitle || undefined,
          actionKind: payload.actionKind || undefined,
          factors: payload.factors || undefined,
        }),
      })
      if (!response.ok) throw response
      const data = await response.json()
      if (data.requiresRegenerate) {
        await generatePlansForLeak(leak.id, true, { silent: true })
      }
      await loadPlansForLeak(leak.id)
      await loadPolicyForLeak(leak.id)
      return true
    } catch (error) {
      showErrorToast(error, 'execute leak policy action')
      return false
    }
  }

  const syncLeakTitleWithPattern = async (leak: LeakEntity, pattern: LeakPattern) => {
    if (!user?.id || updatingLeakId) return
    const nextTitle = pattern.leakType.trim()
    if (!nextTitle || normalizeLookupValue(nextTitle) === normalizeLookupValue(leak.title)) return

    setUpdatingLeakId(leak.id)
    try {
      const response = await fetch('/api/leaks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          id: leak.id,
          title: nextTitle,
          description: leak.description || null,
        }),
      })

      if (!response.ok) throw response

      const data = await response.json()
      const updatedLeak = normalizeLeak(data.leak as LeakEntity)
      setLeaks((current) => current.map((item) => (item.id === leak.id ? updatedLeak : item)))
      showSuccessToast('Название leak синхронизировано с паттерном')
    } catch (error) {
      showErrorToast(error, 'sync leak title with pattern')
    } finally {
      setUpdatingLeakId(null)
    }
  }

  const focusPlanAction = (leakId: string, actionId: string) => {
    setExpandedLeakId(leakId)
    setFocusedPlanActionId(actionId)

    setTimeout(() => {
      const node = document.getElementById(getPlanActionAnchorId(leakId, actionId))
      if (node) {
        node.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 0)
  }

  const isPlanActionConverted = (action: LeakPlanAction) => isConvertedPlanAction(action)

  const getActionFeedback = (action: LeakPlanAction) => getLatestPlanFeedback(action)

  const getFeedbackCommentDraft = (action: LeakPlanAction) => {
    if (feedbackCommentByAction[action.id] !== undefined) {
      return feedbackCommentByAction[action.id]
    }

    return action.feedbacks?.[0]?.comment || ''
  }

  const getFeedbackCommentDraftByActionId = (actionId: string) => {
    if (feedbackCommentByAction[actionId] !== undefined) {
      return feedbackCommentByAction[actionId]
    }

    return ''
  }

  const clearLeakFilters = () => {
    setStatusFilter('all')
    setSourceFilter('all')
    setSortOption('updated_desc')
    setFocusFilter('all')
    setGroupBy('none')
    setSearchQuery('')
  }

  const reopenLeak = async (leak: LeakEntity, options?: { silent?: boolean }) => {
    return updateLeakStatus(leak.id, 'in_progress', options)
  }

  const retryLeakPlanning = async (
    leak: LeakEntity,
    options?: {
      action?: LeakPlanAction | null
      failureReason?: string | null
    },
  ) => {
    if (!user?.id || retryingLeakId) return

    setRetryingLeakId(leak.id)
    try {
      if (leak.status === 'resolved' || leak.status === 'archived') {
        const reopened = await reopenLeak(leak, { silent: true })
        if (!reopened) return
      }

      const hadPlans = Boolean(plansByLeak[leak.id]?.length)
      const generated = await generatePlansForLeak(leak.id, hadPlans, {
        silent: true,
        retryFocus: options?.action
          ? {
              actionId: options.action.id,
              actionTitle: options.action.title,
              actionKind: options.action.kind,
              failureReason: options.failureReason || null,
            }
          : null,
      })
      if (!generated) return

      setExpandedLeakId(leak.id)
      showSuccessToast(
        options?.action
          ? `Пересобрал режимы с фокусом на шаг «${options.action.title}»`
          : hadPlans
            ? 'Лик возвращён в работу, режимы обновлены'
            : 'Для лика собраны первые режимы',
      )
    } finally {
      setRetryingLeakId(null)
    }
  }

  const runGuidanceAction = async (leak: LeakEntity, action: LeakGuidanceAction) => {
    if (!action) return

    if (action === 'generate') {
      await generatePlansForLeak(leak.id, false)
      return
    }

    if (action === 'retry') {
      await retryLeakPlanning(leak)
      return
    }

    if (action === 'resolve') {
      await updateLeakStatus(leak.id, 'resolved')
      return
    }

    if (action === 'reopen') {
      await reopenLeak(leak)
    }
  }

  const applySelectedPlan = async (leak: LeakEntity, mode?: LeakSolutionPlan['mode']) => {
    if (!user?.id) return
    const policyCorrelationId = policyByLeak[leak.id]?.nextBestAction?.correlationId || null

    setApplyingPlanLeakId(leak.id)
    try {
      const response = await fetch(`/api/leaks/${leak.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          mode,
          policyCorrelationId: policyCorrelationId || undefined,
        }),
      })

      if (!response.ok) throw response

      const data = await response.json()
      if (data.leak) {
        setLeaks((current) =>
          current.map((item) => (item.id === leak.id ? normalizeLeak(data.leak as LeakEntity) : item)),
        )
      }
      setPlansByLeak((current) => ({
        ...current,
        [leak.id]: normalizePlans(data.plans || []),
      }))

      const createdCount = typeof data.createdCount === 'number' ? data.createdCount : 0
      const skippedCount = typeof data.skippedActions === 'number' ? data.skippedActions : 0
      const reusedCount = typeof data.reusedActions === 'number' ? data.reusedActions : 0
      if (createdCount > 0) {
        showSuccessToast(
          skippedCount > 0 || reusedCount > 0
            ? `Применил режим: создано ${createdCount}, повторно привязано ${reusedCount}, пропущено ${skippedCount}`
            : `Применил режим: создано ${createdCount}`,
        )
      } else {
        showSuccessToast(
          reusedCount > 0
            ? `Новых сущностей нет, повторно связал ${reusedCount} шагов с уже созданным`
            : 'Новых сущностей не создано, всё уже было применено',
        )
      }
      void loadPlansForLeak(leak.id)
    } catch (error) {
      showErrorToast(error, 'apply leak plan')
    } finally {
      setApplyingPlanLeakId(null)
    }
  }

  const applySinglePlanAction = async (
    leak: LeakEntity,
    mode: LeakSolutionPlan['mode'],
    action: LeakPlanAction,
  ) => {
    if (!user?.id || isPlanActionConverted(action)) return
    const policyCorrelationId = policyByLeak[leak.id]?.nextBestAction?.correlationId || null

    setApplyingPlanActionId(action.id)
    try {
      const response = await fetch(`/api/leaks/${leak.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          mode,
          actionId: action.id,
          policyCorrelationId: policyCorrelationId || undefined,
        }),
      })

      if (!response.ok) throw response

      const data = await response.json()
      if (data.leak) {
        setLeaks((current) =>
          current.map((item) => (item.id === leak.id ? normalizeLeak(data.leak as LeakEntity) : item)),
        )
      }
      setPlansByLeak((current) => ({
        ...current,
        [leak.id]: normalizePlans(data.plans || []),
      }))

      const createdEntity = Array.isArray(data.createdEntities) ? data.createdEntities[0] : null
      showSuccessToast(
        createdEntity?.label
          ? `Создано: ${createdEntity.label}`
          : 'Действие из плана применено',
      )
      void loadPlansForLeak(leak.id)
    } catch (error) {
      showErrorToast(error, 'apply single leak action')
    } finally {
      setApplyingPlanActionId(null)
    }
  }

  const sendPlanActionFeedback = async (
    leakId: string,
    actionId: string,
    result: LeakPlanFeedback['result'],
    comment?: string,
    options?: {
      additionalActionIds?: string[]
      silent?: boolean
    },
  ) => {
    if (!user?.id) return
    const normalizedComment = comment?.trim() || ''
    const policyCorrelationId = policyByLeak[leakId]?.nextBestAction?.correlationId || null
    const actionIds = Array.from(
      new Set([actionId, ...(options?.additionalActionIds || [])].map((item) => item.trim()).filter(Boolean)),
    )

    if (result === 'not_worked' && normalizedComment.length < 5) {
      showErrorToast(
        new Error('Добавь короткий комментарий (минимум 5 символов), чтобы система поняла, почему не помогло'),
        'save plan feedback',
      )
      return
    }

    setSavingFeedbackActionId(actionId)
    if (actionIds.length > 1) {
      const leakKey = leaks.find((item) => item.id === leakId)?.id || leakId
      setSavingFeedbackLeakId(leakKey)
    }
    try {
      const response = await fetch(`/api/leaks/${leakId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          solutionActionId: actionId,
          solutionActionIds: actionIds.length > 1 ? actionIds : undefined,
          policyCorrelationId: policyCorrelationId || undefined,
          result,
          comment: normalizedComment || null,
        }),
      })

      if (!response.ok) throw response

      const data = await response.json()
      const nextPattern =
        data.pattern && typeof data.pattern === 'object'
          ? normalizePattern(data.pattern)
          : null
      const nextPlans = normalizePlans(data.plans || [])
      setPlansByLeak((current) => ({
        ...current,
        [leakId]: nextPlans,
      }))
      const affectedActionIds = Array.isArray(data.affectedActionIds)
        ? data.affectedActionIds.filter((item): item is string => typeof item === 'string')
        : actionIds
      const modeByActionId = new Map<string, LeakSolutionPlan['mode']>()
      nextPlans.forEach((plan) => {
        plan.actions.forEach((action) => {
          modeByActionId.set(action.id, plan.mode)
        })
      })
      const firstAffectedMode = affectedActionIds.map((id) => modeByActionId.get(id)).find(Boolean) || null
      const nextStatus = data.leak && typeof data.leak.status === 'string' ? data.leak.status : null
      const nextResolvedAt =
        data.leak && typeof data.leak.resolvedAt === 'string' ? data.leak.resolvedAt : null
      setLeaks((current) =>
        current.map((leak) => {
          if (leak.id !== leakId) return leak
          const snapshot =
            leak.contextSnapshot && typeof leak.contextSnapshot === 'object' && !Array.isArray(leak.contextSnapshot)
              ? ({ ...leak.contextSnapshot } as Record<string, unknown>)
              : {}
          if (result === 'worked' && firstAffectedMode) {
            snapshot.lastStableMode = firstAffectedMode
            snapshot.lastStableAt = new Date().toISOString()
          }
          snapshot.contextUpdatedAt = new Date().toISOString()
          return {
            ...leak,
            status: nextStatus ? (nextStatus as LeakEntity['status']) : leak.status,
            resolvedAt: nextStatus ? nextResolvedAt : leak.resolvedAt,
            updatedAt: new Date().toISOString(),
            contextSnapshot: snapshot,
          }
        }),
      )
      if (nextPattern) {
        setPatterns((current) => {
          const filtered = current.filter((pattern) => pattern.leakType !== nextPattern.leakType)
          return [nextPattern, ...filtered]
        })
      }
      if (!options?.silent) {
        if (data.reopened) {
          showSuccessToast('Фидбек сохранён, leak автоматически возвращён в работу')
        } else if (affectedActionIds.length > 1) {
          showSuccessToast(`Фидбек применён к ${affectedActionIds.length} шагам`)
        } else {
          showSuccessToast('Фидбек по действию сохранён')
        }
      }
      setFeedbackCommentByAction((current) => {
        const next = { ...current }
        affectedActionIds.forEach((id) => {
          next[id] = normalizedComment
        })
        return next
      })
      void loadPlansForLeak(leakId)
      void loadPolicyForLeak(leakId)
    } catch (error) {
      showErrorToast(error, 'save plan feedback')
    } finally {
      setSavingFeedbackActionId(null)
      setSavingFeedbackLeakId(null)
    }
  }

  const applyBulkFeedbackForPendingCreated = async (
    leak: LeakEntity,
    plan: LeakSolutionPlan,
    result: LeakPlanFeedback['result'],
  ) => {
    const pendingActions = plan.actions.filter(
      (action) => isPlanActionConverted(action) && !getLatestPlanFeedback(action),
    )
    if (pendingActions.length === 0) {
      showSuccessToast('По созданным шагам без feedback ничего не осталось')
      return
    }

    const primaryAction = pendingActions[0]
    const bulkComment = getFeedbackCommentDraft(primaryAction)
    await sendPlanActionFeedback(
      leak.id,
      primaryAction.id,
      result,
      bulkComment,
      {
        additionalActionIds: pendingActions.slice(1).map((item) => item.id),
      },
    )
  }

  const convertLeakToTask = async (leak: LeakEntity) => {
    if (!user?.id || actionLeakId) return

    setActionLeakId(leak.id)
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          text: leak.title,
          zone: 'LeakFixer',
          notes: buildLeakMessage(leak),
        }),
      })

      if (!response.ok) throw response
      const data = await response.json()
      await saveLeakAction(leak, {
        entityType: 'task',
        entityId: data.task.id,
        label: data.task.text,
        metadata: { zone: data.task.zone || null },
      })
      showSuccessToast('Задача создана из лика')
      setScreen('tasks')
    } catch (error) {
      showErrorToast(error, 'create task from leak')
    } finally {
      setActionLeakId(null)
    }
  }

  const convertLeakToRitual = async (leak: LeakEntity) => {
    if (!user?.id || actionLeakId) return

    setActionLeakId(leak.id)
    try {
      const response = await fetch('/api/rituals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          title: leak.title,
          category: 'mind',
          type: 'regular',
          days: [1, 2, 3, 4, 5, 6, 7],
          timeWindow: 'any',
          description: buildLeakMessage(leak),
          goalShort: 'Исправить лик',
          attributes: ['mind', 'will'],
        }),
      })

      if (!response.ok) throw response
      const data = await response.json()
      await saveLeakAction(leak, {
        entityType: 'ritual',
        entityId: data.ritual.id,
        label: data.ritual.title,
        metadata: { category: data.ritual.category || null },
      })
      showSuccessToast('Ритуал создан из лика')
      setScreen('rituals')
    } catch (error) {
      showErrorToast(error, 'create ritual from leak')
    } finally {
      setActionLeakId(null)
    }
  }

  const convertLeakToChallenge = async (leak: LeakEntity) => {
    if (!user?.id || actionLeakId) return

    setActionLeakId(leak.id)
    try {
      const response = await fetch('/api/challenges/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          leakType: leak.title,
          leakMessage: buildLeakMessage(leak),
        }),
      })

      if (!response.ok) throw response
      const data = await response.json()
      await saveLeakAction(leak, {
        entityType: 'challenge',
        entityId: data.challenge.id,
        label: data.challenge.title || data.challenge.name,
        metadata: { duration: data.challenge.duration || null },
      })
      showSuccessToast('AI-челлендж создан из лика')
      setScreen('challenges')
    } catch (error) {
      showErrorToast(error, 'create challenge from leak')
    } finally {
      setActionLeakId(null)
    }
  }

  const createLeakFromSignal = async (signal: LeakHint) => {
    if (!user?.id || savingSignalKey) return

    const existingLeak = findOpenLeak(signal.type, signal.message)
    if (existingLeak) {
      setActiveTab('inbox')
      setStatusFilter('all')
      setExpandedLeakId(existingLeak.id)
      showSuccessToast('Этот сигнал уже сохранён в inbox')
      return
    }

    const signalKey = `${signal.type}:${signal.message}`
    setSavingSignalKey(signalKey)
    try {
      const response = await fetch('/api/leaks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          title: signal.type,
          description: signal.message,
          source: 'signal',
          severity: signal.severity,
          contextSnapshot: signal.days?.length ? { days: signal.days } : null,
        }),
      })

      if (!response.ok) throw response

      const data = await response.json()
      const createdLeak = normalizeLeak(data.leak as LeakEntity)
      if (data.deduped) {
        setActiveTab('inbox')
        setStatusFilter('all')
        setExpandedLeakId(createdLeak.id)
        showSuccessToast('Такой сигнал уже есть в активном leak')
        return
      }
      setLeaks((current) => [createdLeak, ...current])
      setExpandedLeakId(createdLeak.id)
      showSuccessToast('Сигнал сохранён как leak')
      setActiveTab('inbox')
    } catch (error) {
      showErrorToast(error, 'save signal as leak')
    } finally {
      setSavingSignalKey(null)
    }
  }

  const createLeakFromPattern = async (pattern: LeakPattern) => {
    if (!user?.id || savingPatternLeakType) return

    const existingLeak = findOpenLeak(pattern.leakType)

    if (existingLeak) {
      setActiveTab('inbox')
      setStatusFilter('all')
      setExpandedLeakId(existingLeak.id)
      showSuccessToast('Для этого паттерна уже есть активный leak')
      return
    }

    setSavingPatternLeakType(pattern.leakType)
    try {
      const response = await fetch('/api/leaks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          title: pattern.leakType,
          source: 'ai_suggested',
          severity: 'warning',
          contextSnapshot: {
            analysisCount: pattern.analysisCount,
            whatWorked: pattern.whatWorked,
          },
        }),
      })

      if (!response.ok) throw response

      const data = await response.json()
      const createdLeak = normalizeLeak(data.leak as LeakEntity)
      if (data.deduped) {
        setActiveTab('inbox')
        setStatusFilter('all')
        setExpandedLeakId(createdLeak.id)
        showSuccessToast('Паттерн уже связан с активным leak')
        return
      }
      setLeaks((current) => [createdLeak, ...current])
      setActiveTab('inbox')
      setStatusFilter('all')
      setExpandedLeakId(createdLeak.id)
      showSuccessToast('Паттерн сохранён как leak')
    } catch (error) {
      showErrorToast(error, 'save pattern as leak')
    } finally {
      setSavingPatternLeakType(null)
    }
  }

  const selectedDraftLabel = useMemo(() => selectedDraft?.leakType ?? null, [selectedDraft])

  if (!user?.id) {
    return (
      <div className="pb-20">
        <Card style={{ background: 'rgba(15,23,42,0.82)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <CardContent className="pt-6">
            <p className="text-white/70 text-sm">
              Модуль ликов станет доступен после авторизации.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4 pb-20">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 pb-20">
      <Card
        style={{
          background: 'linear-gradient(135deg, rgba(30,41,59,0.95) 0%, rgba(15,23,42,0.92) 100%)',
          border: '1px solid rgba(99,102,241,0.25)',
        }}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-300" />
                Leaks
              </CardTitle>
              <CardDescription className="text-white/60 mt-1">
                Отдельный контур для захвата ликов, сигналов и AI-паттернов.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(false)}
              disabled={refreshing}
              className="border-white/15 bg-white/5 hover:bg-white/10 text-white"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-white/10 text-white/80 border-white/10">Inbox: {leakCounts.all}</Badge>
            <Badge className="bg-indigo-500/10 text-indigo-200 border-indigo-500/20">Signals: {signals.length}</Badge>
            <Badge className="bg-emerald-500/10 text-emerald-200 border-emerald-500/20">Patterns: {patterns.length}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card style={{ background: 'rgba(15,23,42,0.82)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2">
            <NotebookPen className="w-5 h-5 text-white/70" />
            Быстрый capture
          </CardTitle>
          <CardDescription className="text-white/55">
            Теперь это уже отдельная сущность leak-inbox, а не временная заметка.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Коротко назови лик или паттерн"
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />
          <Textarea
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            placeholder="Что произошло, где это проявляется, что могло повлиять, что хочешь исправить..."
            className="min-h-28 bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />

          <div className="flex flex-wrap gap-2">
            {SEVERITY_OPTIONS.map((option) => {
              const isActive = severity === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSeverity(option.id)}
                  className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                    isActive
                      ? SEVERITY_STYLES[option.id]
                      : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  <div className="text-sm font-medium">{option.label}</div>
                  <div className="text-[11px] opacity-80">{option.description}</div>
                </button>
              )
            })}
          </div>

          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-white/40">
              Сфера
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSphere(null)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  sphere === null
                    ? 'border-indigo-400/30 bg-indigo-500/10 text-indigo-200'
                    : 'border-white/10 bg-white/5 text-white/55 hover:bg-white/10'
                }`}
              >
                Без сферы
              </button>
              {SPHERE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSphere(option.id)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    sphere === option.id
                      ? 'border-indigo-400/30 bg-indigo-500/10 text-indigo-200'
                      : 'border-white/10 bg-white/5 text-white/55 hover:bg-white/10'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => createLeak(true)}
              disabled={!hasDraft || submitting}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              Сохранить и разобрать
            </Button>
            <Button
              variant="outline"
              onClick={() => createLeak(false)}
              disabled={!hasDraft || submitting}
              className="border-white/15 bg-white/5 hover:bg-white/10 text-white"
            >
              Сохранить в inbox
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 bg-white/5">
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="signals">Signals</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="space-y-4">
          {selectedDraft && (
            <Card style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Brain className="w-4 h-4 text-indigo-300" />
                  Готово к AI-разбору
                </CardTitle>
                <CardDescription className="text-white/60">
                  {selectedDraftLabel}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-white/75 mb-2">{selectedDraft.leakMessage}</p>
                <LeakAiAnalysisCard
                  userId={user.id}
                  leakType={selectedDraft.leakType}
                  leakMessage={selectedDraft.leakMessage}
                  severity={selectedDraft.severity}
                />
              </CardContent>
            </Card>
          )}

          {priorityLeaks.length > 0 && (
            <Card style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-base">Приоритетный фокус</CardTitle>
                <CardDescription className="text-white/60">
                  Leaks, где сейчас выше риск застрять без следующего шага.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {priorityLeaks.map((leak) => (
                    <Button
                      key={`priority-${leak.id}`}
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setExpandedLeakId(leak.id)
                        setStatusFilter('all')
                      }}
                      className="border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/15 text-amber-100"
                    >
                      {leak.title}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setStatusFilter(option.id)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  statusFilter === option.id
                    ? 'border-indigo-400/30 bg-indigo-500/10 text-indigo-200'
                    : 'border-white/10 bg-white/5 text-white/55 hover:bg-white/10'
                }`}
              >
                {option.label} ({leakCounts[option.id]})
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {SOURCE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setSourceFilter(option.id)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  sourceFilter === option.id
                    ? 'border-indigo-400/30 bg-indigo-500/10 text-indigo-200'
                    : 'border-white/10 bg-white/5 text-white/55 hover:bg-white/10'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFocusFilter('all')}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                focusFilter === 'all'
                  ? 'border-indigo-400/30 bg-indigo-500/10 text-indigo-200'
                  : 'border-white/10 bg-white/5 text-white/55 hover:bg-white/10'
              }`}
            >
              Все leaks
            </button>
            <button
              type="button"
              onClick={() => setFocusFilter('focus')}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                focusFilter === 'focus'
                  ? 'border-indigo-400/30 bg-indigo-500/10 text-indigo-200'
                  : 'border-white/10 bg-white/5 text-white/55 hover:bg-white/10'
              }`}
            >
              Фокус ({focusLeakCount})
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setSortOption(option.id)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  sortOption === option.id
                    ? 'border-indigo-400/30 bg-indigo-500/10 text-indigo-200'
                    : 'border-white/10 bg-white/5 text-white/55 hover:bg-white/10'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {GROUP_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setGroupBy(option.id)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  groupBy === option.id
                    ? 'border-indigo-400/30 bg-indigo-500/10 text-indigo-200'
                    : 'border-white/10 bg-white/5 text-white/55 hover:bg-white/10'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Поиск по ликам, описанию или сфере"
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />

          {filteredLeaks.length === 0 ? (
            <Card style={{ background: 'rgba(15,23,42,0.82)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <CardContent className="pt-6 space-y-4">
                {leaks.length === 0 ? (
                  <>
                    <div className="space-y-2">
                      <div className="text-white font-medium">Здесь появится твой inbox ликов</div>
                      <p className="text-sm text-white/60">
                        Начни с одной короткой фразы в блоке выше, либо забери готовый сигнал из weekly data и уже потом разбери его с AI.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveTab('signals')}
                        className="border-white/15 bg-white/5 hover:bg-white/10 text-white"
                      >
                        Сигналы ({signals.length})
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveTab('patterns')}
                        className="border-white/15 bg-white/5 hover:bg-white/10 text-white"
                      >
                        Patterns ({patterns.length})
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <div className="text-white font-medium">По текущим фильтрам ничего не найдено</div>
                      <p className="text-sm text-white/60">
                        Сбрось фильтры или поиск, чтобы снова увидеть весь inbox и активные leak-сценарии.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={clearLeakFilters}
                        className="border-white/15 bg-white/5 hover:bg-white/10 text-white"
                      >
                        Сбросить фильтры
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredLeaks.map((leak, index) => {
              const guidance = buildLeakGuidance(leak, plansByLeak[leak.id])
              const leakPlans = plansByLeak[leak.id] || []
              const selectedPlan = getSelectedPlan(leakPlans)
              const bottleneckPlanAction =
                selectedPlan && guidance.bottleneckActionId
                  ? selectedPlan.actions.find((action) => action.id === guidance.bottleneckActionId) || null
                  : null
              const bottleneckLinkedEntity =
                bottleneckPlanAction ? getLinkedEntityForPlanAction(leak, bottleneckPlanAction) : null
              const feedbackByActionId = getFeedbackByActionId(leakPlans)
              const planActionsById = getPlanActionById(leakPlans)
              const feedbackByAction = getLeakFeedbackByAction(leak, leakPlans)
              const feedbackHistoryFilter = feedbackHistoryFilterByLeak[leak.id] || 'all'
              const visibleFeedbackTimeline =
                feedbackHistoryFilter === 'problem'
                  ? feedbackByAction.filter((item) => item.result !== 'worked')
                  : feedbackByAction
              const latestWorkedOutcome = getLatestWorkedOutcome(leak, leakPlans)
              const recentFeedbackTrend = getRecentFeedbackTrend(leak.contextSnapshot)
              const contextHypotheses = buildContextHypotheses(leak.contextSnapshot)
              const retryFocus = getRetryFocus(leak.contextSnapshot)
              const selectedModeFromSnapshot = getSnapshotMode(leak.contextSnapshot, 'selectedPlanMode')
              const lastStableMode = getSnapshotMode(leak.contextSnapshot, 'lastStableMode')
              const policy = policyByLeak[leak.id] || null
              const nextBestActionHint = policy?.nextBestAction || null
              const policyEvents = (policy?.runJournal || []).filter((event) => event.type.startsWith('policy_'))
              const policyAcceptedCount =
                typeof policy?.summary?.accepted === 'number'
                  ? policy.summary.accepted
                  : policyEvents.filter((event) => event.type === 'policy_accepted').length
              const policyRejectedCount =
                typeof policy?.summary?.rejected === 'number'
                  ? policy.summary.rejected
                  : policyEvents.filter((event) => event.type === 'policy_rejected').length
              const policyOutcomeCount =
                typeof policy?.summary?.outcomes === 'number'
                  ? policy.summary.outcomes
                  : policyEvents.filter((event) => event.type === 'policy_outcome').length
              const policyOutcomeWorked =
                typeof policy?.summary?.outcomeWorked === 'number'
                  ? policy.summary.outcomeWorked
                  : policyEvents.filter((event) => event.type === 'policy_outcome' && event.result === 'worked').length
              const policyOutcomePartial =
                typeof policy?.summary?.outcomePartial === 'number'
                  ? policy.summary.outcomePartial
                  : policyEvents.filter((event) => event.type === 'policy_outcome' && event.result === 'partially').length
              const policyOutcomeFailed =
                typeof policy?.summary?.outcomeFailed === 'number'
                  ? policy.summary.outcomeFailed
                  : policyEvents.filter((event) => event.type === 'policy_outcome' && event.result === 'not_worked').length
              const policySuggestionCorrelationId = nextBestActionHint?.correlationId || null
              const latestPolicyDecision =
                policySuggestionCorrelationId
                  ? policyEvents.find(
                      (event) =>
                        (event.type === 'policy_accepted' || event.type === 'policy_rejected') &&
                        event.policyCorrelationId === policySuggestionCorrelationId,
                    ) || null
                  : null
              const policyDecisionState = latestPolicyDecision
                ? latestPolicyDecision.type === 'policy_accepted'
                  ? 'accepted'
                  : 'rejected'
                : 'pending'
              const policyComputedMinutes = getMinutesSince(policy?.computedAt)
              const policyRejectReasonCounts =
                policy?.summary?.rejectReasons && Object.keys(policy.summary.rejectReasons).length > 0
                  ? policy.summary.rejectReasons
                  : policyEvents
                      .filter((event) => event.type === 'policy_rejected' && event.note)
                      .reduce<Record<string, number>>((acc, event) => {
                        const key = event.note || 'unknown'
                        acc[key] = (acc[key] || 0) + 1
                        return acc
                      }, {})
              const contextDriftHint = policy?.contextDrift || null
              const executionScore = policy?.executionScore || {
                value: 0,
                breakdown: {
                  createdCoverage: 0,
                  feedbackCoverage: 0,
                  workedShare: 0,
                  attemptsPenalty: 0,
                  driftPenalty: 0,
                },
              }
              const adaptiveModeSuggestion = policy?.adaptiveModeSuggestion || null
              const selectedModeForChain =
                policy?.selectedMode || selectedPlan?.mode || selectedModeFromSnapshot || null
              const createdEntityCountForChain = leak.actions.length
              const feedbackCountForChain = feedbackByAction.length
              const workedCountForChain = feedbackByAction.filter((item) => item.result === 'worked').length
              const contextPulse = {
                energyAvg: getContextMetricNumber(leak.contextSnapshot, 'energyAvg'),
                stressAvg: getContextMetricNumber(leak.contextSnapshot, 'stressAvg'),
                sleepHoursAvg: getContextMetricNumber(leak.contextSnapshot, 'sleepHoursAvg'),
                openTasks: getContextMetricNumber(leak.contextSnapshot, 'openTasks'),
              }
              const contextPulseRisk =
                (contextPulse.stressAvg !== null && contextPulse.stressAvg >= 7) ||
                (contextPulse.energyAvg !== null && contextPulse.energyAvg <= 5) ||
                (contextPulse.sleepHoursAvg !== null && contextPulse.sleepHoursAvg < 6.5) ||
                (contextPulse.openTasks !== null && contextPulse.openTasks >= 18)
                  ? 'high'
                  : 'normal'
              const snapshotHistory = getSnapshotHistory(leak.contextSnapshot)
              const matchedPattern = getBestPatternForLeak(patterns, leak)
              const matchedPatternLinkType = matchedPattern ? getPatternLinkTypeForLeak(matchedPattern, leak) : 'none'
              const groupKey = getLeakGroupKey(leak, groupBy)
              const prevGroupKey =
                index > 0 ? getLeakGroupKey(filteredLeaks[index - 1], groupBy) : null
              const showGroupHeader = groupBy !== 'none' && groupKey !== prevGroupKey

              return (
                <div key={leak.id} className="space-y-2">
                {showGroupHeader && (
                    <div className="px-1">
                      <div className="text-[11px] uppercase tracking-wide text-white/35">
                      {getLeakGroupLabel(groupKey, groupBy)} ({groupCounts[groupKey] || 0})
                      </div>
                    </div>
                )}
                <Card style={{ background: 'rgba(15,23,42,0.82)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-white font-medium">{leak.title}</div>
                      <div className="text-xs text-white/35 mt-1">
                        Создан: {formatDate(leak.createdAt)}
                        {leak.resolvedAt ? ` • Решён: ${formatDate(leak.resolvedAt)}` : ''}
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      {isFocusLeak(leak) && (
                        <Badge className="bg-indigo-500/10 text-indigo-200 border-indigo-500/20">
                          Фокус
                        </Badge>
                      )}
                      <Badge className={STATUS_STYLES[leak.status]}>{STATUS_LABELS[leak.status]}</Badge>
                      <Badge className={SEVERITY_STYLES[leak.severity]}>{leak.severity}</Badge>
                      {leak.actions.length > 0 && (
                        <Badge className="bg-white/10 text-white/75 border-white/10">
                          Действий: {leak.actions.length}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {leak.description && (
                    <p className="text-sm text-white/72 whitespace-pre-wrap">{leak.description}</p>
                  )}

                  {leak.actions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {leak.actions.map((action) => (
                        <button
                          key={action.id}
                          type="button"
                          onClick={() => setScreen(getActionScreen(action.entityType))}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 hover:bg-white/10"
                        >
                          {getActionLabel(action.entityType)}: {action.label}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {leak.status === 'new' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateLeakStatus(leak.id, 'in_progress')}
                        disabled={updatingLeakId === leak.id}
                        className="border-white/15 bg-white/5 hover:bg-white/10 text-white"
                      >
                        В работу
                      </Button>
                    )}
                    {leak.status !== 'resolved' && leak.status !== 'archived' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateLeakStatus(leak.id, 'resolved')}
                        disabled={updatingLeakId === leak.id}
                        className="border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-200"
                      >
                        Решено
                      </Button>
                    )}
                    {leak.status !== 'archived' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateLeakStatus(leak.id, 'archived')}
                        disabled={updatingLeakId === leak.id}
                        className="border-white/15 bg-white/5 hover:bg-white/10 text-white"
                      >
                        В архив
                      </Button>
                    )}
                    {(leak.status === 'resolved' || leak.status === 'archived') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateLeakStatus(leak.id, 'in_progress')}
                        disabled={updatingLeakId === leak.id}
                        className="border-white/15 bg-white/5 hover:bg-white/10 text-white"
                      >
                        Вернуть в работу
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleLeakFocus(leak)}
                      disabled={updatingLeakId === leak.id}
                      className={
                        isFocusLeak(leak)
                          ? 'border-indigo-500/20 bg-indigo-500/10 hover:bg-indigo-500/15 text-indigo-200'
                          : 'border-white/15 bg-white/5 hover:bg-white/10 text-white'
                      }
                    >
                      {isFocusLeak(leak) ? 'Убрать из фокуса' : 'В фокус'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleLeakDetails(leak.id)}
                      className="border-white/15 bg-white/5 hover:bg-white/10 text-white"
                    >
                      {expandedLeakId === leak.id ? 'Скрыть детали' : 'Детали'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setSelectedDraft({
                          leakType: leak.title,
                          leakMessage: buildLeakMessage(leak),
                          severity: leak.severity,
                        })
                      }
                      className="border-indigo-500/20 bg-indigo-500/10 hover:bg-indigo-500/15 text-indigo-200"
                    >
                      Разобрать
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEditingLeak(leak)}
                      className="border-white/15 bg-white/5 hover:bg-white/10 text-white"
                    >
                      Редактировать
                    </Button>
                  </div>

                  {expandedLeakId === leak.id && (
                    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                      <div className={`rounded-2xl border p-3 ${LEAK_GUIDANCE_STYLES[guidance.tone]}`}>
                        <div className="text-xs uppercase tracking-wide text-white/45">
                          Следующий шаг
                        </div>
                        <div className="mt-1 text-sm font-medium text-white">{guidance.title}</div>
                        <p className="mt-1 text-sm text-white/70">{guidance.description}</p>
                        {guidance.bottleneckText && (
                          <div className="mt-2 rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-xs text-white/75">
                            Узкое место: {guidance.bottleneckText}
                          </div>
                        )}
                        {retryFocus?.actionTitle && (
                          <div className="mt-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2">
                            <div className="text-xs text-amber-200">
                              Retry-фокус: {retryFocus.actionTitle}
                              {retryFocus.actionKind ? ` (${PLAN_KIND_LABELS[retryFocus.actionKind as LeakPlanAction['kind']] || retryFocus.actionKind})` : ''}
                            </div>
                            {retryFocus.failureReason && (
                              <div className="mt-1 text-xs text-amber-100/85">
                                Причина прошлого сбоя: {retryFocus.failureReason}
                              </div>
                            )}
                            {retryFocus.requestedAt && (
                              <div className="mt-1 text-[11px] text-amber-100/70">
                                Последний retry: {formatDate(retryFocus.requestedAt)}
                              </div>
                            )}
                          </div>
                        )}
                        {latestWorkedOutcome && (
                          <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
                            <div className="text-xs text-emerald-100">
                              Последний сработавший шаг: {latestWorkedOutcome.actionTitle}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-2">
                              <Badge className={PLAN_MODE_STYLES[latestWorkedOutcome.mode]}>
                                {PLAN_MODE_LABELS[latestWorkedOutcome.mode]}
                              </Badge>
                              <Badge variant="outline" className="border-emerald-400/30 text-emerald-100">
                                {PLAN_KIND_LABELS[latestWorkedOutcome.actionKind]}
                              </Badge>
                              {latestWorkedOutcome.linkedEntity && (
                                <Badge className="bg-indigo-500/10 text-indigo-200 border-indigo-500/20">
                                  Сущность: {getActionLabel(latestWorkedOutcome.linkedEntity.entityType)} • {latestWorkedOutcome.linkedEntity.label}
                                </Badge>
                              )}
                              <Badge className="bg-white/10 text-white/70 border-white/10">
                                Feedback: {formatDate(latestWorkedOutcome.updatedAt)}
                              </Badge>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {latestWorkedOutcome.linkedEntity ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setScreen(getActionScreen(latestWorkedOutcome.linkedEntity!.entityType))}
                                  className="border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-100"
                                >
                                  Открыть последний сработавший
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const matchedAction = selectedPlan?.actions.find(
                                      (action) => action.title === latestWorkedOutcome.actionTitle,
                                    )
                                    if (matchedAction) {
                                      focusPlanAction(leak.id, matchedAction.id)
                                    }
                                  }}
                                  className="border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-100"
                                >
                                  Перейти к шагу
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                        {guidance.selectedPlan && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge className={PLAN_MODE_STYLES[guidance.selectedPlan.mode]}>
                              {PLAN_MODE_LABELS[guidance.selectedPlan.mode]}
                            </Badge>
                            <Badge
                              className={
                                executionScore.value >= 70
                                  ? 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20'
                                  : executionScore.value >= 40
                                    ? 'bg-amber-500/10 text-amber-200 border-amber-500/20'
                                    : 'bg-rose-500/10 text-rose-200 border-rose-500/20'
                              }
                            >
                              Execution score: {executionScore.value}
                            </Badge>
                            <Badge className="bg-white/10 text-white/75 border-white/10">
                              Создано {guidance.createdActions}/{guidance.totalActions}
                            </Badge>
                            {guidance.workedActions > 0 && (
                              <Badge className="bg-emerald-500/10 text-emerald-200 border-emerald-500/20">
                                Сработало {guidance.workedActions}
                              </Badge>
                            )}
                            {guidance.partialActions > 0 && (
                              <Badge className="bg-amber-500/10 text-amber-200 border-amber-500/20">
                                Частично {guidance.partialActions}
                              </Badge>
                            )}
                            {guidance.failedActions > 0 && (
                              <Badge className="bg-rose-500/10 text-rose-200 border-rose-500/20">
                                Не помогло {guidance.failedActions}
                              </Badge>
                            )}
                          </div>
                        )}
                        {guidance.selectedPlan && (
                          <div className="mt-2 text-[11px] text-white/55">
                            Score breakdown: создание {executionScore.breakdown.createdCoverage}% • feedback {executionScore.breakdown.feedbackCoverage}% • worked {executionScore.breakdown.workedShare}% • штраф попыток -{executionScore.breakdown.attemptsPenalty} • штраф drift -{executionScore.breakdown.driftPenalty}
                          </div>
                        )}
                        {guidance.totalActions > 0 && (
                          <div className="mt-3 space-y-2">
                            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                              <div
                                className="h-full rounded-full bg-indigo-400/80"
                                style={{
                                  width: `${Math.round((guidance.createdActions / guidance.totalActions) * 100)}%`,
                                }}
                              />
                            </div>
                            <div className="text-xs text-white/50">
                              Применение: {Math.round((guidance.createdActions / guidance.totalActions) * 100)}%
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                              <div
                                className="h-full rounded-full bg-emerald-400/80"
                                style={{
                                  width: `${Math.round((guidance.feedbackActions / guidance.totalActions) * 100)}%`,
                                }}
                              />
                            </div>
                            <div className="text-xs text-white/50">
                              Feedback покрытие: {Math.round((guidance.feedbackActions / guidance.totalActions) * 100)}%
                            </div>
                            {guidance.feedbackActions > 0 && (
                              <>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                                  <div
                                    className="h-full rounded-full bg-emerald-400/80"
                                    style={{
                                      width: `${Math.round((guidance.workedActions / guidance.feedbackActions) * 100)}%`,
                                    }}
                                  />
                                </div>
                                <div className="text-xs text-white/50">
                                  Эффективность feedback: {Math.round((guidance.workedActions / guidance.feedbackActions) * 100)}%
                                </div>
                              </>
                            )}
                          </div>
                        )}
                        {recentFeedbackTrend && (
                          <div
                            className={`mt-3 rounded-xl border px-3 py-2 text-xs ${
                              recentFeedbackTrend.isRisky
                                ? 'border-amber-500/25 bg-amber-500/10 text-amber-100'
                                : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100'
                            }`}
                          >
                            Свежий тренд feedback: {recentFeedbackTrend.windowSize} событий, негативных{' '}
                            {recentFeedbackTrend.negativeShare}%.
                            {recentFeedbackTrend.isRisky
                              ? ' Режим можно упростить до minimum.'
                              : recentFeedbackTrend.isStable
                                ? ' Динамика стабильная: можно аккуратно усиливать режим.'
                              : ' Динамика пока смешанная.'}
                          </div>
                        )}
                        <div className="mt-3 rounded-xl border border-white/10 bg-black/15 px-3 py-2 text-xs text-white/75">
                          Цепочка выполнения:
                          {' '}
                          leak
                          {' → '}
                          {selectedModeForChain ? `режим ${PLAN_MODE_LABELS[selectedModeForChain]}` : 'режим не выбран'}
                          {' → '}
                          создано сущностей {createdEntityCountForChain}
                          {' → '}
                          feedback {feedbackCountForChain}
                          {' → '}
                          worked {workedCountForChain}
                        </div>
                        {contextDriftHint && (
                          <div
                            className={`mt-3 rounded-xl border px-3 py-2 text-xs ${
                              contextDriftHint.isStale
                                ? 'border-rose-500/25 bg-rose-500/10 text-rose-100'
                                : 'border-white/10 bg-black/10 text-white/70'
                            }`}
                          >
                            Drift контекста: {contextDriftHint.score}%.
                            {contextDriftHint.generatedAt
                              ? ` База: ${formatDate(contextDriftHint.generatedAt)}.`
                              : ' База генерации ещё не зафиксирована.'}
                            {contextDriftHint.changedMetrics.length > 0 && (
                              <div className="mt-1 text-[11px] text-white/60">
                                Изменилось: {contextDriftHint.changedMetrics.map((item) => `${item.key} (${item.deltaPct > 0 ? '+' : ''}${item.deltaPct}%)`).join(', ')}
                              </div>
                            )}
                          </div>
                        )}
                        {nextBestActionHint && (
                          <div className="mt-3 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-xs uppercase tracking-wide text-indigo-200/80">
                                Next Best Action ({nextBestActionHint.confidence})
                              </div>
                              <Badge
                                className={
                                  policyDecisionState === 'accepted'
                                    ? 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20'
                                    : policyDecisionState === 'rejected'
                                      ? 'bg-amber-500/10 text-amber-200 border-amber-500/20'
                                      : 'bg-white/10 text-white/70 border-white/10'
                                }
                              >
                                {policyDecisionState === 'accepted'
                                  ? 'Статус: принят'
                                  : policyDecisionState === 'rejected'
                                    ? 'Статус: отклонён'
                                    : 'Статус: без ответа'}
                              </Badge>
                            </div>
                            <div className="mt-1 text-sm text-indigo-100">{nextBestActionHint.reason}</div>
                            {nextBestActionHint.factors && nextBestActionHint.factors.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {nextBestActionHint.factors.slice(0, 3).map((factor) => (
                                  <Badge
                                    key={`${factor.key}-${factor.weight}`}
                                    className="border-white/15 bg-black/15 text-indigo-100/90"
                                  >
                                    {factor.key}: {Math.round(factor.weight * 100)}%
                                  </Badge>
                                ))}
                              </div>
                            )}
                            <div className="mt-2 flex flex-wrap gap-2">
                              {nextBestActionHint.type === 'switch_mode' && nextBestActionHint.targetMode && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    executePolicyAction(leak, {
                                      actionType: 'switch_mode',
                                      correlationId: nextBestActionHint.correlationId || null,
                                      targetMode: nextBestActionHint.targetMode,
                                      factors: nextBestActionHint.factors || [],
                                    })
                                  }
                                  disabled={selectingPlanLeakId === leak.id}
                                  className="border-indigo-400/25 bg-indigo-500/10 hover:bg-indigo-500/15 text-indigo-100"
                                >
                                  {selectingPlanLeakId === leak.id
                                    ? 'Переключаю...'
                                    : `Переключить: ${PLAN_MODE_LABELS[nextBestActionHint.targetMode]}`}
                                </Button>
                              )}
                              {nextBestActionHint.type === 'create_entity' && nextBestActionHint.actionId && selectedPlan && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    const action = selectedPlan.actions.find((item) => item.id === nextBestActionHint.actionId)
                                    if (action) {
                                      await executePolicyAction(leak, {
                                        actionType: 'focus_action',
                                        correlationId: nextBestActionHint.correlationId || null,
                                        actionId: action.id,
                                        actionTitle: action.title,
                                        actionKind: action.kind,
                                        factors: nextBestActionHint.factors || [],
                                      })
                                      applySinglePlanAction(leak, selectedPlan.mode, action)
                                    }
                                  }}
                                  className="border-indigo-400/25 bg-indigo-500/10 hover:bg-indigo-500/15 text-indigo-100"
                                >
                                  Создать рекомендуемый шаг
                                </Button>
                              )}
                              {nextBestActionHint.type === 'give_feedback' && nextBestActionHint.actionId && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    const action = planActionsById.get(nextBestActionHint.actionId || '')
                                    await executePolicyAction(leak, {
                                      actionType: 'focus_action',
                                      correlationId: nextBestActionHint.correlationId || null,
                                      actionId: nextBestActionHint.actionId || null,
                                      actionTitle: action?.title || null,
                                      actionKind: action?.kind || null,
                                      factors: nextBestActionHint.factors || [],
                                    })
                                    focusPlanAction(leak.id, nextBestActionHint.actionId || '')
                                  }}
                                  className="border-indigo-400/25 bg-indigo-500/10 hover:bg-indigo-500/15 text-indigo-100"
                                >
                                  Перейти к feedback
                                </Button>
                              )}
                              {nextBestActionHint.type === 'retry' && nextBestActionHint.actionId && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    const action = planActionsById.get(nextBestActionHint.actionId || '') || null
                                    await executePolicyAction(leak, {
                                      actionType: 'retry',
                                      correlationId: nextBestActionHint.correlationId || null,
                                      actionId: action?.id || nextBestActionHint.actionId || null,
                                      actionTitle: action?.title || null,
                                      actionKind: action?.kind || null,
                                      factors: nextBestActionHint.factors || [],
                                    })
                                    await retryLeakPlanning(leak, {
                                      action: planActionsById.get(nextBestActionHint.actionId || '') || null,
                                      failureReason: null,
                                    })
                                  }}
                                  disabled={retryingLeakId === leak.id}
                                  className="border-indigo-400/25 bg-indigo-500/10 hover:bg-indigo-500/15 text-indigo-100"
                                >
                                  {retryingLeakId === leak.id ? 'Обновляю...' : 'Retry по рекомендации'}
                                </Button>
                              )}
                              {(nextBestActionHint.type === 'generate' || nextBestActionHint.type === 'regenerate_context') && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    if (nextBestActionHint.type === 'regenerate_context') {
                                      await executePolicyAction(leak, {
                                        actionType: 'regenerate_context',
                                        correlationId: nextBestActionHint.correlationId || null,
                                        factors: nextBestActionHint.factors || [],
                                      })
                                      return
                                    }
                                    await generatePlansForLeak(leak.id, true)
                                  }}
                                  disabled={generatingPlansLeakId === leak.id}
                                  className="border-indigo-400/25 bg-indigo-500/10 hover:bg-indigo-500/15 text-indigo-100"
                                >
                                  {generatingPlansLeakId === leak.id ? 'Собираю...' : 'Пересобрать планы'}
                                </Button>
                              )}
                              {[
                                { key: 'not_now', label: 'Не сейчас' },
                                { key: 'too_hard', label: 'Сложно сейчас' },
                                { key: 'not_relevant', label: 'Не по контексту' },
                              ].map((reject) => (
                                <Button
                                  key={`reject-${reject.key}`}
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    executePolicyAction(leak, {
                                      actionType: nextBestActionHint.type === 'switch_mode'
                                        ? 'switch_mode'
                                        : nextBestActionHint.type === 'retry'
                                          ? 'retry'
                                          : nextBestActionHint.type === 'regenerate_context'
                                            ? 'regenerate_context'
                                            : 'focus_action',
                                      decision: 'rejected',
                                      reason: reject.key,
                                      correlationId: nextBestActionHint.correlationId || null,
                                      targetMode: nextBestActionHint.targetMode || undefined,
                                      actionId: nextBestActionHint.actionId || undefined,
                                      factors: nextBestActionHint.factors || [],
                                    })
                                  }
                                  className="border-white/15 bg-white/5 hover:bg-white/10 text-white"
                                >
                                  {reject.label}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                        {policy && (
                          <div className="mt-3 rounded-xl border border-white/10 bg-black/15 px-3 py-2">
                            <div className="text-xs uppercase tracking-wide text-white/55">Policy inspector</div>
                            <div className="mt-1 text-xs text-white/70">
                              v{policy.policyVersion || 1}
                              {policy.computedAt ? ` • ${formatDate(policy.computedAt)}` : ''}
                              {policyComputedMinutes !== null ? ` • ${policyComputedMinutes}м назад` : ''}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Badge className="bg-emerald-500/10 text-emerald-200 border-emerald-500/20">
                                Принято: {policyAcceptedCount}
                              </Badge>
                              <Badge className="bg-amber-500/10 text-amber-200 border-amber-500/20">
                                Отклонено: {policyRejectedCount}
                              </Badge>
                              <Badge className="bg-indigo-500/10 text-indigo-200 border-indigo-500/20">
                                Outcome: {policyOutcomeCount}
                              </Badge>
                              <Badge className="bg-emerald-500/10 text-emerald-200 border-emerald-500/20">
                                Worked: {policyOutcomeWorked}
                              </Badge>
                              <Badge className="bg-amber-500/10 text-amber-200 border-amber-500/20">
                                Partial: {policyOutcomePartial}
                              </Badge>
                              <Badge className="bg-rose-500/10 text-rose-200 border-rose-500/20">
                                Failed: {policyOutcomeFailed}
                              </Badge>
                            </div>
                            {Object.keys(policyRejectReasonCounts).length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {Object.entries(policyRejectReasonCounts).map(([reason, count]) => (
                                  <Badge
                                    key={`reject-reason-${reason}`}
                                    className="bg-white/10 text-white/70 border-white/10"
                                  >
                                    reject:{' '}
                                    {reason === 'not_now'
                                      ? 'не сейчас'
                                      : reason === 'too_hard'
                                        ? 'сложно сейчас'
                                        : reason === 'not_relevant'
                                          ? 'не по контексту'
                                          : reason}
                                    {' '}({count})
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {policyEvents.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {policyEvents
                                  .slice(0, 4)
                                  .map((event) => (
                                    <div
                                      key={`${event.type}-${event.at}-${event.policyCorrelationId || ''}`}
                                      className="text-xs text-white/65 flex flex-wrap items-center gap-2"
                                    >
                                      <span>
                                        {getPolicyEventLabel(event.type)} • {formatDate(event.at)}
                                        {event.policyActionType ? ` • ${getPolicyActionLabel(event.policyActionType)}` : ''}
                                        {event.result ? ` • ${getPolicyResultLabel(event.result)}` : ''}
                                        {event.note ? ` • ${event.note}` : ''}
                                        {event.actionTitle ? ` • ${event.actionTitle}` : ''}
                                        {event.factors && event.factors.length > 0
                                          ? ` • factors: ${event.factors.slice(0, 2).map((item) => item.key).join(', ')}`
                                          : ''}
                                      </span>
                                      {event.actionId && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => focusPlanAction(leak.id, event.actionId || '')}
                                          className="border-white/15 bg-white/5 hover:bg-white/10 text-white"
                                        >
                                          К шагу
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        )}
                        {guidance.action && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => runGuidanceAction(leak, guidance.action)}
                              disabled={
                                retryingLeakId === leak.id ||
                                updatingLeakId === leak.id ||
                                generatingPlansLeakId === leak.id
                              }
                              className="border-white/15 bg-white/5 hover:bg-white/10 text-white"
                            >
                              {retryingLeakId === leak.id && guidance.action === 'retry'
                                ? 'Обновляю...'
                                : guidance.actionLabel}
                            </Button>
                          </div>
                        )}
                        {adaptiveModeSuggestion &&
                          selectedPlan &&
                          adaptiveModeSuggestion.targetMode !== selectedPlan.mode && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  executePolicyAction(leak, {
                                    actionType: 'switch_mode',
                                    reason: 'adaptive_mode_suggestion',
                                    targetMode: adaptiveModeSuggestion.targetMode,
                                  })
                                }
                                disabled={selectingPlanLeakId === leak.id}
                                className="border-indigo-400/25 bg-indigo-500/10 hover:bg-indigo-500/15 text-indigo-100"
                              >
                                {selectingPlanLeakId === leak.id
                                  ? 'Переключаю...'
                                  : `Adaptive: ${PLAN_MODE_LABELS[adaptiveModeSuggestion.targetMode]}`}
                              </Button>
                              <div className="text-xs text-white/60 self-center">
                                {adaptiveModeSuggestion.reason}
                              </div>
                            </div>
                          )}
                        {guidance.bottleneckActionId && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => focusPlanAction(leak.id, guidance.bottleneckActionId)}
                              className="border-white/15 bg-white/5 hover:bg-white/10 text-white"
                            >
                              Перейти к узкому шагу
                            </Button>
                            {selectedPlan && bottleneckPlanAction && !bottleneckLinkedEntity && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => applySinglePlanAction(leak, selectedPlan.mode, bottleneckPlanAction)}
                                disabled={applyingPlanActionId === bottleneckPlanAction.id || applyingPlanLeakId === leak.id}
                                className="border-indigo-500/20 bg-indigo-500/10 hover:bg-indigo-500/15 text-indigo-200"
                              >
                                {applyingPlanActionId === bottleneckPlanAction.id ? 'Создаю...' : 'Создать узкий шаг'}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge className="bg-white/10 text-white/75 border-white/10">
                          Источник: {getSourceLabel(leak.source)}
                        </Badge>
                        {leak.sphere && (
                          <Badge className="bg-white/10 text-white/75 border-white/10">
                            Сфера: {getSphereLabel(leak.sphere)}
                          </Badge>
                        )}
                      </div>

                      {editingLeakId === leak.id && (
                        <div className="space-y-3 rounded-2xl border border-white/10 bg-black/10 p-3">
                          <Input
                            value={editingLeakTitle}
                            onChange={(event) => setEditingLeakTitle(event.target.value)}
                            placeholder="Название лика"
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                          />
                          <Textarea
                            value={editingLeakDescription}
                            onChange={(event) => setEditingLeakDescription(event.target.value)}
                            placeholder="Уточни, что именно происходит и что хочешь исправить"
                            className="min-h-24 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                          />
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              onClick={() => saveLeakEdits(leak.id)}
                              disabled={!editingLeakTitle.trim() || updatingLeakId === leak.id}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white"
                            >
                              {updatingLeakId === leak.id ? 'Сохраняю...' : 'Сохранить'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEditingLeak}
                              className="border-white/15 bg-white/5 hover:bg-white/10 text-white"
                            >
                              Отмена
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="text-xs uppercase tracking-wide text-white/40">
                          Сфера
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => updateLeakSphere(leak.id, null)}
                            disabled={updatingLeakId === leak.id}
                            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                              !leak.sphere
                                ? 'border-indigo-400/30 bg-indigo-500/10 text-indigo-200'
                                : 'border-white/10 bg-white/5 text-white/55 hover:bg-white/10'
                            }`}
                          >
                            Без сферы
                          </button>
                          {SPHERE_OPTIONS.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => updateLeakSphere(leak.id, option.id)}
                              disabled={updatingLeakId === leak.id}
                              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                                leak.sphere === option.id
                                  ? 'border-indigo-400/30 bg-indigo-500/10 text-indigo-200'
                                  : 'border-white/10 bg-white/5 text-white/55 hover:bg-white/10'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {getContextSnapshotItems(leak.contextSnapshot).length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs uppercase tracking-wide text-white/40">
                            Контекст
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {getContextSnapshotItems(leak.contextSnapshot).map((item) => (
                              <Badge
                                key={item}
                                variant="outline"
                                className="border-white/10 text-white/60 whitespace-normal text-left"
                              >
                                {item}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {(contextPulse.energyAvg !== null ||
                        contextPulse.stressAvg !== null ||
                        contextPulse.sleepHoursAvg !== null ||
                        contextPulse.openTasks !== null) && (
                        <div className="space-y-2">
                          <div className="text-xs uppercase tracking-wide text-white/40">
                            Контекстный пульс
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge
                              className={
                                contextPulseRisk === 'high'
                                  ? 'bg-rose-500/10 text-rose-200 border-rose-500/20'
                                  : 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20'
                              }
                            >
                              Риск контекста: {contextPulseRisk === 'high' ? 'высокий' : 'нормальный'}
                            </Badge>
                            {contextPulse.energyAvg !== null && (
                              <Badge className="bg-indigo-500/10 text-indigo-200 border-indigo-500/20">
                                Энергия: {contextPulse.energyAvg}
                              </Badge>
                            )}
                            {contextPulse.stressAvg !== null && (
                              <Badge className="bg-rose-500/10 text-rose-200 border-rose-500/20">
                                Стресс: {contextPulse.stressAvg}
                              </Badge>
                            )}
                            {contextPulse.sleepHoursAvg !== null && (
                              <Badge className="bg-sky-500/10 text-sky-200 border-sky-500/20">
                                Сон: {contextPulse.sleepHoursAvg}ч
                              </Badge>
                            )}
                            {contextPulse.openTasks !== null && (
                              <Badge className="bg-amber-500/10 text-amber-200 border-amber-500/20">
                                Открытые задачи: {contextPulse.openTasks}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {contextHypotheses.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs uppercase tracking-wide text-white/40">
                            Контекстные гипотезы
                          </div>
                          <div className="space-y-2">
                            {contextHypotheses.map((item) => (
                              <div
                                key={item}
                                className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-100"
                              >
                                {item}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {(snapshotHistory.linkedEntities.length > 0 || snapshotHistory.actionFeedback.length > 0) && (
                        <div className="space-y-2">
                          <div className="text-xs uppercase tracking-wide text-white/40">
                            Learning memory (snapshot)
                          </div>
                          <div className="grid gap-2 md:grid-cols-2">
                            <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2 space-y-1">
                              <div className="text-xs text-white/55">Последние созданные сущности</div>
                              {snapshotHistory.linkedEntities.slice(0, 4).map((item) => (
                                <div key={`${item.entityType}-${item.label}-${item.createdAt}`} className="text-xs text-white/70">
                                  <div>
                                    {item.sourcePlanMode && item.sourcePlanMode in PLAN_MODE_LABELS
                                      ? `[${PLAN_MODE_LABELS[item.sourcePlanMode as LeakSolutionPlan['mode']]}] `
                                      : ''}
                                    {item.label} • {formatDate(item.createdAt)}
                                  </div>
                                  {isLeakEntityType(item.entityType) && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setScreen(getActionScreen(item.entityType))}
                                      className="mt-1 border-white/15 bg-white/5 hover:bg-white/10 text-white"
                                    >
                                      Открыть {getActionLabel(item.entityType)}
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                            <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2 space-y-1">
                              <div className="text-xs text-white/55">Последние feedback из истории</div>
                              {snapshotHistory.actionFeedback.slice(0, 4).map((item) => (
                                <div key={`${item.actionTitle}-${item.updatedAt}`} className="text-xs text-white/70">
                                  {item.actionTitle} • {item.result} • {formatDate(item.updatedAt)}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {(matchedPattern || selectedPlan) && (
                        <div className="space-y-2">
                          <div className="text-xs uppercase tracking-wide text-white/40">
                            Learning слой
                          </div>
                          {matchedPattern && (
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className="bg-white/10 text-white/70 border-white/10">
                                Паттерн: {matchedPattern.leakType}
                              </Badge>
                              <Badge className="bg-white/10 text-white/70 border-white/10">
                                Анализов: {matchedPattern.analysisCount}
                              </Badge>
                              <Badge
                                className={
                                  matchedPatternLinkType === 'exact'
                                    ? 'bg-indigo-500/10 text-indigo-200 border-indigo-500/20'
                                    : matchedPatternLinkType === 'fuzzy'
                                      ? 'bg-amber-500/10 text-amber-200 border-amber-500/20'
                                      : 'bg-white/10 text-white/70 border-white/10'
                                }
                              >
                                Связь:{' '}
                                {matchedPatternLinkType === 'exact'
                                  ? 'точное совпадение'
                                  : matchedPatternLinkType === 'fuzzy'
                                    ? 'похожее название'
                                    : 'не определена'}
                              </Badge>
                              <Badge className="bg-white/10 text-white/70 border-white/10">
                                Обновлено: {formatDate(matchedPattern.updatedAt)}
                              </Badge>
                              {(matchedPattern.workedCount || 0) > 0 && (
                                <Badge className="bg-emerald-500/10 text-emerald-200 border-emerald-500/20">
                                  Сработало: {matchedPattern.workedCount}
                                </Badge>
                              )}
                              {(matchedPattern.partialCount || 0) > 0 && (
                                <Badge className="bg-amber-500/10 text-amber-200 border-amber-500/20">
                                  Частично: {matchedPattern.partialCount}
                                </Badge>
                              )}
                              {(matchedPattern.failedCount || 0) > 0 && (
                                <Badge className="bg-rose-500/10 text-rose-200 border-rose-500/20">
                                  Не помогло: {matchedPattern.failedCount}
                                </Badge>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setActiveTab('patterns')}
                                className="border-white/15 bg-white/5 hover:bg-white/10 text-white"
                              >
                                Открыть Patterns
                              </Button>
                            </div>
                          )}
                          {matchedPattern && (
                            <div className="text-xs text-white/55">
                              {matchedPatternLinkType === 'exact'
                                ? 'Связь построена по точному совпадению названия leak и pattern.'
                                : matchedPatternLinkType === 'fuzzy'
                                  ? 'Связь построена по похожему названию. Проверь формулировку leak для более точного обучения.'
                                  : 'Тип связи не определён автоматически.'}
                            </div>
                          )}
                          {matchedPattern &&
                            matchedPatternLinkType === 'fuzzy' &&
                            normalizeLookupValue(matchedPattern.leakType) !== normalizeLookupValue(leak.title) && (
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => syncLeakTitleWithPattern(leak, matchedPattern)}
                                  disabled={updatingLeakId === leak.id}
                                  className="border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/15 text-amber-200"
                                >
                                  {updatingLeakId === leak.id
                                    ? 'Синхронизирую...'
                                    : 'Синхронизировать название с паттерном'}
                                </Button>
                              </div>
                            )}
                          {matchedPattern?.workedExamples && matchedPattern.workedExamples.length > 0 ? (
                            <div className="space-y-2">
                              {matchedPattern.workedExamples.map((item) => (
                                <div
                                  key={`${item.text}-${item.updatedAt || 'na'}`}
                                  className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2"
                                >
                                  <div className="text-sm text-emerald-100">{item.text}</div>
                                  <div className="mt-1 flex flex-wrap gap-2">
                                    {item.sourcePlanMode && (
                                      <Badge className="bg-white/10 text-white/70 border-white/10">
                                        Режим:{' '}
                                        {item.sourcePlanMode in PLAN_MODE_LABELS
                                          ? PLAN_MODE_LABELS[item.sourcePlanMode as LeakSolutionPlan['mode']]
                                          : item.sourcePlanMode}
                                      </Badge>
                                    )}
                                    {item.linkedEntityLabel && item.linkedEntityType && (
                                      <Badge className="bg-indigo-500/10 text-indigo-200 border-indigo-500/20">
                                        Сущность: {getActionLabel(item.linkedEntityType as LeakActionLink['entityType'])} • {item.linkedEntityLabel}
                                      </Badge>
                                    )}
                                    {item.updatedAt && (
                                      <Badge className="bg-white/10 text-white/65 border-white/10">
                                        Feedback: {formatDate(item.updatedAt)}
                                      </Badge>
                                    )}
                                  </div>
                                  {item.comment && <div className="mt-1 text-xs text-emerald-100/80">{item.comment}</div>}
                                </div>
                              ))}
                            </div>
                          ) : matchedPattern?.whatWorked?.length ? (
                            <div className="flex flex-wrap gap-2">
                              {matchedPattern.whatWorked.map((item) => (
                                <Badge
                                  key={item}
                                  className="bg-emerald-500/10 text-emerald-200 border-emerald-500/20 whitespace-normal text-left"
                                >
                                  {item}
                                </Badge>
                              ))}
                            </div>
                          ) : matchedPattern ? (
                            <p className="text-sm text-white/55">
                              После первых feedback тут появятся решения, которые стабильно работают именно для этого leak.
                            </p>
                          ) : null}
                        </div>
                      )}

                      {selectedPlan && (
                        <div className="space-y-2">
                          <div className="text-xs uppercase tracking-wide text-white/40">
                            Цепочка выполнения
                          </div>
                          <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
                              <Badge variant="outline" className="border-white/10 text-white/70">
                                Leak: {leak.title}
                              </Badge>
                              <span className="text-white/35">→</span>
                              <Badge className={PLAN_MODE_STYLES[selectedPlan.mode]}>
                                Режим: {PLAN_MODE_LABELS[selectedPlan.mode]}
                              </Badge>
                              <span className="text-white/35">→</span>
                              <Badge className="bg-white/10 text-white/75 border-white/10">
                                Создано: {guidance.createdActions}/{guidance.totalActions}
                              </Badge>
                              <span className="text-white/35">→</span>
                              <Badge className="bg-emerald-500/10 text-emerald-200 border-emerald-500/20">
                                Feedback: {guidance.feedbackActions}/{guidance.totalActions}
                              </Badge>
                            </div>
                          </div>
                          <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2 space-y-2">
                            <div className="flex flex-wrap gap-2">
                              <Badge className={PLAN_MODE_STYLES[selectedPlan.mode]}>
                                Режим: {PLAN_MODE_LABELS[selectedPlan.mode]}
                              </Badge>
                              {selectedModeFromSnapshot && (
                                <Badge variant="outline" className="border-white/15 text-white/70">
                                  Последний выбор: {PLAN_MODE_LABELS[selectedModeFromSnapshot]}
                                </Badge>
                              )}
                              {lastStableMode && (
                                <Badge className="bg-emerald-500/10 text-emerald-200 border-emerald-500/20">
                                  Стабильный режим: {PLAN_MODE_LABELS[lastStableMode]}
                                </Badge>
                              )}
                              <Badge className={PLAN_CONFIDENCE_STYLES[selectedPlan.confidenceLabel]}>
                                Уверенность: {getConfidenceLabelText(selectedPlan.confidenceLabel)}
                              </Badge>
                            </div>
                            {selectedPlan.confidenceReason && (
                              <p className="text-xs text-white/60">{selectedPlan.confidenceReason}</p>
                            )}
                          </div>
                          {(() => {
                            const pendingCreatedNoFeedback = selectedPlan.actions.filter(
                              (action) => isPlanActionConverted(action) && !getLatestPlanFeedback(action),
                            )
                            if (pendingCreatedNoFeedback.length < 2) return null
                            const sampleComment = getFeedbackCommentDraft(pendingCreatedNoFeedback[0])
                            return (
                              <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2 space-y-2">
                                <div className="text-xs text-white/60">
                                  Быстрый feedback: {pendingCreatedNoFeedback.length} созданных шагов пока без оценки.
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {(['worked', 'partially', 'not_worked'] as LeakPlanFeedback['result'][]).map((result) => (
                                    <Button
                                      key={`bulk-feedback-${leak.id}-${result}`}
                                      size="sm"
                                      variant="outline"
                                      onClick={() => applyBulkFeedbackForPendingCreated(leak, selectedPlan, result)}
                                      disabled={savingFeedbackLeakId === leak.id}
                                      className={
                                        result === 'worked'
                                          ? 'border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-200'
                                          : result === 'partially'
                                            ? 'border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/15 text-amber-200'
                                            : 'border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/15 text-rose-200'
                                      }
                                    >
                                      {savingFeedbackLeakId === leak.id
                                        ? 'Сохраняю...'
                                        : result === 'worked'
                                          ? 'Отметить все как сработало'
                                          : result === 'partially'
                                            ? 'Отметить все как частично'
                                            : 'Отметить все как не помогло'}
                                    </Button>
                                  ))}
                                </div>
                                {sampleComment && (
                                  <div className="text-xs text-white/45">
                                    Комментарий для bulk возьмётся из первого шага: «{sampleComment}»
                                  </div>
                                )}
                              </div>
                            )
                          })()}
                          <div className="space-y-2">
                            {selectedPlan.actions.map((planAction, index) => {
                              const linkedEntity = getLinkedEntityForPlanAction(leak, planAction)
                              const feedback = feedbackByActionId.get(planAction.id)
                              const actionStage: 'plan' | 'entity' | 'feedback_worked' | 'feedback_partial' | 'feedback_failed' =
                                !linkedEntity
                                  ? 'plan'
                                  : !feedback
                                    ? 'entity'
                                    : feedback.result === 'worked'
                                      ? 'feedback_worked'
                                      : feedback.result === 'partially'
                                        ? 'feedback_partial'
                                        : 'feedback_failed'

                              return (
                                <div
                                  key={planAction.id}
                                  id={getPlanActionAnchorId(leak.id, planAction.id)}
                                  className={`rounded-xl border bg-white/[0.03] px-3 py-2 transition-colors ${
                                    focusedPlanActionId === planAction.id
                                      ? 'border-indigo-400/40 shadow-[0_0_0_1px_rgba(99,102,241,0.35)]'
                                      : 'border-white/10'
                                  }`}
                                >
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="outline" className="border-white/10 text-white/55">
                                      {index + 1}
                                    </Badge>
                                    <Badge variant="outline" className="border-white/10 text-white/55">
                                      {PLAN_KIND_LABELS[planAction.kind]}
                                    </Badge>
                                    <div className="text-sm text-white">{planAction.title}</div>
                                  </div>
                                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                                    <Badge
                                      className={
                                        actionStage === 'plan'
                                          ? 'bg-indigo-500/10 text-indigo-200 border-indigo-500/20'
                                          : 'bg-white/10 text-white/50 border-white/10'
                                      }
                                    >
                                      1. План
                                    </Badge>
                                    <span className="text-white/25">→</span>
                                    <Badge
                                      className={
                                        actionStage === 'entity' || actionStage.startsWith('feedback')
                                          ? 'bg-indigo-500/10 text-indigo-200 border-indigo-500/20'
                                          : 'bg-white/10 text-white/50 border-white/10'
                                      }
                                    >
                                      2. Сущность
                                    </Badge>
                                    <span className="text-white/25">→</span>
                                    <Badge
                                      className={
                                        actionStage === 'feedback_worked'
                                          ? 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20'
                                          : actionStage === 'feedback_partial'
                                            ? 'bg-amber-500/10 text-amber-200 border-amber-500/20'
                                            : actionStage === 'feedback_failed'
                                              ? 'bg-rose-500/10 text-rose-200 border-rose-500/20'
                                              : 'bg-white/10 text-white/50 border-white/10'
                                      }
                                    >
                                      3. Feedback
                                    </Badge>
                                  </div>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    <Badge className={PLAN_MODE_STYLES[selectedPlan.mode]}>
                                      {PLAN_MODE_LABELS[selectedPlan.mode]}
                                    </Badge>
                                    {linkedEntity ? (
                                      <Badge className="bg-indigo-500/10 text-indigo-200 border-indigo-500/20">
                                        Сущность: {getActionLabel(linkedEntity.entityType)} • {linkedEntity.label}
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-white/10 text-white/60 border-white/10">
                                        Сущность ещё не создана
                                      </Badge>
                                    )}
                                    {feedback ? (
                                      <Badge
                                        className={
                                          feedback.result === 'worked'
                                            ? 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20'
                                            : feedback.result === 'partially'
                                              ? 'bg-amber-500/10 text-amber-200 border-amber-500/20'
                                              : 'bg-rose-500/10 text-rose-200 border-rose-500/20'
                                        }
                                      >
                                        Feedback: {getFeedbackResultLabel(feedback.result)}
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-white/10 text-white/60 border-white/10">
                                        Feedback ещё не получен
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {!linkedEntity ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => applySinglePlanAction(leak, selectedPlan.mode, planAction)}
                                        disabled={applyingPlanActionId === planAction.id || applyingPlanLeakId === leak.id}
                                        className="border-indigo-500/20 bg-indigo-500/10 hover:bg-indigo-500/15 text-indigo-200"
                                      >
                                        {applyingPlanActionId === planAction.id ? 'Создаю...' : 'Создать шаг'}
                                      </Button>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setScreen(getActionScreen(linkedEntity.entityType))}
                                        className="border-white/15 bg-white/5 hover:bg-white/10 text-white"
                                      >
                                        Открыть сущность
                                      </Button>
                                    )}
                                    {linkedEntity && !feedback && (
                                      <>
                                        {(['worked', 'partially', 'not_worked'] as const).map((result) => (
                                          <Button
                                            key={result}
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                              sendPlanActionFeedback(
                                                leak.id,
                                                planAction.id,
                                                result,
                                                getFeedbackCommentDraft(planAction),
                                              )
                                            }
                                            disabled={savingFeedbackActionId === planAction.id}
                                            className="border-white/15 bg-white/5 hover:bg-white/10 text-white"
                                          >
                                            {result === 'worked'
                                              ? 'Сработало'
                                              : result === 'partially'
                                                ? 'Частично'
                                                : 'Не помогло'}
                                          </Button>
                                        ))}
                                      </>
                                    )}
                                    {feedback && feedback.result !== 'worked' && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          retryLeakPlanning(leak, {
                                            action: planAction,
                                            failureReason: feedback.comment || null,
                                          })
                                        }
                                        disabled={retryingLeakId === leak.id}
                                        className="border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/15 text-amber-200"
                                      >
                                        {retryingLeakId === leak.id
                                          ? 'Обновляю...'
                                          : leak.status === 'resolved' || leak.status === 'archived'
                                            ? 'Reopen и retry'
                                            : 'Retry по шагу'}
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {feedbackByAction.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-xs uppercase tracking-wide text-white/40">
                              История feedback
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setFeedbackHistoryFilterByLeak((current) => ({
                                    ...current,
                                    [leak.id]: 'all',
                                  }))
                                }
                                className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                                  feedbackHistoryFilter === 'all'
                                    ? 'border-indigo-400/30 bg-indigo-500/10 text-indigo-200'
                                    : 'border-white/10 bg-white/5 text-white/55 hover:bg-white/10'
                                }`}
                              >
                                Все
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setFeedbackHistoryFilterByLeak((current) => ({
                                    ...current,
                                    [leak.id]: 'problem',
                                  }))
                                }
                                className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                                  feedbackHistoryFilter === 'problem'
                                    ? 'border-amber-400/30 bg-amber-500/10 text-amber-200'
                                    : 'border-white/10 bg-white/5 text-white/55 hover:bg-white/10'
                                }`}
                              >
                                Проблемные
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(() => {
                              const recent = feedbackByAction.slice(0, 6)
                              const worked = recent.filter((item) => item.result === 'worked').length
                              const partial = recent.filter((item) => item.result === 'partially').length
                              const failed = recent.filter((item) => item.result === 'not_worked').length
                              const latestProblem = recent.find((item) => item.result !== 'worked') || null
                              return (
                                <>
                                  <Badge className="bg-white/10 text-white/70 border-white/10">
                                    Последние: {recent.length}
                                  </Badge>
                                  <Badge className="bg-emerald-500/10 text-emerald-200 border-emerald-500/20">
                                    Сработало: {worked}
                                  </Badge>
                                  <Badge className="bg-amber-500/10 text-amber-200 border-amber-500/20">
                                    Частично: {partial}
                                  </Badge>
                                  <Badge className="bg-rose-500/10 text-rose-200 border-rose-500/20">
                                    Не помогло: {failed}
                                  </Badge>
                                  {latestProblem && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        retryLeakPlanning(leak, {
                                          action: latestProblem.actionId ? planActionsById.get(latestProblem.actionId) || null : null,
                                          failureReason: latestProblem.comment || null,
                                        })
                                      }
                                      disabled={retryingLeakId === leak.id}
                                      className="border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/15 text-amber-200"
                                    >
                                      {retryingLeakId === leak.id ? 'Обновляю...' : 'Retry по последнему проблемному'}
                                    </Button>
                                  )}
                                </>
                              )
                            })()}
                          </div>
                          <div className="space-y-2">
                            {visibleFeedbackTimeline.length === 0 ? (
                              <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-xs text-white/55">
                                По текущему фильтру пока нет событий.
                              </div>
                            ) : visibleFeedbackTimeline.slice(0, 6).map((item) => {
                              const historyAction = item.actionId ? planActionsById.get(item.actionId) || null : null

                              return (
                                <div
                                  key={`${item.actionId || item.actionTitle}-${item.updatedAt}`}
                                  className="rounded-xl border border-white/10 bg-black/10 px-3 py-2"
                                >
                                  <div className="flex flex-wrap items-center gap-2">
                                    {item.mode ? (
                                      <Badge className={PLAN_MODE_STYLES[item.mode]}>
                                        {PLAN_MODE_LABELS[item.mode]}
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="border-white/10 text-white/55">
                                        Режим не задан
                                      </Badge>
                                    )}
                                    <Badge variant="outline" className="border-white/10 text-white/55">
                                      {PLAN_KIND_LABELS[item.actionKind]}
                                    </Badge>
                                    <Badge className="bg-white/10 text-white/70 border-white/10">
                                      Попытки: {item.attempts}
                                    </Badge>
                                    <Badge
                                      className={
                                        item.result === 'worked'
                                          ? 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20'
                                          : item.result === 'partially'
                                            ? 'bg-amber-500/10 text-amber-200 border-amber-500/20'
                                            : 'bg-rose-500/10 text-rose-200 border-rose-500/20'
                                      }
                                    >
                                      {getFeedbackResultLabel(item.result)}
                                    </Badge>
                                    <div className="text-xs text-white/40">{formatDate(item.updatedAt)}</div>
                                  </div>
                                  <div className="mt-1 text-sm text-white">{item.actionTitle}</div>
                                  {item.linkedEntity && (
                                    <div className="mt-1">
                                      <Badge className="bg-indigo-500/10 text-indigo-200 border-indigo-500/20 whitespace-normal text-left">
                                        Сущность: {getActionLabel(item.linkedEntity.entityType)} • {item.linkedEntity.label}
                                      </Badge>
                                    </div>
                                  )}
                                  {item.comment && <div className="mt-1 text-xs text-white/60">{item.comment}</div>}
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {item.actionId && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => focusPlanAction(leak.id, item.actionId)}
                                        className="border-white/15 bg-white/5 hover:bg-white/10 text-white"
                                      >
                                        К шагу
                                      </Button>
                                    )}
                                    {item.linkedEntity && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setScreen(getActionScreen(item.linkedEntity.entityType))}
                                        className="border-white/15 bg-white/5 hover:bg-white/10 text-white"
                                      >
                                        Открыть сущность
                                      </Button>
                                    )}
                                    {item.result !== 'worked' && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          retryLeakPlanning(leak, {
                                            action: historyAction,
                                            failureReason: item.comment || null,
                                          })
                                        }
                                        disabled={retryingLeakId === leak.id}
                                        className="border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/15 text-amber-200"
                                      >
                                        {retryingLeakId === leak.id ? 'Обновляю...' : 'Retry этого шага'}
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="text-xs uppercase tracking-wide text-white/40">
                          Что уже создано из лика
                        </div>
                        {leak.actions.length === 0 ? (
                          <p className="text-sm text-white/55">
                            Пока ничего. Можно превратить лик в задачу, ритуал или AI-челлендж.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {leak.actions.map((action) => (
                              (() => {
                                const metadata = getLeakActionMetadata(action)
                                const sourceActionId =
                                  typeof metadata?.sourceActionId === 'string' ? metadata.sourceActionId : null
                                const sourceActionTitle =
                                  typeof metadata?.sourceActionTitle === 'string'
                                    ? metadata.sourceActionTitle
                                    : null
                                const sourcePlanMode =
                                  typeof metadata?.sourcePlanMode === 'string'
                                    ? metadata.sourcePlanMode
                                    : null
                                const sourcePlanConfidenceLabel =
                                  typeof metadata?.sourcePlanConfidenceLabel === 'string'
                                    ? metadata.sourcePlanConfidenceLabel
                                    : null
                                const sourcePlanConfidenceReason =
                                  typeof metadata?.sourcePlanConfidenceReason === 'string'
                                    ? metadata.sourcePlanConfidenceReason
                                    : null
                                const sourcePlanSummary =
                                  typeof metadata?.sourcePlanSummary === 'string'
                                    ? metadata.sourcePlanSummary
                                    : null
                                const sourcePolicyCorrelationId =
                                  typeof metadata?.policyCorrelationId === 'string'
                                    ? metadata.policyCorrelationId
                                    : null
                                const feedback = sourceActionId ? feedbackByActionId.get(sourceActionId) : null
                                const sourcePlanAction = sourceActionId ? planActionsById.get(sourceActionId) || null : null

                                return (
                                  <div
                                    key={action.id}
                                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
                                  >
                                    <div className="space-y-1">
                                      <div className="text-sm text-white">
                                        {getActionLabel(action.entityType)}: {action.label}
                                      </div>
                                      <div className="text-xs text-white/40">
                                        Создано: {formatDate(action.createdAt)}
                                      </div>
                                      {(sourceActionTitle || sourcePlanMode || feedback) && (
                                        <div className="flex flex-wrap gap-2">
                                          {sourcePlanMode && (
                                            <Badge className="bg-white/10 text-white/65 border-white/10">
                                              Режим:{' '}
                                              {sourcePlanMode in PLAN_MODE_LABELS
                                                ? PLAN_MODE_LABELS[sourcePlanMode as LeakSolutionPlan['mode']]
                                                : sourcePlanMode}
                                            </Badge>
                                          )}
                                          {sourcePlanConfidenceLabel &&
                                            (sourcePlanConfidenceLabel === 'low' ||
                                              sourcePlanConfidenceLabel === 'medium' ||
                                              sourcePlanConfidenceLabel === 'high') && (
                                              <Badge className={PLAN_CONFIDENCE_STYLES[sourcePlanConfidenceLabel]}>
                                                Уверенность: {getConfidenceLabelText(sourcePlanConfidenceLabel)}
                                              </Badge>
                                            )}
                                          {sourceActionTitle && (
                                            <Badge className="bg-white/10 text-white/65 border-white/10">
                                              Действие: {sourceActionTitle}
                                            </Badge>
                                          )}
                                          {sourcePolicyCorrelationId && (
                                            <Badge className="bg-indigo-500/10 text-indigo-200 border-indigo-500/20">
                                              Policy-linked
                                            </Badge>
                                          )}
                                          {feedback && (
                                            <Badge
                                              className={
                                                feedback.result === 'worked'
                                                  ? 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20'
                                                  : feedback.result === 'partially'
                                                    ? 'bg-amber-500/10 text-amber-200 border-amber-500/20'
                                                    : 'bg-rose-500/10 text-rose-200 border-rose-500/20'
                                              }
                                            >
                                              Feedback: {getFeedbackResultLabel(feedback.result)}
                                            </Badge>
                                          )}
                                        </div>
                                      )}
                                      {feedback?.comment && (
                                        <div className="text-xs text-white/55">{feedback.comment}</div>
                                      )}
                                      {sourcePlanConfidenceReason && (
                                        <div className="text-xs text-white/55">{sourcePlanConfidenceReason}</div>
                                      )}
                                      {sourcePlanSummary && (
                                        <div className="text-xs text-white/55">План: {sourcePlanSummary}</div>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setScreen(getActionScreen(action.entityType))}
                                        className="border-white/15 bg-white/5 hover:bg-white/10 text-white"
                                      >
                                        Открыть
                                      </Button>
                                      {sourceActionId && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => focusPlanAction(leak.id, sourceActionId)}
                                          className="border-white/15 bg-white/5 hover:bg-white/10 text-white"
                                        >
                                          К шагу
                                        </Button>
                                      )}
                                      {sourceActionId && !feedback && (
                                        <>
                                          {(['worked', 'partially', 'not_worked'] as const).map((result) => (
                                            <Button
                                              key={`${action.id}-${result}`}
                                              size="sm"
                                              variant="outline"
                                              onClick={() =>
                                                sendPlanActionFeedback(
                                                  leak.id,
                                                  sourceActionId,
                                                  result,
                                                  getFeedbackCommentDraftByActionId(sourceActionId),
                                                )
                                              }
                                              disabled={savingFeedbackActionId === sourceActionId}
                                              className="border-white/15 bg-white/5 hover:bg-white/10 text-white"
                                            >
                                              {result === 'worked'
                                                ? 'Сработало'
                                                : result === 'partially'
                                                  ? 'Частично'
                                                  : 'Не помогло'}
                                            </Button>
                                          ))}
                                        </>
                                      )}
                                      {feedback && feedback.result !== 'worked' && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() =>
                                            retryLeakPlanning(leak, {
                                              action: sourcePlanAction,
                                              failureReason: feedback.comment || null,
                                            })
                                          }
                                          disabled={retryingLeakId === leak.id}
                                          className="border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/15 text-amber-200"
                                        >
                                          {retryingLeakId === leak.id ? 'Обновляю...' : 'Retry'}
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                )
                              })()
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs uppercase tracking-wide text-white/40">
                          Быстрый перевод без плана
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => convertLeakToTask(leak)}
                            disabled={actionLeakId === leak.id || hasActionType(leak, 'task')}
                            className="border-white/15 bg-white/5 hover:bg-white/10 text-white"
                          >
                            В задачу
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => convertLeakToRitual(leak)}
                            disabled={actionLeakId === leak.id || hasActionType(leak, 'ritual')}
                            className="border-white/15 bg-white/5 hover:bg-white/10 text-white"
                          >
                            В ритуал
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => convertLeakToChallenge(leak)}
                            disabled={actionLeakId === leak.id || hasActionType(leak, 'challenge')}
                            className="border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/15 text-amber-200"
                          >
                            AI-челлендж
                          </Button>
                        </div>
                        <p className="text-xs text-white/45">
                          Если не нужен целый режим, leak можно сразу превратить в одну понятную сущность.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-xs uppercase tracking-wide text-white/40">
                            Планы решения
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => generatePlansForLeak(leak.id, false)}
                              disabled={generatingPlansLeakId === leak.id}
                              className="border-indigo-500/20 bg-indigo-500/10 hover:bg-indigo-500/15 text-indigo-200"
                            >
                              {generatingPlansLeakId === leak.id ? 'Собираю...' : 'Сделать 3 плана'}
                            </Button>
                            {plansByLeak[leak.id]?.length > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => generatePlansForLeak(leak.id, true)}
                                disabled={generatingPlansLeakId === leak.id}
                                className="border-white/15 bg-white/5 hover:bg-white/10 text-white"
                              >
                                Пересобрать
                              </Button>
                            )}
                          </div>
                        </div>

                        {loadingPlansLeakId === leak.id ? (
                          <div className="space-y-2">
                            <Skeleton className="h-20 w-full rounded-2xl" />
                            <Skeleton className="h-20 w-full rounded-2xl" />
                          </div>
                        ) : plansByLeak[leak.id]?.length ? (
                          <div className="space-y-3">
                            <div className="rounded-xl border border-white/10 bg-black/10 p-3 space-y-2">
                              <div className="text-xs uppercase tracking-wide text-white/40">
                                Сравнение режимов
                              </div>
                              <div className="grid gap-2 md:grid-cols-3">
                                {plansByLeak[leak.id].map((plan) => (
                                  <div
                                    key={`compare-${plan.id}`}
                                    className={`rounded-lg border p-2 ${
                                      plan.isSelected
                                        ? 'border-indigo-500/30 bg-indigo-500/10'
                                        : 'border-white/10 bg-white/[0.03]'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <Badge className={PLAN_MODE_STYLES[plan.mode]}>
                                        {PLAN_MODE_LABELS[plan.mode]}
                                      </Badge>
                                      <Badge className={PLAN_CONFIDENCE_STYLES[plan.confidenceLabel]}>
                                        {getConfidenceLabelText(plan.confidenceLabel)}
                                      </Badge>
                                    </div>
                                    <div className="mt-2 text-xs text-white/60 line-clamp-3">{plan.summary}</div>
                                    <div className="mt-2 text-xs text-white/40">
                                      Действий: {plan.actions.length}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {plansByLeak[leak.id].map((plan) => (
                              <div
                                key={plan.id}
                                className={`rounded-2xl border p-3 ${
                                  plan.isSelected
                                    ? 'border-emerald-500/30 bg-emerald-500/10'
                                    : 'border-white/10 bg-white/[0.03]'
                                }`}
                              >
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <div className="space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Badge className={PLAN_MODE_STYLES[plan.mode]}>
                                        {PLAN_MODE_LABELS[plan.mode]}
                                      </Badge>
                                      <Badge className={PLAN_CONFIDENCE_STYLES[plan.confidenceLabel]}>
                                        Шанс: {plan.confidenceLabel}
                                      </Badge>
                                      {plan.isSelected && (
                                        <Badge className="bg-emerald-500/15 text-emerald-200 border-emerald-500/20">
                                          Выбран
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-white/85">{plan.summary}</p>
                                    {plan.confidenceReason && (
                                      <p className="text-xs text-white/50">{plan.confidenceReason}</p>
                                    )}
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => selectPlanMode(leak.id, plan.mode)}
                                    disabled={selectingPlanLeakId === leak.id || plan.isSelected}
                                    className="border-white/15 bg-white/5 hover:bg-white/10 text-white"
                                  >
                                    {plan.isSelected ? 'Текущий режим' : 'Выбрать'}
                                  </Button>
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => applySelectedPlan(leak, plan.mode)}
                                    disabled={
                                      applyingPlanLeakId === leak.id ||
                                      plan.actions.every((action) => isPlanActionConverted(action))
                                    }
                                    className="border-indigo-500/20 bg-indigo-500/10 hover:bg-indigo-500/15 text-indigo-200"
                                  >
                                    {applyingPlanLeakId === leak.id
                                      ? 'Применяю...'
                                      : plan.actions.every((action) => isPlanActionConverted(action))
                                        ? 'Режим уже применён'
                                        : 'Применить режим'}
                                  </Button>
                                  {plan.isSelected && (
                                    <Badge className="bg-white/10 text-white/70 border-white/10">
                                      Активный режим для этого лика
                                    </Badge>
                                  )}
                                </div>

                                <div className="mt-3 space-y-2">
                                  {plan.actions.map((action) => (
                                    <div
                                      key={action.id}
                                      className="rounded-xl border border-white/10 bg-black/10 px-3 py-2"
                                    >
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="outline" className="border-white/10 text-white/55">
                                          {PLAN_KIND_LABELS[action.kind]}
                                        </Badge>
                                        <div className="text-sm text-white">{action.title}</div>
                                        {isPlanActionConverted(action) && (
                                          <Badge className="bg-emerald-500/10 text-emerald-200 border-emerald-500/20">
                                            Создано
                                          </Badge>
                                        )}
                                      </div>
                                      {action.description && (
                                        <p className="mt-1 text-xs text-white/55">{action.description}</p>
                                      )}
                                      {isPlanActionConverted(action) && (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                              setScreen(
                                                getActionScreen(
                                                  action.payload?.convertedEntityType as LeakActionLink['entityType'],
                                                ),
                                              )
                                            }
                                            className="border-white/15 bg-white/5 hover:bg-white/10 text-white"
                                          >
                                            Открыть созданное
                                          </Button>
                                          <div className="text-xs text-white/40 self-center">
                                            {String(action.payload?.convertedEntityLabel || '')}
                                          </div>
                                        </div>
                                      )}
                                      {!isPlanActionConverted(action) && (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => applySinglePlanAction(leak, plan.mode, action)}
                                            disabled={applyingPlanActionId === action.id || applyingPlanLeakId === leak.id}
                                            className="border-indigo-500/20 bg-indigo-500/10 hover:bg-indigo-500/15 text-indigo-200"
                                          >
                                            {applyingPlanActionId === action.id ? 'Создаю...' : 'Создать отдельно'}
                                          </Button>
                                        </div>
                                      )}
                                      {isPlanActionConverted(action) && (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                          <Input
                                            value={getFeedbackCommentDraft(action)}
                                            onChange={(event) =>
                                              setFeedbackCommentByAction((current) => ({
                                                ...current,
                                                [action.id]: event.target.value,
                                              }))
                                            }
                                            placeholder="Почему это сработало или не помогло"
                                            className="h-9 min-w-[240px] bg-white/5 border-white/10 text-white placeholder:text-white/30"
                                          />
                                          {(['worked', 'partially', 'not_worked'] as const).map((result) => {
                                            const feedback = getActionFeedback(action)
                                            const isActive = feedback?.result === result
                                            const label =
                                              result === 'worked'
                                                ? 'Сработало'
                                                : result === 'partially'
                                                  ? 'Частично'
                                                  : 'Не помогло'

                                            return (
                                              <Button
                                                key={result}
                                                size="sm"
                                                variant="outline"
                                                onClick={() =>
                                                  sendPlanActionFeedback(
                                                    leak.id,
                                                    action.id,
                                                    result,
                                                    getFeedbackCommentDraft(action),
                                                  )
                                                }
                                                disabled={savingFeedbackActionId === action.id}
                                                className={
                                                  isActive
                                                    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                                                    : 'border-white/15 bg-white/5 hover:bg-white/10 text-white'
                                                }
                                              >
                                                {label}
                                              </Button>
                                            )
                                          })}
                                          {getActionFeedback(action) && (
                                            <div className="text-xs text-white/40 self-center">
                                              Последний фидбек: {formatDate(getActionFeedback(action)!.updatedAt)}
                                            </div>
                                          )}
                                          {getActionFeedback(action)?.result !== 'worked' && (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() =>
                                                retryLeakPlanning(leak, {
                                                  action,
                                                  failureReason: getActionFeedback(action)?.comment || null,
                                                })
                                              }
                                              disabled={retryingLeakId === leak.id}
                                              className="border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/15 text-amber-200"
                                            >
                                              {retryingLeakId === leak.id ? 'Обновляю...' : 'Нужен другой подход'}
                                            </Button>
                                          )}
                                          {getActionFeedback(action)?.result === 'worked' && leak.status !== 'resolved' && (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => updateLeakStatus(leak.id, 'resolved')}
                                              disabled={updatingLeakId === leak.id}
                                              className="border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-200"
                                            >
                                              Закрыть leak
                                            </Button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-white/55">
                            Здесь появятся режимы `minimum / base / maximum`, чтобы выбрать реалистичный план под текущую жизнь.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              </div>
              )
            })
          )}
        </TabsContent>

        <TabsContent value="signals" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/60">
              Сигналы, которые уже удалось вытащить из weekly data.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setScreen('weekly-report')}
              className="border-white/15 bg-white/5 hover:bg-white/10 text-white"
            >
              В недельный отчёт
            </Button>
          </div>

          {signals.length === 0 ? (
            <Card style={{ background: 'rgba(15,23,42,0.82)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <CardContent className="pt-6">
                <p className="text-sm text-white/60">
                  Пока мало данных для автосигналов. Здесь появятся найденные паттерны недели.
                </p>
              </CardContent>
            </Card>
          ) : (
            signals.map((signal, index) => (
              <Card
                key={`${signal.type}-${index}`}
                style={{
                  background: 'rgba(15,23,42,0.82)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <CardContent className="pt-4">
                  <div className="flex gap-3">
                    <div className="text-2xl">{signal.emoji}</div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge className={SEVERITY_STYLES[signal.severity]}>{signal.severity}</Badge>
                        {signal.days?.map((day) => (
                          <Badge key={day} variant="outline" className="border-white/10 text-white/55">
                            {day}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-sm text-white/75">{signal.message}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => createLeakFromSignal(signal)}
                          disabled={savingSignalKey === `${signal.type}:${signal.message}`}
                          className="border-white/15 bg-white/5 hover:bg-white/10 text-white"
                        >
                          Сохранить как leak
                        </Button>
                      </div>
                      <LeakAiAnalysisCard
                        userId={user.id}
                        leakType={signal.type}
                        leakMessage={signal.message}
                        severity={signal.severity}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <p className="text-sm text-white/60">
            Здесь накапливается история AI-разборов и то, что уже реально помогало.
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPatternFilter('all')}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                patternFilter === 'all'
                  ? 'border-indigo-400/30 bg-indigo-500/10 text-indigo-200'
                  : 'border-white/10 bg-white/5 text-white/55 hover:bg-white/10'
              }`}
            >
              Все ({patterns.length})
            </button>
            <button
              type="button"
              onClick={() => setPatternFilter('linked')}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                patternFilter === 'linked'
                  ? 'border-indigo-400/30 bg-indigo-500/10 text-indigo-200'
                  : 'border-white/10 bg-white/5 text-white/55 hover:bg-white/10'
              }`}
            >
              С активными leaks ({patterns.filter((item) => (item.activeLeakCount || 0) > 0).length})
            </button>
          </div>

          {visiblePatterns.length === 0 ? (
            <Card style={{ background: 'rgba(15,23,42,0.82)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <CardContent className="pt-6">
                <p className="text-sm text-white/60">
                  {patternFilter === 'linked'
                    ? 'Пока нет паттернов, у которых есть активные leaks в работе.'
                    : 'AI-паттерны появятся после первых разборов сигналов или ручных ликов.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            visiblePatterns.map((pattern) => (
              (() => {
                const activeLinkedLeaks =
                  Array.isArray(pattern.activeLeaks) && pattern.activeLeaks.length > 0
                    ? pattern.activeLeaks
                    : leaks
                        .filter(
                          (leak) =>
                            leak.status !== 'resolved' &&
                            leak.status !== 'archived' &&
                            normalizeLookupValue(leak.title) === normalizeLookupValue(pattern.leakType),
                        )
                        .map((leak) => ({
                          id: leak.id,
                          title: leak.title,
                          status: leak.status,
                          updatedAt: leak.updatedAt,
                          matchType: normalizeLookupValue(leak.title) === normalizeLookupValue(pattern.leakType)
                            ? 'exact'
                            : 'fuzzy',
                        }))
                const exactLinkedCount = activeLinkedLeaks.filter((leak) => leak.matchType === 'exact').length
                const fuzzyLinkedCount = activeLinkedLeaks.filter((leak) => leak.matchType === 'fuzzy').length

                return (
                  <Card key={pattern.leakType} style={{ background: 'rgba(15,23,42,0.82)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-white font-medium">{pattern.leakType}</div>
                          <div className="text-xs text-white/35 mt-1">
                            Последнее обновление: {formatDate(pattern.updatedAt)}
                          </div>
                        </div>
                        <Badge className="bg-white/10 text-white/75 border-white/10">
                          Анализов: {pattern.analysisCount}
                        </Badge>
                        {(pattern.workedCount || 0) > 0 && (
                          <Badge className="bg-emerald-500/10 text-emerald-200 border-emerald-500/20">
                            Сработало: {pattern.workedCount}
                          </Badge>
                        )}
                        {typeof pattern.activeLeakCount === 'number' && pattern.activeLeakCount > 0 && (
                          <Badge className="bg-indigo-500/10 text-indigo-200 border-indigo-500/20">
                            Активных leaks: {pattern.activeLeakCount}
                          </Badge>
                        )}
                        {typeof pattern.clusterSize === 'number' && pattern.clusterSize > 1 && (
                          <Badge className="bg-fuchsia-500/10 text-fuchsia-200 border-fuchsia-500/20">
                            Кластер: {pattern.clusterSize}
                          </Badge>
                        )}
                        {typeof pattern.clusterConfidence === 'number' && pattern.clusterSize && pattern.clusterSize > 1 && (
                          <Badge
                            className={
                              pattern.clusterConfidence >= 0.6
                                ? 'bg-indigo-500/10 text-indigo-200 border-indigo-500/20'
                                : 'bg-amber-500/10 text-amber-200 border-amber-500/20'
                            }
                          >
                            {pattern.clusterConfidence >= 0.6
                              ? `Cluster confidence: ${Math.round(pattern.clusterConfidence * 100)}%`
                              : `Низкая уверенность: ${Math.round(pattern.clusterConfidence * 100)}%`}
                          </Badge>
                        )}
                        {pattern.clusterConflict && pattern.clusterConflict !== 'none' && (
                          <Badge
                            className={
                              pattern.clusterConflict === 'high'
                                ? 'bg-rose-500/10 text-rose-200 border-rose-500/20'
                                : 'bg-amber-500/10 text-amber-200 border-amber-500/20'
                            }
                          >
                            {pattern.clusterConflict === 'high'
                              ? `Сильный конфликт: ${Math.round((pattern.clusterConflictRatio || 0) * 100)}%`
                              : `Смешанный конфликт: ${Math.round((pattern.clusterConflictRatio || 0) * 100)}%`}
                          </Badge>
                        )}
                        {typeof pattern.clusterWorkedCount === 'number' && pattern.clusterWorkedCount > 0 && (
                          <Badge className="bg-emerald-500/10 text-emerald-200 border-emerald-500/20">
                            Кластер worked: {pattern.clusterWorkedCount}
                          </Badge>
                        )}
                        {typeof pattern.clusterFailedCount === 'number' && pattern.clusterFailedCount > 0 && (
                          <Badge className="bg-rose-500/10 text-rose-200 border-rose-500/20">
                            Кластер failed: {pattern.clusterFailedCount}
                          </Badge>
                        )}
                        {exactLinkedCount > 0 && (
                          <Badge className="bg-indigo-500/10 text-indigo-200 border-indigo-500/20">
                            Exact: {exactLinkedCount}
                          </Badge>
                        )}
                        {fuzzyLinkedCount > 0 && (
                          <Badge className="bg-amber-500/10 text-amber-200 border-amber-500/20">
                            Fuzzy: {fuzzyLinkedCount}
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => createLeakFromPattern(pattern)}
                          disabled={savingPatternLeakType === pattern.leakType}
                          className="border-indigo-500/20 bg-indigo-500/10 hover:bg-indigo-500/15 text-indigo-200"
                        >
                          {savingPatternLeakType === pattern.leakType ? 'Сохраняю...' : 'В leak'}
                        </Button>
                      </div>
                      {pattern.clusterLeakTypes && pattern.clusterLeakTypes.length > 1 && (pattern.clusterSize || 0) >= 2 && (
                        <div className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/10 px-3 py-2">
                          <div className="text-xs uppercase tracking-wide text-fuchsia-100/80">
                            Learning cluster
                          </div>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {pattern.clusterLeakTypes.slice(0, 6).map((item) => (
                              <Badge
                                key={`${pattern.leakType}-cluster-${item}`}
                                className="bg-white/10 text-white/80 border-white/10"
                              >
                                {item}
                              </Badge>
                            ))}
                          </div>
                          {pattern.clusterWorkedExamples && pattern.clusterWorkedExamples.length > 0 && (
                            <div className="mt-2 text-xs text-emerald-100/90">
                              Worked в кластере: {pattern.clusterWorkedExamples.slice(0, 3).join(' • ')}
                            </div>
                          )}
                          {pattern.clusterFailedExamples && pattern.clusterFailedExamples.length > 0 && (
                            <div className="mt-1 text-xs text-rose-100/90">
                              Failed в кластере: {pattern.clusterFailedExamples.slice(0, 3).join(' • ')}
                            </div>
                          )}
                          {pattern.clusterConflict && pattern.clusterConflict !== 'none' && (
                            <div className="mt-1 text-xs text-amber-100/90">
                              Кластер даёт конфликтные сигналы: есть и worked, и failed. Подбирай режим аккуратно.
                            </div>
                          )}
                        </div>
                      )}

                      {activeLinkedLeaks.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs uppercase tracking-wide text-white/40">
                            Активные leaks по этому паттерну
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {activeLinkedLeaks.map((leak) => (
                              <Button
                                key={leak.id}
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setActiveTab('inbox')
                                  setStatusFilter('all')
                                  setExpandedLeakId(leak.id)
                                }}
                                className="border-white/15 bg-white/5 hover:bg-white/10 text-white"
                              >
                                {leak.title}
                                {leak.matchType === 'fuzzy' ? ' (fuzzy)' : ''}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      {pattern.workedExamples && pattern.workedExamples.length > 0 ? (
                        <div className="space-y-2">
                          <div className="text-xs uppercase tracking-wide text-white/40 flex items-center gap-2">
                            <Lightbulb className="w-3.5 h-3.5" />
                            Что уже сработало
                          </div>
                          <div className="space-y-2">
                            {pattern.workedExamples.map((item) => (
                              <div
                                key={`${pattern.leakType}-${item.text}-${item.updatedAt || 'na'}`}
                                className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2"
                              >
                                <div className="text-sm text-emerald-100">{item.text}</div>
                                <div className="mt-1 flex flex-wrap gap-2">
                                  {item.sourcePlanMode && (
                                    <Badge className="bg-white/10 text-white/70 border-white/10">
                                      Режим:{' '}
                                      {item.sourcePlanMode in PLAN_MODE_LABELS
                                        ? PLAN_MODE_LABELS[item.sourcePlanMode as LeakSolutionPlan['mode']]
                                        : item.sourcePlanMode}
                                    </Badge>
                                  )}
                                  {item.linkedEntityLabel && item.linkedEntityType && (
                                    <Badge className="bg-indigo-500/10 text-indigo-200 border-indigo-500/20">
                                      Сущность: {getActionLabel(item.linkedEntityType as LeakActionLink['entityType'])} • {item.linkedEntityLabel}
                                    </Badge>
                                  )}
                                  {item.updatedAt && (
                                    <Badge className="bg-white/10 text-white/65 border-white/10">
                                      Обновлено: {formatDate(item.updatedAt)}
                                    </Badge>
                                  )}
                                </div>
                                {item.comment && <div className="mt-1 text-xs text-emerald-100/80">{item.comment}</div>}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : pattern.whatWorked.length > 0 ? (
                        <div className="space-y-2">
                          <div className="text-xs uppercase tracking-wide text-white/40 flex items-center gap-2">
                            <Lightbulb className="w-3.5 h-3.5" />
                            Что уже сработало
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {pattern.whatWorked.map((item) => (
                              <Badge
                                key={item}
                                className="bg-emerald-500/10 text-emerald-200 border-emerald-500/20 whitespace-normal text-left"
                              >
                                {item}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-white/55">
                          Пока нет отмеченных решений, которые пользователь подтвердил как рабочие.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )
              })()
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

