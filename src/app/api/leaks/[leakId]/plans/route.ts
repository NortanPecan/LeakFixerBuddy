import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireSelf } from '@/lib/server-auth'
import { generateLeakPlans, type LeakPlanMode } from '@/lib/ai-leak-plan'

const PLAN_MODE_ORDER: LeakPlanMode[] = ['minimum', 'base', 'maximum']

const SelectPlanSchema = z.object({
  userId: z.string().min(1),
  mode: z.enum(['minimum', 'base', 'maximum']),
})

const GeneratePlansSchema = z.object({
  userId: z.string().min(1),
  regenerate: z.boolean().optional(),
  retryActionId: z.string().min(1).optional(),
  retryActionTitle: z.string().min(1).optional(),
  retryActionKind: z.string().min(1).optional(),
  retryFailureReason: z.string().min(1).optional(),
})

const CONTEXT_LOOKBACK_DAYS = 7
const PLAN_MODE_SET = new Set<LeakPlanMode>(PLAN_MODE_ORDER)
const DRIFT_METRIC_KEYS = [
  'energyAvg',
  'stressAvg',
  'sleepHoursAvg',
  'openTasks',
  'feedbackFailedCount',
  'feedbackWorkedCount',
  'recentFeedbackNegativeShare',
  'recentFeedbackWorkedShare',
] as const

type DriftMetricKey = (typeof DRIFT_METRIC_KEYS)[number]

type NextBestAction = {
  type: 'generate' | 'create_entity' | 'give_feedback' | 'retry' | 'switch_mode' | 'regenerate_context'
  reason: string
  actionId?: string | null
  targetMode?: LeakPlanMode | null
  confidence: 'low' | 'medium' | 'high'
}

type ContextDrift = {
  isStale: boolean
  score: number
  changedMetrics: Array<{
    key: DriftMetricKey
    before: number
    now: number
    deltaPct: number
  }>
  generatedAt: string | null
  checkedAt: string
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function toMode(value: unknown): LeakPlanMode | null {
  if (value !== 'minimum' && value !== 'base' && value !== 'maximum') return null
  return value as LeakPlanMode
}

function getLiveMetrics(snapshot: Record<string, unknown>) {
  const live = toRecord(snapshot.live)
  return toRecord(live.metrics)
}

function getNumericMetricsSubset(metrics: Record<string, unknown>) {
  const subset: Partial<Record<DriftMetricKey, number>> = {}
  DRIFT_METRIC_KEYS.forEach((key) => {
    const value = metrics[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      subset[key] = Number(value.toFixed(2))
    }
  })
  return subset
}

function normalizeSnapshot(snapshot: unknown): Record<string, unknown> {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    return {}
  }

  return snapshot as Record<string, unknown>
}

function getSnapshotMode(snapshot: Record<string, unknown>, key: string): LeakPlanMode | null {
  const raw = snapshot[key]
  if (typeof raw !== 'string') return null
  return PLAN_MODE_SET.has(raw as LeakPlanMode) ? (raw as LeakPlanMode) : null
}

function toNumber(value: unknown): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null
  return value
}

function avg(values: Array<number | null | undefined>) {
  const normalized = values.filter((item): item is number => typeof item === 'number')
  if (normalized.length === 0) return null
  return Number((normalized.reduce((sum, item) => sum + item, 0) / normalized.length).toFixed(1))
}

function startOfLookbackWindow(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - (days - 1))
  date.setHours(0, 0, 0, 0)
  return date
}

