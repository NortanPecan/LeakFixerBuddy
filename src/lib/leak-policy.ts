export type LeakPlanMode = 'minimum' | 'base' | 'maximum'
export type LeakFeedbackResult = 'worked' | 'partially' | 'not_worked'

export type RunJournalEventType =
  | 'plan_generated'
  | 'mode_selected'
  | 'action_created'
  | 'feedback_saved'
  | 'retry_started'
  | 'retry_resolved'
  | 'policy_suggested'
  | 'policy_accepted'
  | 'policy_rejected'
  | 'policy_outcome'

export interface RunJournalEvent {
  type: RunJournalEventType
  at: string
  mode?: LeakPlanMode | null
  actionId?: string | null
  actionTitle?: string | null
  actionKind?: string | null
  result?: LeakFeedbackResult | null
  note?: string | null
  policyCorrelationId?: string | null
  policyActionType?: NextBestAction['type'] | null
  actor?: 'user' | 'system' | null
  decision?: 'accepted' | 'rejected' | null
  attempt?: number | null
  factors?: Array<{ key: string; weight: number; detail?: string }>
}

export interface PolicyPlanAction {
  id: string
  title: string
  kind: string
  payload?: unknown
  feedbacks?: Array<{
    result: LeakFeedbackResult
    updatedAt: string | Date
    comment?: string | null
  }>
}

export interface PolicyPlan {
  mode: LeakPlanMode
  isSelected?: boolean
  actions: PolicyPlanAction[]
}

export type DriftMetricKey =
  | 'energyAvg'
  | 'stressAvg'
  | 'sleepHoursAvg'
  | 'openTasks'
  | 'feedbackFailedCount'
  | 'feedbackWorkedCount'
  | 'recentFeedbackNegativeShare'
  | 'recentFeedbackWorkedShare'

const DRIFT_METRIC_KEYS: DriftMetricKey[] = [
  'energyAvg',
  'stressAvg',
  'sleepHoursAvg',
  'openTasks',
  'feedbackFailedCount',
  'feedbackWorkedCount',
  'recentFeedbackNegativeShare',
  'recentFeedbackWorkedShare',
]

