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
      runJournal: Array.isArray(nextSnapshot.runJournal) ? nextSnapshot.runJournal.slice(0, 10) : [],
    })
  } catch (error) {
    console.error('Error fetching leak policy:', error)
    return NextResponse.json({ error: 'Failed to fetch leak policy' }, { status: 500 })
  }
}
