import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireSelf } from '@/lib/server-auth'
import { appendRunJournal, compactSnapshot } from '@/lib/leak-policy'

const LeakFeedbackSchema = z.object({
  userId: z.string().min(1),
  solutionActionId: z.string().min(1).optional(),
  solutionActionIds: z.array(z.string().min(1)).max(50).optional(),
  policyCorrelationId: z.string().min(1).optional(),
  result: z.enum(['worked', 'partially', 'not_worked']),
  comment: z.string().max(1000).optional().nullable(),
})

type LeakFeedbackResult = 'worked' | 'partially' | 'not_worked'
type FeedbackLogEntry = {
  actionId: string
  actionTitle: string
  actionKind: string
  mode: string
  result: LeakFeedbackResult
  comment: string | null
  updatedAt: string
}

function normalizeSnapshot(snapshot: unknown): Record<string, unknown> {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    return {}
  }
  return { ...(snapshot as Record<string, unknown>) }
}

function normalizeFeedbackLog(raw: unknown): FeedbackLogEntry[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const candidate = item as Record<string, unknown>
      if (
        typeof candidate.actionId !== 'string' ||
        typeof candidate.actionTitle !== 'string' ||
        typeof candidate.actionKind !== 'string' ||
        typeof candidate.mode !== 'string' ||
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
        actionId: candidate.actionId,
        actionTitle: candidate.actionTitle,
        actionKind: candidate.actionKind,
        mode: candidate.mode,
        result: candidate.result,
        comment: typeof candidate.comment === 'string' ? candidate.comment : null,
        updatedAt: candidate.updatedAt,
      }
    })
    .filter((item): item is FeedbackLogEntry => Boolean(item))
}

function normalizeTriedSolution(
  item: unknown,
): {
  text: string
  worked: boolean | null
  result?: string
  comment?: string | null
  updatedAt?: string
  sourceActionKind?: string
  sourcePlanMode?: string
  linkedEntityType?: string | null
  linkedEntityLabel?: string | null
} | null {
  if (!item || typeof item !== 'object') return null

  const candidate = item as Record<string, unknown>
  if (typeof candidate.text !== 'string' || !candidate.text.trim()) return null

  return {
    text: candidate.text.trim(),
    worked:
      typeof candidate.worked === 'boolean'
        ? candidate.worked
        : null,
    result: typeof candidate.result === 'string' ? candidate.result : undefined,
    comment: typeof candidate.comment === 'string' ? candidate.comment : null,
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : undefined,
    sourceActionKind: typeof candidate.sourceActionKind === 'string' ? candidate.sourceActionKind : undefined,
    sourcePlanMode: typeof candidate.sourcePlanMode === 'string' ? candidate.sourcePlanMode : undefined,
    linkedEntityType:
      typeof candidate.linkedEntityType === 'string' ? candidate.linkedEntityType : null,
    linkedEntityLabel:
      typeof candidate.linkedEntityLabel === 'string' ? candidate.linkedEntityLabel : null,
  }
}