export interface ContextDrift {
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

export interface NextBestAction {
  type: 'generate' | 'create_entity' | 'give_feedback' | 'retry' | 'switch_mode' | 'regenerate_context'
  reason: string
  actionId?: string | null
  targetMode?: LeakPlanMode | null
  confidence: 'low' | 'medium' | 'high'
  factors: Array<{ key: string; weight: number; detail?: string }>
  correlationId: string
}

export interface ExecutionScore {
  value: number
  breakdown: {
    createdCoverage: number
    feedbackCoverage: number
    workedShare: number
    attemptsPenalty: number
    driftPenalty: number
  }
}

export interface AdaptiveModeSuggestion {
  targetMode: LeakPlanMode
  reason: string
}

export interface LeakPolicyPayload {
  policyVersion: number
  computedAt: string
  selectedMode: LeakPlanMode | null
  nextBestAction: NextBestAction | null
  contextDrift: ContextDrift
  executionScore: ExecutionScore
  adaptiveModeSuggestion: AdaptiveModeSuggestion | null
}

export const LEAK_POLICY_VERSION = 2

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function makeCorrelationId() {
  return `policy_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

export function normalizeSnapshot(snapshot: unknown): Record<string, unknown> {
  return toRecord(snapshot)
}

export function getSnapshotMode(snapshot: Record<string, unknown>, key: string): LeakPlanMode | null {
  const raw = snapshot[key]
  if (raw !== 'minimum' && raw !== 'base' && raw !== 'maximum') return null
  return raw as LeakPlanMode
}

function getLatestFeedback(action: PolicyPlanAction) {
  return action.feedbacks?.[0] || null
}

function isConvertedAction(action: PolicyPlanAction) {
  const payload = toRecord(action.payload)
  return typeof payload.convertedEntityId === 'string' && payload.convertedEntityId.length > 0
}

function getSelectedPlan(plans: PolicyPlan[], snapshot: Record<string, unknown>) {
  const selected = plans.find((plan) => plan.isSelected) || null
  if (selected) return selected
  const snapshotMode = getSnapshotMode(snapshot, 'selectedPlanMode')
  if (snapshotMode) {
    return plans.find((plan) => plan.mode === snapshotMode) || null
  }
  return plans[0] || null
}

export function getNumericMetricsSubset(metrics: Record<string, unknown>) {
  const subset: Partial<Record<DriftMetricKey, number>> = {}
  DRIFT_METRIC_KEYS.forEach((key) => {
    const value = metrics[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      subset[key] = Number(value.toFixed(2))
    }
  })
  return subset
}

export function buildContextDrift(
  snapshot: Record<string, unknown>,
  currentLiveContext: { metrics?: Record<string, unknown> } | null | undefined,
): ContextDrift {
  const baseline = toRecord(snapshot.planGenerationBaseline)
  const baselineMetrics = toRecord(baseline.metrics)
  const currentMetrics =
    currentLiveContext?.metrics && typeof currentLiveContext.metrics === 'object'
      ? currentLiveContext.metrics
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
  const avgDelta = top.length > 0
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

export function computeExecutionScore(
  plans: PolicyPlan[],
  snapshot: Record<string, unknown>,
  drift: ContextDrift,
): ExecutionScore {
  const selectedPlan = getSelectedPlan(plans, snapshot)
  if (!selectedPlan) {
    return {
      value: 0,
      breakdown: {
        createdCoverage: 0,
        feedbackCoverage: 0,
        workedShare: 0,
        attemptsPenalty: 0,
        driftPenalty: 0,
      },
    }
  }

  const total = Math.max(selectedPlan.actions.length, 1)
  const createdCount = selectedPlan.actions.filter(isConvertedAction).length
  const feedbackRows = selectedPlan.actions
    .map((action) => getLatestFeedback(action))
    .filter((item): item is NonNullable<ReturnType<typeof getLatestFeedback>> => Boolean(item))
  const workedCount = feedbackRows.filter((item) => item.result === 'worked').length
  const feedbackCoverage = feedbackRows.length / total
  const workedShare = feedbackRows.length > 0 ? workedCount / feedbackRows.length : 0

  const recentAttempts = selectedPlan.actions.map((action) => action.feedbacks?.length || 0)
  const attemptsAvg = recentAttempts.length > 0
    ? recentAttempts.reduce((sum, value) => sum + value, 0) / recentAttempts.length
    : 0
  const attemptsPenalty = clamp(Math.round(Math.max(0, attemptsAvg - 1) * 6), 0, 15)
  const driftPenalty = drift.isStale ? clamp(Math.round(drift.score / 6), 0, 15) : 0

  let score = 0
  score += (createdCount / total) * 40
  score += feedbackCoverage * 25
  score += workedShare * 25
  score += clamp(10 - attemptsPenalty, 0, 10)
  score -= driftPenalty

  return {
    value: clamp(Math.round(score), 0, 100),
    breakdown: {
      createdCoverage: Math.round((createdCount / total) * 100),
      feedbackCoverage: Math.round(feedbackCoverage * 100),
      workedShare: Math.round(workedShare * 100),
      attemptsPenalty,
      driftPenalty,
    },
  }
}

export function computeAdaptiveModeSuggestion(
  plans: PolicyPlan[],
  snapshot: Record<string, unknown>,
): AdaptiveModeSuggestion | null {
  const selectedPlan = getSelectedPlan(plans, snapshot)
  if (!selectedPlan) return null

  const recent = selectedPlan.actions
    .map((action) => getLatestFeedback(action))
    .filter((item): item is NonNullable<ReturnType<typeof getLatestFeedback>> => Boolean(item))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4)
  if (recent.length < 3) return null

  const failed = recent.filter((item) => item.result === 'not_worked').length
  const worked = recent.filter((item) => item.result === 'worked').length

  if (failed >= 2 && selectedPlan.mode !== 'minimum') {
    return {
      targetMode: 'minimum',
      reason: 'Too many recent failures. Temporarily simplify the mode.',
    }
  }
  if (worked >= 3 && selectedPlan.mode === 'minimum') {
    return {
      targetMode: 'base',
      reason: 'Recent steps are stable. You can expand to base mode.',
    }
  }
  if (worked >= 3 && selectedPlan.mode === 'base') {
    return {
      targetMode: 'maximum',
      reason: 'Consistent wins allow scaling up to maximum mode.',
    }
  }

  return null
}

export function computeNextBestAction(
  plans: PolicyPlan[],
  snapshot: Record<string, unknown>,
  drift: ContextDrift,
): NextBestAction | null {
  if (!plans.length) {
    return {
      type: 'generate',
      reason: 'No plans yet. Generate three modes first.',
      confidence: 'high',
      factors: [{ key: 'no_plans', weight: 1 }],
      correlationId: makeCorrelationId(),
    }
  }

  if (drift.isStale) {
    return {
      type: 'regenerate_context',
      reason: `Context drift is high (${drift.score}%). Regenerate plans with fresh context.`,
      confidence: 'high',
      factors: [{ key: 'high_drift', weight: Math.max(0.7, drift.score / 100), detail: String(drift.score) }],
      correlationId: makeCorrelationId(),
    }
  }

  const selectedPlan = getSelectedPlan(plans, snapshot)
  if (!selectedPlan) return null

  const firstNoEntity = selectedPlan.actions.find((action) => !isConvertedAction(action)) || null
  if (firstNoEntity) {
    return {
      type: 'create_entity',
      actionId: firstNoEntity.id,
      reason: `Create an entity for "${firstNoEntity.title}" to start execution.`,
      confidence: 'high',
      factors: [{ key: 'pending_entity', weight: 1, detail: firstNoEntity.title }],
      correlationId: makeCorrelationId(),
    }
  }

  const firstNoFeedback = selectedPlan.actions.find((action) => !getLatestFeedback(action)) || null
  if (firstNoFeedback) {
    return {
      type: 'give_feedback',
      actionId: firstNoFeedback.id,
      reason: `No feedback yet for "${firstNoFeedback.title}". Close the feedback loop.`,
      confidence: 'high',
      factors: [{ key: 'missing_feedback', weight: 1, detail: firstNoFeedback.title }],
      correlationId: makeCorrelationId(),
    }
  }

  const recent = selectedPlan.actions
    .map((action) => ({ action, feedback: getLatestFeedback(action) }))
    .filter((item): item is { action: PolicyPlanAction; feedback: NonNullable<ReturnType<typeof getLatestFeedback>> } => Boolean(item.feedback))
    .sort((a, b) => new Date(b.feedback.updatedAt).getTime() - new Date(a.feedback.updatedAt).getTime())
    .slice(0, 4)
  const failedRecent = recent.filter((item) => item.feedback.result === 'not_worked').length
  const workedRecent = recent.filter((item) => item.feedback.result === 'worked').length

  if (failedRecent >= 2 && selectedPlan.mode !== 'minimum') {
    return {
      type: 'switch_mode',
      targetMode: 'minimum',
      reason: 'Recent feedback is mostly failing. Switch to minimum mode temporarily.',
      confidence: 'medium',
      factors: [
        { key: 'failed_recent', weight: 0.8, detail: String(failedRecent) },
        { key: 'mode_pressure', weight: 0.5, detail: selectedPlan.mode },
      ],
      correlationId: makeCorrelationId(),
    }
  }
  if (workedRecent >= 3 && selectedPlan.mode === 'minimum') {
    return {
      type: 'switch_mode',
      targetMode: 'base',
      reason: 'Recent steps are stable. Move from minimum to base mode.',
      confidence: 'medium',
      factors: [
        { key: 'worked_recent', weight: 0.8, detail: String(workedRecent) },
        { key: 'mode_floor', weight: 0.4, detail: 'minimum' },
      ],
      correlationId: makeCorrelationId(),
    }
  }

  const failedAction = recent.find((item) => item.feedback.result === 'not_worked') || null
  if (failedAction) {
    return {
      type: 'retry',
      actionId: failedAction.action.id,
      reason: `Most recent failed action is "${failedAction.action.title}". Start retry flow.`,
      confidence: 'medium',
      factors: [{ key: 'last_failed_action', weight: 0.7, detail: failedAction.action.title }],
      correlationId: makeCorrelationId(),
    }
  }

  return {
    type: 'give_feedback',
    actionId: selectedPlan.actions[0]?.id || null,
    reason: 'Keep the loop running: record feedback for each new action.',
    confidence: 'low',
    factors: [{ key: 'default_loop', weight: 0.3 }],
    correlationId: makeCorrelationId(),
  }
}

export function buildLeakPolicy(
  plans: PolicyPlan[],
  snapshot: Record<string, unknown>,
  liveContext: { metrics?: Record<string, unknown> } | null | undefined,
): LeakPolicyPayload {
  const contextDrift = buildContextDrift(snapshot, liveContext)
  return {
    policyVersion: LEAK_POLICY_VERSION,
    computedAt: new Date().toISOString(),
    selectedMode: getSelectedPlan(plans, snapshot)?.mode || getSnapshotMode(snapshot, 'selectedPlanMode') || null,
    nextBestAction: computeNextBestAction(plans, snapshot, contextDrift),
    contextDrift,
    executionScore: computeExecutionScore(plans, snapshot, contextDrift),
    adaptiveModeSuggestion: computeAdaptiveModeSuggestion(plans, snapshot),
  }
}

export function appendRunJournal(
  snapshot: Record<string, unknown>,
  event: RunJournalEvent,
  maxItems = 120,
) {
  const next = normalizeSnapshot(snapshot)
  const current = Array.isArray(next.runJournal) ? [...next.runJournal] : []
  current.unshift(event)
  if (current.length > maxItems) {
    current.length = maxItems
  }
  next.runJournal = current
  return next
}

export function compactSnapshot(snapshot: Record<string, unknown>) {
  const next = normalizeSnapshot(snapshot)
  const compactArray = (key: string, max: number) => {
    if (!Array.isArray(next[key])) return
    next[key] = next[key].slice(0, max)
  }
  compactArray('feedbackLog', 80)
  compactArray('runJournal', 120)

  const history = toRecord(next.history)
  if (Array.isArray(history.actionFeedback)) {
    history.actionFeedback = history.actionFeedback.slice(0, 40)
  }
  if (Array.isArray(history.linkedEntities)) {
    history.linkedEntities = history.linkedEntities.slice(0, 40)
  }
  if (Object.keys(history).length > 0) {
    next.history = history
  }
  return next
}
