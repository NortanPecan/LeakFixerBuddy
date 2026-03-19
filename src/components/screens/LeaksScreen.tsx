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
  updatedAt: string
}

interface LeakDraft {
  leakType: string
  leakMessage: string
  severity: 'info' | 'warning' | 'critical'
}

type LeakStatusFilter = 'all' | 'new' | 'in_progress' | 'resolved' | 'archived'

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

function getContextSnapshotItems(contextSnapshot?: Record<string, unknown> | null) {
  if (!contextSnapshot) return []

  return Object.entries(contextSnapshot).flatMap(([key, value]) => {
    if (value === null || value === undefined || value === '') return []

    const label = key === 'days' ? 'Дни' : key

    if (Array.isArray(value)) {
      const normalized = value
        .map((item) => (typeof item === 'string' || typeof item === 'number' ? String(item) : null))
        .filter((item): item is string => Boolean(item))

      if (normalized.length === 0) return []
      return [`${label}: ${normalized.join(', ')}`]
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return [`${label}: ${String(value)}`]
    }

    return []
  })
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
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')
  const [severity, setSeverity] = useState<'info' | 'warning' | 'critical'>('warning')
  const [submitting, setSubmitting] = useState(false)
  const [selectedDraft, setSelectedDraft] = useState<LeakDraft | null>(null)
  const [updatingLeakId, setUpdatingLeakId] = useState<string | null>(null)
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
  const [savingPatternLeakType, setSavingPatternLeakType] = useState<string | null>(null)

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
      setSignals(Array.isArray(signalsData.leakHints) ? signalsData.leakHints : [])
      setPatterns(Array.isArray(patternsData.patterns) ? patternsData.patterns : [])
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
    if (statusFilter === 'all') return leaks
    return leaks.filter((leak) => leak.status === statusFilter)
  }, [leaks, statusFilter])

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

  const createLeak = async (prepareAnalysis: boolean) => {
    if (!user?.id || !hasDraft) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/leaks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          title: title.trim() || 'Новый лик',
          description: details.trim() || null,
          severity,
          source: 'manual',
        }),
      })

      if (!response.ok) {
        throw response
      }

      const data = await response.json()
      const createdLeak = normalizeLeak(data.leak as LeakEntity)

      setLeaks((current) => [createdLeak, ...current])
      setExpandedLeakId(createdLeak.id)
      setTitle('')
      setDetails('')
      setSeverity('warning')
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

  const updateLeakStatus = async (leakId: string, status: Exclude<LeakStatusFilter, 'all'>) => {
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
      showSuccessToast('Статус лика обновлён')
    } catch (error) {
      showErrorToast(error, 'update leak status')
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
    } catch (error) {
      showErrorToast(error, 'load leak plans')
    } finally {
      setLoadingPlansLeakId(null)
    }
  }

  const generatePlansForLeak = async (leakId: string, regenerate = false) => {
    if (!user?.id) return

    setGeneratingPlansLeakId(leakId)
    try {
      const response = await fetch(`/api/leaks/${leakId}/plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          regenerate,
        }),
      })

      if (!response.ok) throw response

      const data = await response.json()
      setPlansByLeak((current) => ({
        ...current,
        [leakId]: normalizePlans(data.plans || []),
      }))
      showSuccessToast(regenerate ? 'Планы пересобраны' : 'Планы для лика готовы')
    } catch (error) {
      showErrorToast(error, 'generate leak plans')
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
    }
  }

  const isPlanActionConverted = (action: LeakPlanAction) =>
    Boolean(action.payload?.convertedEntityId && action.payload?.convertedEntityType)

  const getActionFeedback = (action: LeakPlanAction) => action.feedbacks?.[0] || null

  const applySelectedPlan = async (leak: LeakEntity, mode?: LeakSolutionPlan['mode']) => {
    if (!user?.id) return

    setApplyingPlanLeakId(leak.id)
    try {
      const response = await fetch(`/api/leaks/${leak.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          mode,
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
      if (createdCount > 0) {
        showSuccessToast(
          skippedCount > 0
            ? `Применил режим: создано ${createdCount}, пропущено ${skippedCount}`
            : `Применил режим: создано ${createdCount}`,
        )
      } else {
        showSuccessToast('Новых сущностей не создано, всё уже было применено')
      }
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

    setApplyingPlanActionId(action.id)
    try {
      const response = await fetch(`/api/leaks/${leak.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          mode,
          actionId: action.id,
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
  ) => {
    if (!user?.id) return

    setSavingFeedbackActionId(actionId)
    try {
      const response = await fetch(`/api/leaks/${leakId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          solutionActionId: actionId,
          result,
        }),
      })

      if (!response.ok) throw response

      const data = await response.json()
      const nextPattern = data.pattern && typeof data.pattern.leakType === 'string'
        ? {
            leakType: data.pattern.leakType,
            analysisCount: typeof data.pattern.analysisCount === 'number' ? data.pattern.analysisCount : 0,
            whatWorked: Array.isArray(data.pattern.whatWorked)
              ? data.pattern.whatWorked.filter((item: unknown): item is string => typeof item === 'string')
              : [],
            updatedAt:
              typeof data.pattern.updatedAt === 'string'
                ? data.pattern.updatedAt
                : new Date().toISOString(),
          } satisfies LeakPattern
        : null
      setPlansByLeak((current) => ({
        ...current,
        [leakId]: normalizePlans(data.plans || []),
      }))
      if (nextPattern) {
        setPatterns((current) => {
          const filtered = current.filter((pattern) => pattern.leakType !== nextPattern.leakType)
          return [nextPattern, ...filtered]
        })
      }
      showSuccessToast('Фидбек по действию сохранён')
    } catch (error) {
      showErrorToast(error, 'save plan feedback')
    } finally {
      setSavingFeedbackActionId(null)
    }
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

    const normalizedLeakType = pattern.leakType.trim().toLowerCase()
    const existingLeak = leaks.find((leak) =>
      leak.title.trim().toLowerCase() === normalizedLeakType &&
      leak.status !== 'resolved' &&
      leak.status !== 'archived',
    )

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

          {filteredLeaks.length === 0 ? (
            <Card style={{ background: 'rgba(15,23,42,0.82)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <CardContent className="pt-6">
                <p className="text-sm text-white/60">
                  Здесь будут лежать сохранённые лики. У них теперь есть собственный lifecycle: новый, в работе, решён, архив.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredLeaks.map((leak) => (
              <Card key={leak.id} style={{ background: 'rgba(15,23,42,0.82)', border: '1px solid rgba(255,255,255,0.08)' }}>
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

                  {expandedLeakId === leak.id && (
                    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                      <div className="flex flex-wrap gap-2">
                        <Badge className="bg-white/10 text-white/75 border-white/10">
                          Источник: {getSourceLabel(leak.source)}
                        </Badge>
                        {leak.sphere && (
                          <Badge className="bg-white/10 text-white/75 border-white/10">
                            Сфера: {leak.sphere}
                          </Badge>
                        )}
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
                              <div
                                key={action.id}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
                              >
                                <div>
                                  <div className="text-sm text-white">
                                    {getActionLabel(action.entityType)}: {action.label}
                                  </div>
                                  <div className="text-xs text-white/40">
                                    Создано: {formatDate(action.createdAt)}
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setScreen(getActionScreen(action.entityType))}
                                  className="border-white/15 bg-white/5 hover:bg-white/10 text-white"
                                >
                                  Открыть
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
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
                                                onClick={() => sendPlanActionFeedback(leak.id, action.id, result)}
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
            ))
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

          {patterns.length === 0 ? (
            <Card style={{ background: 'rgba(15,23,42,0.82)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <CardContent className="pt-6">
                <p className="text-sm text-white/60">
                  AI-паттерны появятся после первых разборов сигналов или ручных ликов.
                </p>
              </CardContent>
            </Card>
          ) : (
            patterns.map((pattern) => (
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

                  {pattern.whatWorked.length > 0 ? (
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
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