function buildPatternResponse(pattern: {
  leakType: string
  analysisCount: number
  whatWorked: unknown
  triedSolutions: unknown
  updatedAt: Date
}) {
  const normalizedTried = Array.isArray(pattern.triedSolutions)
    ? (pattern.triedSolutions as unknown[])
        .map(normalizeTriedSolution)
        .filter((item): item is NonNullable<ReturnType<typeof normalizeTriedSolution>> => Boolean(item))
    : []

  const workedCount = normalizedTried.filter((item) => item.result === 'worked').length
  const partialCount = normalizedTried.filter((item) => item.result === 'partially').length
  const failedCount = normalizedTried.filter((item) => item.result === 'not_worked').length
  const workedExamples = normalizedTried
    .filter((item) => item.result === 'worked' || item.worked === true)
    .slice(0, 6)

  return {
    leakType: pattern.leakType,
    analysisCount: pattern.analysisCount,
    whatWorked: Array.isArray(pattern.whatWorked)
      ? (pattern.whatWorked as unknown[]).filter((item): item is string => typeof item === 'string')
      : [],
    triedSolutions: normalizedTried,
    workedCount,
    partialCount,
    failedCount,
    workedExamples,
    updatedAt: pattern.updatedAt.toISOString(),
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

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ leakId: string }> },
) {
  try {
    const body = await request.json()
    const parsed = LeakFeedbackSchema.safeParse(body)
    const { leakId } = await context.params

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid feedback payload', issues: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { userId, solutionActionId, solutionActionIds, policyCorrelationId, result, comment } = parsed.data
    const normalizedComment = comment?.trim() || null
    if (result === 'not_worked' && (!normalizedComment || normalizedComment.length < 5)) {
      return NextResponse.json(
        { error: 'Comment is required for not_worked feedback (min 5 chars)' },
        { status: 400 },
      )
    }
    const targetActionIds = Array.from(
      new Set(
        [
          ...(solutionActionId ? [solutionActionId] : []),
          ...((Array.isArray(solutionActionIds) ? solutionActionIds : []).filter(Boolean)),
        ].map((item) => item.trim()).filter(Boolean),
      ),
    )
    if (targetActionIds.length === 0) {
      return NextResponse.json(
        { error: 'solutionActionId or solutionActionIds is required' },
        { status: 400 },
      )
    }

    const auth = requireSelf(request, userId)
    if ('error' in auth) return auth.error

    const leak = await db.leak.findUnique({
      where: { id: leakId },
      select: { id: true, userId: true, title: true },
    })

    if (!leak) {
      return NextResponse.json({ error: 'Leak not found' }, { status: 404 })
    }

    if (leak.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const actions = await db.leakSolutionAction.findMany({
      where: { id: { in: targetActionIds } },
      include: {
        plan: {
          select: {
            leakId: true,
            mode: true,
          },
        },
      },
    })

    if (actions.length !== targetActionIds.length) {
      return NextResponse.json({ error: 'Plan action not found' }, { status: 404 })
    }
    if (actions.some((action) => action.plan.leakId !== leakId)) {
      return NextResponse.json({ error: 'Plan action does not belong to leak' }, { status: 400 })
    }

    const updatedPattern = await db.$transaction(async (tx) => {
      let reopened = false
      if (result !== 'worked' && !reopened) {
        const currentLeak = await tx.leak.findUnique({
          where: { id: leakId },
          select: { status: true },
        })

        if (currentLeak && (currentLeak.status === 'resolved' || currentLeak.status === 'archived')) {
          await tx.leak.update({
            where: { id: leakId },
            data: {
              status: 'in_progress',
              resolvedAt: null,
            },
          })
          reopened = true
        }
      }

      const leakSnapshotSource = await tx.leak.findUnique({
        where: { id: leakId },
        select: {
          contextSnapshot: true,
        },
      })
      const snapshot = normalizeSnapshot(leakSnapshotSource?.contextSnapshot)
      const feedbackLog = normalizeFeedbackLog(snapshot.feedbackLog)

      const existingPattern = await tx.userAiPattern.findUnique({
        where: { userId_leakType: { userId, leakType: leak.title } },
        select: {
          triedSolutions: true,
          whatWorked: true,
          analysisCount: true,
        },
      })
      const linkedEntities = await tx.leakActionLink.findMany({
        where: { leakId },
        orderBy: { createdAt: 'desc' },
        select: {
          entityType: true,
          label: true,
          metadata: true,
        },
      })
      const linkedEntityByActionId = new Map<string, (typeof linkedEntities)[number]>()
      linkedEntities.forEach((item) => {
        if (!item.metadata || typeof item.metadata !== 'object' || Array.isArray(item.metadata)) return
        const sourceActionId = (item.metadata as Record<string, unknown>).sourceActionId
        if (typeof sourceActionId !== 'string' || linkedEntityByActionId.has(sourceActionId)) return
        linkedEntityByActionId.set(sourceActionId, item)
      })

      const triedSolutions = Array.isArray(existingPattern?.triedSolutions)
        ? (existingPattern?.triedSolutions as unknown[])
            .map(normalizeTriedSolution)
            .filter((item): item is NonNullable<ReturnType<typeof normalizeTriedSolution>> => Boolean(item))
        : []

      const whatWorked = Array.isArray(existingPattern?.whatWorked)
        ? ([...(existingPattern?.whatWorked as string[])] as string[])
        : []

      for (const action of actions) {
        await tx.leakFeedback.upsert({
          where: {
            leakId_solutionActionId: {
              leakId,
              solutionActionId: action.id,
            },
          },
          update: {
            result,
            comment: normalizedComment,
          },
          create: {
            leakId,
            solutionActionId: action.id,
            result,
            comment: normalizedComment,
          },
        })

        const updatedAt = new Date().toISOString()
        const retryCurrent =
          snapshot.retry && typeof snapshot.retry === 'object' && !Array.isArray(snapshot.retry)
            ? (snapshot.retry as Record<string, unknown>)
            : null
        const retryActionId = typeof retryCurrent?.actionId === 'string' ? retryCurrent.actionId : null
        const retryActionTitle = typeof retryCurrent?.actionTitle === 'string' ? retryCurrent.actionTitle : null
        const isSameRetryAction =
          retryActionId === action.id ||
          (!retryActionId &&
            typeof retryActionTitle === 'string' &&
            retryActionTitle.trim().toLowerCase() === action.title.trim().toLowerCase())

        if (result === 'worked') {
          if (isSameRetryAction) {
            snapshot.retry = null
            snapshot.retryResolvedAt = updatedAt
            const withResolved = appendRunJournal(snapshot, {
              type: 'retry_resolved',
              at: updatedAt,
              mode: action.plan.mode as 'minimum' | 'base' | 'maximum',
              actionId: action.id,
              actionTitle: action.title,
              result,
            })
            Object.assign(snapshot, withResolved)
          }
          snapshot.lastStableMode = action.plan.mode
          snapshot.lastStableAt = updatedAt
          if (!whatWorked.includes(action.title)) {
            whatWorked.push(action.title)
          }
        } else {
          snapshot.retry = {
            actionId: action.id,
            actionTitle: action.title,
            actionKind: action.kind,
            failureReason: normalizedComment,
            requestedAt: updatedAt,
          }
          const withRetry = appendRunJournal(snapshot, {
            type: 'retry_started',
            at: updatedAt,
            mode: action.plan.mode as 'minimum' | 'base' | 'maximum',
            actionId: action.id,
            actionTitle: action.title,
            result,
            note: normalizedComment,
          })
          Object.assign(snapshot, withRetry)
          const existingWorkedIndex = whatWorked.indexOf(action.title)
          if (existingWorkedIndex >= 0) {
            whatWorked.splice(existingWorkedIndex, 1)
          }
        }

        const linkedEntity = linkedEntityByActionId.get(action.id) || null
        const workedValue = result === 'worked' ? true : result === 'not_worked' ? false : null
        const existingIndex = triedSolutions.findIndex((item) => item.text === action.title)
        if (existingIndex >= 0) {
          triedSolutions[existingIndex] = {
            ...triedSolutions[existingIndex],
            worked: workedValue,
            result,
            comment: normalizedComment,
            updatedAt,
            sourceActionKind: action.kind,
            sourcePlanMode: action.plan.mode,
            linkedEntityType: linkedEntity?.entityType || null,
            linkedEntityLabel: linkedEntity?.label || null,
          }
        } else {
          triedSolutions.push({
            text: action.title,
            worked: workedValue,
            result,
            comment: normalizedComment,
            updatedAt,
            sourceActionKind: action.kind,
            sourcePlanMode: action.plan.mode,
            linkedEntityType: linkedEntity?.entityType || null,
            linkedEntityLabel: linkedEntity?.label || null,
          })
        }

        feedbackLog.unshift({
          actionId: action.id,
          actionTitle: action.title,
          actionKind: action.kind,
          mode: action.plan.mode,
          result,
          comment: normalizedComment,
          updatedAt,
        })
        if (feedbackLog.length > 80) {
          feedbackLog.length = 80
        }

        const withFeedback = appendRunJournal(snapshot, {
          type: 'feedback_saved',
          at: updatedAt,
          mode: action.plan.mode as 'minimum' | 'base' | 'maximum',
          actionId: action.id,
          actionTitle: action.title,
          result,
          note: normalizedComment,
          policyCorrelationId: policyCorrelationId || null,
        })
        Object.assign(snapshot, withFeedback)
        if (policyCorrelationId) {
          const withOutcome = appendRunJournal(snapshot, {
            type: 'policy_outcome',
            at: updatedAt,
            mode: action.plan.mode as 'minimum' | 'base' | 'maximum',
            actionId: action.id,
            actionTitle: action.title,
            result,
            policyCorrelationId,
            note: normalizedComment,
          })
          Object.assign(snapshot, withOutcome)
        }
      }

      snapshot.feedbackLog = feedbackLog
      snapshot.contextUpdatedAt = new Date().toISOString()
      const compactedSnapshot = compactSnapshot(snapshot)
      await tx.leak.update({
        where: { id: leakId },
        data: {
          contextSnapshot: compactedSnapshot,
        },
      })

      const pattern = await tx.userAiPattern.upsert({
        where: { userId_leakType: { userId, leakType: leak.title } },
        update: {
          triedSolutions,
          whatWorked,
        },
        create: {
          userId,
          leakType: leak.title,
          lastAnalysis: null,
          triedSolutions,
          whatWorked,
          analysisCount: existingPattern?.analysisCount ?? 1,
          lastProvider: null,
        },
        select: {
          leakType: true,
          analysisCount: true,
          whatWorked: true,
          triedSolutions: true,
          updatedAt: true,
        },
      })

      return { pattern, reopened }
    })

    const plans = await loadPlans(leakId)
    const refreshedLeak = await db.leak.findUnique({
      where: { id: leakId },
      select: {
        id: true,
        status: true,
        resolvedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      plans,
      result,
      pattern: buildPatternResponse(updatedPattern.pattern),
      reopened: updatedPattern.reopened,
      leak: refreshedLeak,
      affectedActionIds: targetActionIds,
      bulk: targetActionIds.length > 1,
    })
  } catch (error) {
    console.error('Error saving leak feedback:', error)
    return NextResponse.json({ error: 'Failed to save leak feedback' }, { status: 500 })
  }
}
