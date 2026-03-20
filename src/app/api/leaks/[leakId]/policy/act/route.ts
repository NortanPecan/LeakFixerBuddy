import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireSelf } from '@/lib/server-auth'
import {
  appendRunJournal,
  compactSnapshot,
  normalizeSnapshot,
  type LeakPlanMode,
} from '@/lib/leak-policy'

const PolicyActSchema = z.object({
  userId: z.string().min(1),
  actionType: z.enum(['switch_mode', 'retry', 'regenerate_context', 'focus_action']),
  decision: z.enum(['accepted', 'rejected']).default('accepted'),
  reason: z.string().max(500).optional().nullable(),
  correlationId: z.string().min(1).optional(),
  targetMode: z.enum(['minimum', 'base', 'maximum']).optional(),
  actionId: z.string().min(1).optional(),
  actionTitle: z.string().min(1).optional(),
  actionKind: z.string().min(1).optional(),
})

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ leakId: string }> },
) {
  try {
    const body = await request.json()
    const parsed = PolicyActSchema.safeParse(body)
    const { leakId } = await context.params
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid policy action payload', issues: parsed.error.flatten() }, { status: 400 })
    }

    const { userId, actionType, decision, reason, correlationId, targetMode, actionId, actionTitle, actionKind } =
      parsed.data
    const auth = requireSelf(request, userId)
    if ('error' in auth) return auth.error

    const leak = await db.leak.findUnique({
      where: { id: leakId },
      select: {
        id: true,
        userId: true,
        status: true,
        contextSnapshot: true,
      },
    })
    if (!leak) return NextResponse.json({ error: 'Leak not found' }, { status: 404 })
    if (leak.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    let snapshot = normalizeSnapshot(leak.contextSnapshot)
    const now = new Date().toISOString()
    const eventType = decision === 'accepted' ? 'policy_accepted' : 'policy_rejected'
    snapshot = appendRunJournal(snapshot, {
      type: eventType,
      at: now,
      policyCorrelationId: correlationId || null,
      policyActionType: actionType,
      note: reason || null,
    })

    let executed = false
    let requiresRegenerate = false

    if (decision === 'accepted') {
      if (actionType === 'switch_mode') {
        if (!targetMode) {
          return NextResponse.json({ error: 'targetMode is required for switch_mode' }, { status: 400 })
        }
        await db.$transaction(async (tx) => {
          await tx.leakSolutionPlan.updateMany({
            where: { leakId },
            data: { isSelected: false },
          })
          await tx.leakSolutionPlan.updateMany({
            where: { leakId, mode: targetMode },
            data: { isSelected: true },
          })
          const txSnapshot = compactSnapshot(
            appendRunJournal(
              {
                ...snapshot,
                selectedPlanMode: targetMode,
                contextUpdatedAt: now,
              },
              {
                type: 'mode_selected',
                at: now,
                mode: targetMode as LeakPlanMode,
                policyCorrelationId: correlationId || null,
                policyActionType: actionType,
              },
            ),
          )
          await tx.leak.update({
            where: { id: leakId },
            data: {
              contextSnapshot: txSnapshot,
            },
          })
        })
        snapshot.selectedPlanMode = targetMode
        executed = true
      } else if (actionType === 'retry') {
        snapshot.retry = {
          actionId: actionId || null,
          actionTitle: actionTitle || null,
          actionKind: actionKind || null,
          failureReason: reason || null,
          requestedAt: now,
        }
        if (leak.status === 'resolved' || leak.status === 'archived') {
          await db.leak.update({
            where: { id: leakId },
            data: {
              status: 'in_progress',
              resolvedAt: null,
            },
          })
        }
        snapshot = appendRunJournal(snapshot, {
          type: 'retry_started',
          at: now,
          actionId: actionId || null,
          actionTitle: actionTitle || null,
          policyCorrelationId: correlationId || null,
          policyActionType: actionType,
          note: reason || null,
        })
        executed = true
      } else if (actionType === 'regenerate_context') {
        snapshot.policyRegenerateRequestedAt = now
        requiresRegenerate = true
        executed = true
      } else if (actionType === 'focus_action') {
        snapshot.focusActionId = actionId || null
        snapshot.focusActionTitle = actionTitle || null
        snapshot.focusActionKind = actionKind || null
        executed = true
      }
    }

    snapshot.contextUpdatedAt = now
    snapshot = compactSnapshot(snapshot)
    await db.leak.update({
      where: { id: leakId },
      data: {
        contextSnapshot: snapshot,
      },
    })

    return NextResponse.json({
      success: true,
      executed,
      requiresRegenerate,
      snapshot,
    })
  } catch (error) {
    console.error('Error running policy action:', error)
    return NextResponse.json({ error: 'Failed to execute policy action' }, { status: 500 })
  }
}