async function buildLiveLeakContext(userId: string, leakId: string) {
  const since = startOfLookbackWindow(CONTEXT_LOOKBACK_DAYS)

  const [dailyStates, foodEntries, fitnessDays, transactions, emotionLogs, activeSupplementsCount, supplementIntakeCheckedCount, workoutCount, ritualCount, checkins, doneTasksCount, openTasksCount, linkedEntities, feedbackRows, totalPlanActionsCount, totalFeedbackCount, workedFeedbackCount, partialFeedbackCount, failedFeedbackCount] =
    await Promise.all([
      db.dailyState.findMany({
        where: { userId, date: { gte: since } },
        orderBy: { date: 'desc' },
        take: CONTEXT_LOOKBACK_DAYS,
        select: {
          mood: true,
          energy: true,
          stress: true,
          sleepHours: true,
          sleepQuality: true,
        },
      }),
      db.foodEntry.findMany({
        where: { userId, date: { gte: since } },
        orderBy: { date: 'desc' },
        take: 60,
        select: {
          calories: true,
          quality: true,
        },
      }),
      db.fitnessDaily.findMany({
        where: { userId, date: { gte: since } },
        orderBy: { date: 'desc' },
        take: CONTEXT_LOOKBACK_DAYS,
        select: {
          water: true,
          waterTarget: true,
        },
      }),
      db.transaction.findMany({
        where: { userId, date: { gte: since } },
        orderBy: { date: 'desc' },
        take: 120,
        select: {
          amount: true,
          date: true,
        },
      }),
      db.emotionLog.findMany({
        where: {
          userId,
          createdAt: { gte: since },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 120,
        select: {
          emotion: true,
          intensity: true,
        },
      }),
      db.supplement.count({
        where: {
          userId,
          isActive: true,
        },
      }),
      db.supplementIntake.count({
        where: {
          userId,
          checked: true,
          date: { gte: since },
        },
      }),
      db.gymWorkout.count({
        where: { period: { userId }, date: { gte: since }, completed: true },
      }),
      db.ritualCompletion.count({
        where: { userId, date: { gte: since }, completed: true },
      }),
      db.dailyCheckin.findMany({
        where: { userId, date: { gte: since } },
        orderBy: { date: 'desc' },
        take: CONTEXT_LOOKBACK_DAYS * 2,
        select: {
          type: true,
          dayRating: true,
          energy: true,
        },
      }),
      db.task.count({
        where: {
          userId,
          status: 'done',
          updatedAt: { gte: since },
        },
      }),
      db.task.count({
        where: {
          userId,
          status: 'todo',
        },
      }),
      db.leakActionLink.findMany({
        where: { leakId },
        orderBy: { createdAt: 'desc' },
        take: 24,
        select: {
          entityType: true,
          label: true,
          metadata: true,
          createdAt: true,
        },
      }),
      db.leakFeedback.findMany({
        where: { leakId },
        orderBy: { updatedAt: 'desc' },
        take: 24,
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
      }),
      db.leakSolutionAction.count({
        where: {
          plan: {
            leakId,
          },
        },
      }),
      db.leakFeedback.count({
        where: { leakId },
      }),
      db.leakFeedback.count({
        where: { leakId, result: 'worked' },
      }),
      db.leakFeedback.count({
        where: { leakId, result: 'partially' },
      }),
      db.leakFeedback.count({
        where: { leakId, result: 'not_worked' },
      }),
    ])

  const morningCheckins = checkins.filter((item) => item.type === 'morning')
  const eveningCheckins = checkins.filter((item) => item.type === 'evening')
  const waterAvg = avg(fitnessDays.map((item) => toNumber(item.water)))
  const waterTargetAvg = avg(fitnessDays.map((item) => toNumber(item.waterTarget)))
  const waterGoalHitRate =
    fitnessDays.length > 0
      ? Number(
          (
            (fitnessDays.filter((item) => (item.water || 0) >= (item.waterTarget || 0)).length /
              fitnessDays.length) *
            100
          ).toFixed(0),
        )
      : null
  const expenseSum = Number(
    Math.abs(
      transactions
        .filter((item) => item.amount < 0)
        .reduce((sum, item) => sum + item.amount, 0),
    ).toFixed(2),
  )
  const incomeSum = Number(
    transactions
      .filter((item) => item.amount > 0)
      .reduce((sum, item) => sum + item.amount, 0)
      .toFixed(2),
  )
  const netCashflow = Number((incomeSum - expenseSum).toFixed(2))
  const expenseDays = new Set(
    transactions
      .filter((item) => item.amount < 0)
      .map((item) => item.date.toISOString().slice(0, 10)),
  ).size
  const supplementAdherenceRate =
    activeSupplementsCount > 0
      ? Number(
          Math.min(
            100,
            ((supplementIntakeCheckedCount / (activeSupplementsCount * CONTEXT_LOOKBACK_DAYS)) * 100),
          ).toFixed(0),
        )
      : null
  const emotionIntensityAvg = avg(emotionLogs.map((item) => toNumber(item.intensity)))
  const negativeEmotionCount = emotionLogs.filter((item) =>
    ['anxiety', 'anger', 'sad'].includes(String(item.emotion || '').toLowerCase()),
  ).length
  const negativeEmotionShare =
    emotionLogs.length > 0
      ? Number(((negativeEmotionCount / emotionLogs.length) * 100).toFixed(0))
      : null
  const feedbackCoverageRate =
    totalPlanActionsCount > 0
      ? Number(((totalFeedbackCount / totalPlanActionsCount) * 100).toFixed(0))
      : null
  const latestFeedback = feedbackRows[0] || null
  const recentFeedbackWindow = feedbackRows.slice(0, 3)
  const recentFeedbackNegativeShare =
    recentFeedbackWindow.length > 0
      ? Number(
          (
            (recentFeedbackWindow.filter((item) => item.result === 'not_worked').length /
              recentFeedbackWindow.length) *
            100
          ).toFixed(0),
        )
      : null
  const recentFeedbackWorkedShare =
    recentFeedbackWindow.length > 0
      ? Number(
          (
            (recentFeedbackWindow.filter((item) => item.result === 'worked').length /
              recentFeedbackWindow.length) *
            100
          ).toFixed(0),
        )
      : null

  return {
    generatedAt: new Date().toISOString(),
    lookbackDays: CONTEXT_LOOKBACK_DAYS,
    metrics: {
      moodAvg: avg(dailyStates.map((item) => toNumber(item.mood))),
      energyAvg: avg(dailyStates.map((item) => toNumber(item.energy))),
      stressAvg: avg(dailyStates.map((item) => toNumber(item.stress))),
      sleepHoursAvg: avg(dailyStates.map((item) => toNumber(item.sleepHours))),
      sleepQualityAvg: avg(dailyStates.map((item) => toNumber(item.sleepQuality))),
      mealsLogged: foodEntries.length,
      mealsWithBadQuality: foodEntries.filter((item) => String(item.quality || '') === 'bad').length,
      caloriesAvg: avg(foodEntries.map((item) => toNumber(item.calories))),
      workoutsCompleted: workoutCount,
      ritualsCompleted: ritualCount,
      waterAvg,
      waterTargetAvg,
      waterGoalHitRate,
      expenseSum7d: expenseSum,
      incomeSum7d: incomeSum,
      netCashflow7d: netCashflow,
      expenseDays7d: expenseDays,
      activeSupplements: activeSupplementsCount,
      supplementIntakeChecked7d: supplementIntakeCheckedCount,
      supplementAdherenceRate,
      emotionLogsCount7d: emotionLogs.length,
      emotionIntensityAvg,
      negativeEmotionShare,
      morningCheckins: morningCheckins.length,
      eveningCheckins: eveningCheckins.length,
      dayRatingAvg: avg(eveningCheckins.map((item) => toNumber(item.dayRating))),
      plannedEnergyAvg: avg(morningCheckins.map((item) => toNumber(item.energy))),
      doneTasks: doneTasksCount,
      openTasks: openTasksCount,
      planActionsTotal: totalPlanActionsCount,
      linkedEntitiesTotal: linkedEntities.length,
      feedbackGivenTotal: totalFeedbackCount,
      feedbackCoverageRate,
      feedbackWorkedCount: workedFeedbackCount,
      feedbackPartiallyCount: partialFeedbackCount,
      feedbackFailedCount: failedFeedbackCount,
      latestFeedbackResult: latestFeedback?.result || null,
      latestFeedbackAt: latestFeedback?.updatedAt.toISOString() || null,
      latestFeedbackActionTitle: latestFeedback?.solutionAction.title || null,
      recentFeedbackWindowSize: recentFeedbackWindow.length,
      recentFeedbackNegativeShare,
      recentFeedbackWorkedShare,
    },
    history: {
      linkedEntities: linkedEntities.map((item) => {
        const metadata =
          item.metadata && typeof item.metadata === 'object' && !Array.isArray(item.metadata)
            ? (item.metadata as Record<string, unknown>)
            : {}

        return {
          entityType: item.entityType,
          label: item.label,
          sourceActionTitle:
            typeof metadata.sourceActionTitle === 'string' ? metadata.sourceActionTitle : null,
          sourceActionKind:
            typeof metadata.sourceActionKind === 'string' ? metadata.sourceActionKind : null,
          sourcePlanMode:
            typeof metadata.sourcePlanMode === 'string' ? metadata.sourcePlanMode : null,
          createdAt: item.createdAt.toISOString(),
        }
      }),
      actionFeedback: feedbackRows.map((item) => ({
        actionTitle: item.solutionAction.title,
        actionKind: item.solutionAction.kind,
        result: item.result,
        comment: item.comment,
        updatedAt: item.updatedAt.toISOString(),
      })),
    },
  }
}

async function getLeakForUser(leakId: string, userId: string) {
  const leak = await db.leak.findUnique({
    where: { id: leakId },
    select: {
      id: true,
      userId: true,
      title: true,
      description: true,
      severity: true,
      sphere: true,
      contextSnapshot: true,
    },
  })

  if (!leak) {
    return { error: NextResponse.json({ error: 'Leak not found' }, { status: 404 }) }
  }

  if (leak.userId !== userId) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { leak }
}

async function resolveRetryFocus(
  leakId: string,
  input: {
    retryActionId?: string
    retryActionTitle?: string
    retryActionKind?: string
    retryFailureReason?: string
  },
) {
  const fallback =
    input.retryActionTitle && input.retryActionTitle.trim().length > 0
      ? {
          actionId: input.retryActionId || null,
          actionTitle: input.retryActionTitle.trim(),
          actionKind: input.retryActionKind || null,
          failureReason: input.retryFailureReason || null,
        }
      : null

  if (!input.retryActionId) return fallback

  const action = await db.leakSolutionAction.findUnique({
    where: { id: input.retryActionId },
    include: {
      plan: {
        select: {
          leakId: true,
          mode: true,
        },
      },
      feedbacks: {
        where: { leakId },
        orderBy: [
          { updatedAt: 'desc' },
          { createdAt: 'desc' },
        ],
        take: 1,
        select: {
          comment: true,
        },
      },
    },
  })

  if (!action || action.plan.leakId !== leakId) return fallback

  return {
    actionId: action.id,
    actionTitle: action.title,
    actionKind: action.kind,
    failureReason: input.retryFailureReason || action.feedbacks[0]?.comment || null,
  }
}

async function loadPlans(leakId: string) {
  return db.leakSolutionPlan.findMany({
    where: { leakId },
    include: {
      actions: {
        include: {
          feedbacks: {
            orderBy: [
              { updatedAt: 'desc' },
              { createdAt: 'desc' },
            ],
          },
        },
        orderBy: [
          { sortOrder: 'asc' },
          { createdAt: 'asc' },
        ],
      },
    },
    orderBy: [
      { isSelected: 'desc' },
      { createdAt: 'asc' },
    ],
  })
}

function getLatestActionFeedback(action: Awaited<ReturnType<typeof loadPlans>>[number]['actions'][number]) {
  return action.feedbacks?.[0] || null
}

function selectPlan(
  plans: Awaited<ReturnType<typeof loadPlans>>,
  snapshot: Record<string, unknown>,
) {
  const selectedByFlag = plans.find((plan) => plan.isSelected) || null
  if (selectedByFlag) return selectedByFlag
  const selectedBySnapshot = toMode(snapshot.selectedPlanMode)
    ? plans.find((plan) => plan.mode === snapshot.selectedPlanMode) || null
    : null
  return selectedBySnapshot || plans[0] || null
}

function buildContextDrift(
  snapshot: Record<string, unknown>,
  currentLive: Awaited<ReturnType<typeof buildLiveLeakContext>>,
): ContextDrift {
  const baseline = toRecord(snapshot.planGenerationBaseline)
  const baselineMetrics = toRecord(baseline.metrics)
  const currentMetrics = currentLive.metrics && typeof currentLive.metrics === 'object'
    ? (currentLive.metrics as Record<string, unknown>)
    : {}

  const changedMetrics: ContextDrift['changedMetrics'] = []
  DRIFT_METRIC_KEYS.forEach((key) => {
    const before = baselineMetrics[key]
    const now = currentMetrics[key]
    if (typeof before !== 'number' || typeof now !== 'number') return
    const denominator = Math.max(Math.abs(before), 1)
    const deltaPct = Number((((now - before) / denominator) * 100).toFixed(1))
    if (Math.abs(deltaPct) >= 25) {
      changedMetrics.push({
        key,
        before: Number(before.toFixed(2)),
        now: Number(now.toFixed(2)),
        deltaPct,
      })
    }
  })

  changedMetrics.sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct))
  const top = changedMetrics.slice(0, 4)
  const avgDelta =
    top.length > 0
      ? top.reduce((sum, item) => sum + Math.abs(item.deltaPct), 0) / top.length
      : 0
  const score = clamp(Math.round(avgDelta * 1.2), 0, 100)
  const isStale = top.length >= 3 || top.some((item) => Math.abs(item.deltaPct) >= 60)

  return {
    isStale,
    score,
    changedMetrics: top,
    generatedAt: typeof baseline.capturedAt === 'string' ? baseline.capturedAt : null,
    checkedAt: new Date().toISOString(),
  }
}

