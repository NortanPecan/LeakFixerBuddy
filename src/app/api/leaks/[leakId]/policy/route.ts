import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSelf } from '@/lib/server-auth'
import {
  appendRunJournal,
  buildLeakPolicy,
  compactSnapshot,
  normalizeSnapshot,
  type LeakPlanMode,
} from '@/lib/leak-policy'

async function loadPlans(leakId: string) {
  return db.leakSolutionPlan.findMany({
    where: { leakId },
    include: {
      actions: {
        include: {
          feedbacks: {
            orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      },
    },
    orderBy: [{ isSelected: 'desc' }, { createdAt: 'asc' }],
  })
}

function pickLiveContext(snapshot: Record<string, unknown>) {
  const live =
    snapshot.live && typeof snapshot.live === 'object' && !Array.isArray(snapshot.live)
      ? (snapshot.live as Record<string, unknown>)
      : null
  const metrics =
    live?.metrics && typeof live.metrics === 'object' && !Array.isArray(live.metrics)
      ? (live.metrics as Record<string, unknown>)
      : {}
  return { metrics }
}

function shouldAppendSuggestedEvent(snapshot: Record<string, unknown>, correlationId: string | null) {
  const journal = Array.isArray(snapshot.runJournal) ? snapshot.runJournal : []
  const latestSuggested = journal.find((item) => {
    if (!item || typeof item !== 'object') return false
    const event = item as Record<string, unknown>
    return event.type === 'policy_suggested'
  }) as Record<string, unknown> | undefined
  if (!latestSuggested) return true

  const latestAt = typeof latestSuggested.at === 'string' ? new Date(latestSuggested.at).getTime() : 0
  const now = Date.now()
  const isFresh = now - latestAt < 60_000
  const latestCorrelationId =
    typeof latestSuggested.policyCorrelationId === 'string' ? latestSuggested.policyCorrelationId : null

  // Throttle noisy repeats from frequent card opens when suggestion is unchanged.
  if (isFresh && latestCorrelationId && correlationId && latestCorrelationId === correlationId) {
    return false
  }

  return true
}

function summarizePolicyJournal(snapshot: Record<string, unknown>) {
  const journal = Array.isArray(snapshot.runJournal) ? snapshot.runJournal : []
  let accepted = 0
  let rejected = 0
  let outcomes = 0
  let outcomeWorked = 0
  let outcomePartial = 0
  let outcomeFailed = 0
  const rejectReasons: Record<string, number> = {}

  journal.forEach((item) => {
    if (!item || typeof item !== 'object') return
    const event = item as Record<string, unknown>
    if (event.type === 'policy_accepted') accepted += 1
    if (event.type === 'policy_rejected') {
      rejected += 1
      if (typeof event.note === 'string' && event.note.trim()) {
        const reason = event.note.trim()
        rejectReasons[reason] = (rejectReasons[reason] || 0) + 1
      }
    }
    if (event.type === 'policy_outcome') {
      outcomes += 1
      if (event.result === 'worked') outcomeWorked += 1
      if (event.result === 'partially') outcomePartial += 1
      if (event.result === 'not_worked') outcomeFailed += 1
    }
  })

  return {
    accepted,
    rejected,
    outcomes,
    outcomeWorked,
    outcomePartial,
    outcomeFailed,
    rejectReasons,
  }
}

function summarizeCurrentFunnel(
  snapshot: Record<string, unknown>,
  correlationId: string | null,
) {
  if (!correlationId) {
    return null
  }
  const journal = Array.isArray(snapshot.runJournal) ? snapshot.runJournal : []
  let suggestedAt: string | null = null
  let acceptedAt: string | null = null
  let rejectedAt: string | null = null
  let entityCreatedCount = 0
  let outcomeCount = 0
  let outcomeWorked = 0
  let outcomePartial = 0
  let outcomeFailed = 0
  let lastOutcomeAt: string | null = null
  const createdActionIds: string[] = []
  const createdActionTitleById = new Map<string, string>()
  const createdActionAtById = new Map<string, string>()
  const outcomeActionIds = new Set<string>()

  journal.forEach((item) => {
    if (!item || typeof item !== 'object') return
    const event = item as Record<string, unknown>
    if (event.policyCorrelationId !== correlationId) return
    const at = typeof event.at === 'string' ? event.at : null
    if (event.type === 'policy_suggested' && !suggestedAt) suggestedAt = at
    if (event.type === 'policy_accepted' && !acceptedAt) acceptedAt = at
    if (event.type === 'policy_rejected' && !rejectedAt) rejectedAt = at
    if (event.type === 'action_created') {
      entityCreatedCount += 1
      if (typeof event.actionId === 'string' && event.actionId) {
        createdActionIds.push(event.actionId)
        if (at) {
          createdActionAtById.set(event.actionId, at)
        }
        if (typeof event.actionTitle === 'string' && event.actionTitle) {
          createdActionTitleById.set(event.actionId, event.actionTitle)
        }
      }
    }
    if (event.type === 'policy_outcome') {
      outcomeCount += 1
      if (typeof event.actionId === 'string' && event.actionId) {
        outcomeActionIds.add(event.actionId)
      }
      if (event.result === 'worked') outcomeWorked += 1
      if (event.result === 'partially') outcomePartial += 1
      if (event.result === 'not_worked') outcomeFailed += 1
      if (at && (!lastOutcomeAt || new Date(at).getTime() > new Date(lastOutcomeAt).getTime())) {
        lastOutcomeAt = at
      }
    }
  })

  const pendingOutcomeActionIds = createdActionIds.filter((id) => !outcomeActionIds.has(id))
  const pendingOutcomeActionTitles = pendingOutcomeActionIds
    .map((id) => createdActionTitleById.get(id) || null)
    .filter((item): item is string => Boolean(item))
  let stage:
    | 'suggested'
    | 'accepted'
    | 'awaiting_feedback'
    | 'learning'
    | 'completed'
    | 'rejected' = 'suggested'
  if (rejectedAt && !acceptedAt) {
    stage = 'rejected'
  } else if (!acceptedAt) {
    stage = 'suggested'
  } else if (pendingOutcomeActionIds.length > 0) {
    stage = 'awaiting_feedback'
  } else if (outcomeCount === 0) {
    stage = 'accepted'
  } else if (outcomeFailed === 0 && outcomePartial === 0 && outcomeWorked > 0) {
    stage = 'completed'
  } else {
    stage = 'learning'
  }
  const now = Date.now()
  const toAgeMinutes = (value: string | null) =>
    value ? Math.max(0, Math.round((now - new Date(value).getTime()) / 60000)) : null
  const pendingOutcomeActionAgesMinutes = pendingOutcomeActionIds
    .map((id) => toAgeMinutes(createdActionAtById.get(id) || null))
    .filter((item): item is number => typeof item === 'number')
  const maxPendingOutcomeAgeMinutes =
    pendingOutcomeActionAgesMinutes.length > 0
      ? Math.max(...pendingOutcomeActionAgesMinutes)
      : null
  const suggestedAgeMinutes = toAgeMinutes(suggestedAt)
  const acceptedAgeMinutes = toAgeMinutes(acceptedAt)
  const lastOutcomeAgeMinutes = toAgeMinutes(lastOutcomeAt)

  const stuckSignals = {
    noDecision:
      Boolean(suggestedAt && !acceptedAt && !rejectedAt && (suggestedAgeMinutes || 0) >= 120),
    noEntityAfterAccept:
      Boolean(acceptedAt && entityCreatedCount === 0 && (acceptedAgeMinutes || 0) >= 90),
    pendingFeedback:
      Boolean(
        pendingOutcomeActionIds.length > 0 &&
        maxPendingOutcomeAgeMinutes !== null &&
        maxPendingOutcomeAgeMinutes >= 180,
      ),
    noOutcomeAfterCreate:
      Boolean(
        entityCreatedCount > 0 &&
        outcomeCount === 0 &&
        maxPendingOutcomeAgeMinutes !== null &&
        maxPendingOutcomeAgeMinutes >= 180,
      ),
  }
  const stuckScore = Math.min(
    100,
    (stuckSignals.noDecision ? 20 : 0) +
      (stuckSignals.noEntityAfterAccept ? 25 : 0) +
      (stuckSignals.pendingFeedback ? 30 : 0) +
      (stuckSignals.noOutcomeAfterCreate ? 25 : 0) +
      (maxPendingOutcomeAgeMinutes && maxPendingOutcomeAgeMinutes >= 360 ? 10 : 0),
  )
  const urgency =
    stuckScore >= 60
      ? 'high'
      : stuckScore >= 30
        ? 'medium'
        : 'low'
  const recommendedNudge =
    stuckSignals.noDecision
      ? 'accept_or_reject'
      : stuckSignals.noEntityAfterAccept
        ? 'create_entity'
        : stuckSignals.pendingFeedback || stuckSignals.noOutcomeAfterCreate
          ? 'collect_feedback'
          : 'none'

  return {
    correlationId,
    suggestedAt,
    acceptedAt,
    rejectedAt,
    entityCreatedCount,
    outcomeCount,
    outcomeWorked,
    outcomePartial,
    outcomeFailed,
    lastOutcomeAt,
    pendingOutcomeActionIds,
    pendingOutcomeActionTitles,
    nextPendingOutcomeActionId: pendingOutcomeActionIds[0] || null,
    nextPendingOutcomeActionTitle: pendingOutcomeActionTitles[0] || null,
    stage,
    suggestedAgeMinutes,
    acceptedAgeMinutes,
    lastOutcomeAgeMinutes,
    maxPendingOutcomeAgeMinutes,
    stuckSignals,
    stuckScore,
    urgency,
    recommendedNudge,
  }
}

function summarizeRecentFunnels(
  snapshot: Record<string, unknown>,
  currentCorrelationId: string | null,
  limit = 5,
) {
  const journal = Array.isArray(snapshot.runJournal) ? snapshot.runJournal : []
  const ids: string[] = []
  journal.forEach((item) => {
    if (!item || typeof item !== 'object') return
    const event = item as Record<string, unknown>
    const correlationId =
      typeof event.policyCorrelationId === 'string' ? event.policyCorrelationId : null
    if (!correlationId) return
    if (!ids.includes(correlationId)) {
      ids.push(correlationId)
    }
  })

  return ids
    .slice(0, limit)
    .map((id) => {
      const summary = summarizeCurrentFunnel(snapshot, id)
      if (!summary) return null
      return {
        ...summary,
        isCurrent: Boolean(currentCorrelationId && id === currentCorrelationId),
      }
    })
    .filter((item) => Boolean(item))
}

function summarizeLearningSignals(snapshot: Record<string, unknown>) {
  const history =
    snapshot.history && typeof snapshot.history === 'object' && !Array.isArray(snapshot.history)
      ? (snapshot.history as Record<string, unknown>)
      : {}
  const actionFeedbackRaw = Array.isArray(history.actionFeedback) ? history.actionFeedback : []
  const actionFeedback = actionFeedbackRaw
    .map((item) => (item && typeof item === 'object' ? (item as Record<string, unknown>) : null))
    .filter((item): item is Record<string, unknown> => Boolean(item))

  const recent = actionFeedback
    .filter((item) => typeof item.updatedAt === 'string')
    .sort(
      (a, b) =>
        new Date(String(b.updatedAt)).getTime() - new Date(String(a.updatedAt)).getTime(),
    )
    .slice(0, 12)

  const failureRecent = recent.filter((item) => item.result === 'not_worked')
  const partialRecent = recent.filter((item) => item.result === 'partially')
  const workedRecent = recent.filter((item) => item.result === 'worked')

  const reasonCounts: Record<string, number> = {}
  const failureBuckets: Record<'time' | 'energy' | 'context' | 'complexity' | 'unknown', number> = {
    time: 0,
    energy: 0,
    context: 0,
    complexity: 0,
    unknown: 0,
  }
  failureRecent.forEach((item) => {
    const comment = typeof item.comment === 'string' ? item.comment.trim() : ''
    const lowered = comment.toLowerCase()
    if (
      lowered.includes('время') ||
      lowered.includes('не усп') ||
      lowered.includes('time') ||
      lowered.includes('busy')
    ) {
      failureBuckets.time += 1
    } else if (
      lowered.includes('энерг') ||
      lowered.includes('сил') ||
      lowered.includes('устал') ||
      lowered.includes('energy') ||
      lowered.includes('sleep')
    ) {
      failureBuckets.energy += 1
    } else if (
      lowered.includes('контекст') ||
      lowered.includes('стресс') ||
      lowered.includes('работ') ||
      lowered.includes('family') ||
      lowered.includes('context')
    ) {
      failureBuckets.context += 1
    } else if (
      lowered.includes('сложно') ||
      lowered.includes('too hard') ||
      lowered.includes('big') ||
      lowered.includes('сложн')
    ) {
      failureBuckets.complexity += 1
    } else {
      failureBuckets.unknown += 1
    }
    if (!comment) return
    const key = comment.length > 48 ? `${comment.slice(0, 48)}…` : comment
    reasonCounts[key] = (reasonCounts[key] || 0) + 1
  })
  const topFailureReasons = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([text, count]) => ({ text, count }))

  const attemptByAction = new Map<string, { actionId: string; actionTitle: string; attempt: number }>()
  const actionStats = new Map<
    string,
    {
      actionId: string
      actionTitle: string
      attempts: number
      failures: number
      partials: number
      worked: number
      lastResult: 'worked' | 'partially' | 'not_worked' | 'unknown'
      lastUpdatedAt: string | null
    }
  >()
  actionFeedback.forEach((item) => {
    const actionId = typeof item.actionId === 'string' ? item.actionId : null
    const actionTitle =
      typeof item.actionTitle === 'string' ? item.actionTitle : 'Без названия шага'
    const attempt = typeof item.attempt === 'number' ? Math.round(item.attempt) : 1
    if (!actionId) return
    const prev = attemptByAction.get(actionId)
    if (!prev || attempt > prev.attempt) {
      attemptByAction.set(actionId, { actionId, actionTitle, attempt })
    }
    const updatedAt = typeof item.updatedAt === 'string' ? item.updatedAt : null
    const result =
      item.result === 'worked' || item.result === 'partially' || item.result === 'not_worked'
        ? (item.result as 'worked' | 'partially' | 'not_worked')
        : 'unknown'
    const stats = actionStats.get(actionId) || {
      actionId,
      actionTitle,
      attempts: 0,
      failures: 0,
      partials: 0,
      worked: 0,
      lastResult: 'unknown' as const,
      lastUpdatedAt: null as string | null,
    }
    stats.attempts += 1
    if (result === 'not_worked') stats.failures += 1
    if (result === 'partially') stats.partials += 1
    if (result === 'worked') stats.worked += 1
    if (updatedAt && (!stats.lastUpdatedAt || new Date(updatedAt).getTime() > new Date(stats.lastUpdatedAt).getTime())) {
      stats.lastUpdatedAt = updatedAt
      stats.lastResult = result
    }
    actionStats.set(actionId, stats)
  })
  const repeatedActions = Array.from(attemptByAction.values())
    .filter((item) => item.attempt >= 2)
    .sort((a, b) => b.attempt - a.attempt)
    .slice(0, 5)
  const unstableActions = Array.from(actionStats.values())
    .filter((item) => item.failures >= 2 || (item.failures >= 1 && item.partials >= 1))
    .sort((a, b) => b.failures - a.failures || b.partials - a.partials || b.attempts - a.attempts)
    .slice(0, 5)

  const totalRecent = Math.max(recent.length, 1)
  const workedShare = workedRecent.length / totalRecent
  const failureShare = failureRecent.length / totalRecent
  const partialShare = partialRecent.length / totalRecent
  const repeatPenalty = Math.min(25, repeatedActions.length * 8)
  const health = Math.max(
    0,
    Math.min(
      100,
      Math.round(workedShare * 70 + (1 - failureShare) * 25 + (1 - partialShare) * 5 - repeatPenalty),
    ),
  )
  const dominantFailureBucket = Object.entries(failureBuckets).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown'

  return {
    loopHealth: health,
    recentFeedbackCount: recent.length,
    recentWorkedCount: workedRecent.length,
    recentPartialCount: partialRecent.length,
    recentFailedCount: failureRecent.length,
    topFailureReasons,
    failureBuckets,
    dominantFailureBucket,
    repeatedActions,
    unstableActions,
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

    const leak = await db.leak.findUnique({
      where: { id: leakId },
      select: {
        id: true,
        userId: true,
        contextSnapshot: true,
      },
    })
    if (!leak) {
      return NextResponse.json({ error: 'Leak not found' }, { status: 404 })
    }
    if (leak.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const plans = await loadPlans(leakId)
    const snapshot = normalizeSnapshot(leak.contextSnapshot)
    const policy = buildLeakPolicy(plans, snapshot, pickLiveContext(snapshot))

    let nextSnapshot = snapshot
    if (shouldAppendSuggestedEvent(snapshot, policy.nextBestAction?.correlationId || null)) {
      nextSnapshot = compactSnapshot(
        appendRunJournal(snapshot, {
          type: 'policy_suggested',
          at: new Date().toISOString(),
          mode: policy.selectedMode as LeakPlanMode | null,
          actionId: policy.nextBestAction?.actionId || null,
          actionTitle: null,
          policyCorrelationId: policy.nextBestAction?.correlationId || null,
          policyActionType: policy.nextBestAction?.type || null,
          factors: policy.nextBestAction?.factors || [],
          note: policy.nextBestAction?.reason || null,
        }),
      )
      await db.leak.update({
        where: { id: leakId },
        data: {
          contextSnapshot: nextSnapshot,
        },
      })
    }

    const currentCorrelationId = policy.nextBestAction?.correlationId || null

    return NextResponse.json({
      success: true,
      policy,
      summary: {
        ...summarizePolicyJournal(nextSnapshot),
        currentFunnel: summarizeCurrentFunnel(nextSnapshot, currentCorrelationId),
        recentFunnels: summarizeRecentFunnels(nextSnapshot, currentCorrelationId, 5),
        learningSignals: summarizeLearningSignals(nextSnapshot),
      },
      runJournal: Array.isArray(nextSnapshot.runJournal) ? nextSnapshot.runJournal.slice(0, 20) : [],
    })
  } catch (error) {
    console.error('Error fetching leak policy:', error)
    return NextResponse.json({ error: 'Failed to fetch leak policy' }, { status: 500 })
  }
}
