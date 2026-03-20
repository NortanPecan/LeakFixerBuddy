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

    const nextSnapshot = compactSnapshot(
      appendRunJournal(snapshot, {
        type: 'policy_suggested',
        at: new Date().toISOString(),
        mode: policy.selectedMode as LeakPlanMode | null,
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
