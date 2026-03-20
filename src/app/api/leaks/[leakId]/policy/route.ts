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

    return NextResponse.json({
      success: true,
      policy,
      summary: {
        ...summarizePolicyJournal(nextSnapshot),
        currentFunnel: summarizeCurrentFunnel(nextSnapshot, policy.nextBestAction?.correlationId || null),
      },
      runJournal: Array.isArray(nextSnapshot.runJournal) ? nextSnapshot.runJournal.slice(0, 20) : [],
    })
  } catch (error) {
    console.error('Error fetching leak policy:', error)
    return NextResponse.json({ error: 'Failed to fetch leak policy' }, { status: 500 })
  }
}