function buildNextBestAction(
  plans: Awaited<ReturnType<typeof loadPlans>>,
  snapshot: Record<string, unknown>,
  drift: ContextDrift,
): NextBestAction | null {
  if (!plans.length) {
    return {
      type: 'generate',
      reason: 'Для лика ещё нет режимов. Сначала сгенерируй 3 плана.',
      confidence: 'high',
    }
  }

  if (drift.isStale) {
    return {
      type: 'regenerate_context',
      reason: `Контекст заметно изменился (drift ${drift.score}%). Лучше пересобрать планы.`,
      confidence: 'high',
    }
  }

  const selectedPlan = selectPlan(plans, snapshot)
  if (!selectedPlan) return null

  const firstNoEntity = selectedPlan.actions.find((action) => {
    const payload = toRecord(action.payload)
    return !(typeof payload.convertedEntityId === 'string' && payload.convertedEntityId)
  }) || null
  if (firstNoEntity) {
    return {
      type: 'create_entity',
      actionId: firstNoEntity.id,
      reason: `Сначала создай сущность для шага «${firstNoEntity.title}», чтобы запустить цикл выполнения.`,
      confidence: 'high',
    }
  }

  const firstNoFeedback = selectedPlan.actions.find((action) => !getLatestActionFeedback(action)) || null
  if (firstNoFeedback) {
    return {
      type: 'give_feedback',
      actionId: firstNoFeedback.id,
      reason: `По шагу «${firstNoFeedback.title}» нет feedback. Закрой обратную связь.`,
      confidence: 'high',
    }
  }

  const recentFeedback = selectedPlan.actions
    .map((action) => ({ action, feedback: getLatestActionFeedback(action) }))
    .filter((item): item is { action: typeof selectedPlan.actions[number]; feedback: NonNullable<ReturnType<typeof getLatestActionFeedback>> } => Boolean(item.feedback))
    .sort((a, b) => new Date(b.feedback.updatedAt).getTime() - new Date(a.feedback.updatedAt).getTime())
    .slice(0, 4)
  const failedRecent = recentFeedback.filter((item) => item.feedback.result === 'not_worked').length
  const workedRecent = recentFeedback.filter((item) => item.feedback.result === 'worked').length

  if (failedRecent >= 2 && selectedPlan.mode !== 'minimum') {
    return {
      type: 'switch_mode',
      targetMode: 'minimum',
      reason: 'В свежих feedback много сбоев. Временно упрости режим до minimum.',
      confidence: 'medium',
    }
  }
  if (workedRecent >= 3 && selectedPlan.mode === 'minimum') {
    return {
      type: 'switch_mode',
      targetMode: 'base',
      reason: 'Последние шаги стабильно срабатывают. Можно расширить до base.',
      confidence: 'medium',
    }
  }

  const failedAction = recentFeedback.find((item) => item.feedback.result === 'not_worked') || null
  if (failedAction) {
    return {
      type: 'retry',
      actionId: failedAction.action.id,
      reason: `Последний проблемный шаг — «${failedAction.action.title}». Запусти retry.`,
      confidence: 'medium',
    }
  }

  return {
    type: 'give_feedback',
    actionId: selectedPlan.actions[0]?.id || null,
    reason: 'Поддерживай цикл: по новым шагам сразу фиксируй результат.',
    confidence: 'low',
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ leakId: string }> },
) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const { leakId } = await context.params

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const auth = requireSelf(request, userId)
    if ('error' in auth) return auth.error

    const target = await getLeakForUser(leakId, userId)
    if ('error' in target) return target.error

    const plans = await loadPlans(leakId)
    const previousSnapshot = normalizeSnapshot(target.leak.contextSnapshot)
    const liveContext = await buildLiveLeakContext(userId, leakId)
    const contextDrift = buildContextDrift(previousSnapshot, liveContext)
    const nextBestAction = buildNextBestAction(plans, previousSnapshot, contextDrift)
    return NextResponse.json({ plans, nextBestAction, contextDrift })
  } catch (error) {
    console.error('Error fetching leak plans:', error)
    return NextResponse.json({ error: 'Failed to fetch leak plans' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ leakId: string }> },
) {
  try {
    const body = await request.json()
    const parsed = GeneratePlansSchema.safeParse(body)
    const { leakId } = await context.params

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid plan generation payload', issues: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const {
      userId,
      regenerate,
      retryActionId,
      retryActionTitle,
      retryActionKind,
      retryFailureReason,
    } = parsed.data

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const auth = requireSelf(request, userId)
    if ('error' in auth) return auth.error

    const target = await getLeakForUser(leakId, userId)
    if ('error' in target) return target.error

    if (!regenerate) {
      const existingPlans = await loadPlans(leakId)
      if (existingPlans.length > 0) {
        const previousSnapshot = normalizeSnapshot(target.leak.contextSnapshot)
        const liveContext = await buildLiveLeakContext(userId, leakId)
        const contextDrift = buildContextDrift(previousSnapshot, liveContext)
        const nextBestAction = buildNextBestAction(existingPlans, previousSnapshot, contextDrift)
        return NextResponse.json({ plans: existingPlans, cached: true, nextBestAction, contextDrift })
      }
    }

    const retryFocus = await resolveRetryFocus(leakId, {
      retryActionId,
      retryActionTitle,
      retryActionKind,
      retryFailureReason,
    })

    const previousSnapshot = normalizeSnapshot(target.leak.contextSnapshot)
    const liveContext = await buildLiveLeakContext(userId, leakId)
    const selectedPlanMode = getSnapshotMode(previousSnapshot, 'selectedPlanMode') || 'base'
    const mergedSnapshot = {
      ...previousSnapshot,
      live: liveContext,
      history: liveContext.history,
      selectedPlanMode,
      planGenerationBaseline: {
        capturedAt: new Date().toISOString(),
        metrics: getNumericMetricsSubset(liveContext.metrics as Record<string, unknown>),
      },
      retry: retryFocus
        ? {
            actionId: retryFocus.actionId || null,
            actionTitle: retryFocus.actionTitle,
            actionKind: retryFocus.actionKind || null,
            failureReason: retryFocus.failureReason || null,
            requestedAt: new Date().toISOString(),
          }
        : null,
      contextUpdatedAt: new Date().toISOString(),
    }

    await db.leak.update({
      where: { id: leakId },
      data: {
        contextSnapshot: mergedSnapshot,
      },
    })

    const { plans, provider } = await generateLeakPlans({
      userId,
      leak: {
        ...target.leak,
        contextSnapshot: mergedSnapshot,
      },
      retryFocus,
    })

    await db.$transaction(async (tx) => {
      const existing = await tx.leakSolutionPlan.findMany({
        where: { leakId },
        select: { id: true },
      })

      if (existing.length > 0) {
        await tx.leakSolutionAction.deleteMany({
          where: { planId: { in: existing.map((plan) => plan.id) } },
        })
        await tx.leakSolutionPlan.deleteMany({
          where: { leakId },
        })
      }

      for (const mode of PLAN_MODE_ORDER) {
        const plan = plans.find((item) => item.mode === mode)
        if (!plan) continue

        await tx.leakSolutionPlan.create({
          data: {
            leakId,
            mode: plan.mode,
            summary: plan.summary,
            confidenceLabel: plan.confidenceLabel,
            confidenceReason: plan.confidenceReason,
            isSelected: plan.mode === selectedPlanMode,
            source: provider,
            actions: {
              create: plan.actions.map((action, index) => ({
                kind: action.kind,
                title: action.title,
                description: action.description ?? null,
                payload: action.payload ?? null,
                sortOrder: index,
              })),
            },
          },
        })
      }
    })

    const storedPlans = await loadPlans(leakId)
    const contextDrift = buildContextDrift(mergedSnapshot, liveContext)
    const nextBestAction = buildNextBestAction(storedPlans, mergedSnapshot, contextDrift)
    return NextResponse.json({ plans: storedPlans, provider, cached: false, nextBestAction, contextDrift })
  } catch (error) {
    console.error('Error generating leak plans:', error)
    return NextResponse.json({ error: 'Failed to generate leak plans' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ leakId: string }> },
) {
  try {
    const body = await request.json()
    const parsed = SelectPlanSchema.safeParse(body)
    const { leakId } = await context.params

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid plan selection payload', issues: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { userId, mode } = parsed.data

    const auth = requireSelf(request, userId)
    if ('error' in auth) return auth.error

    const target = await getLeakForUser(leakId, userId)
    if ('error' in target) return target.error

    await db.$transaction(async (tx) => {
      await tx.leakSolutionPlan.updateMany({
        where: { leakId },
        data: { isSelected: false },
      })

      await tx.leakSolutionPlan.updateMany({
        where: { leakId, mode },
        data: { isSelected: true },
      })

      const leakSnapshotSource = await tx.leak.findUnique({
        where: { id: leakId },
        select: { contextSnapshot: true },
      })
      const snapshot = normalizeSnapshot(leakSnapshotSource?.contextSnapshot)
      snapshot.selectedPlanMode = mode
      snapshot.contextUpdatedAt = new Date().toISOString()
      await tx.leak.update({
        where: { id: leakId },
        data: {
          contextSnapshot: snapshot,
        },
      })
    })

    const plans = await loadPlans(leakId)
    const leakState = await db.leak.findUnique({
      where: { id: leakId },
      select: { contextSnapshot: true },
    })
    const snapshot = normalizeSnapshot(leakState?.contextSnapshot)
    const liveContext = await buildLiveLeakContext(userId, leakId)
    const contextDrift = buildContextDrift(snapshot, liveContext)
    const nextBestAction = buildNextBestAction(plans, snapshot, contextDrift)
    return NextResponse.json({ plans, selectedMode: mode, nextBestAction, contextDrift })
  } catch (error) {
    console.error('Error selecting leak plan:', error)
    return NextResponse.json({ error: 'Failed to select leak plan' }, { status: 500 })
  }
}
