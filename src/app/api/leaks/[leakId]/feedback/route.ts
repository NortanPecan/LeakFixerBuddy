import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireSelf } from '@/lib/server-auth'

const LeakFeedbackSchema = z.object({
  userId: z.string().min(1),
  solutionActionId: z.string().min(1),
  result: z.enum(['worked', 'partially', 'not_worked']),
  comment: z.string().max(1000).optional().nullable(),
})

function normalizeTriedSolution(
  item: unknown,
): { text: string; worked: boolean | null; result?: string; comment?: string | null } | null {
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

    const { userId, solutionActionId, result, comment } = parsed.data
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

    const action = await db.leakSolutionAction.findUnique({
      where: { id: solutionActionId },
      include: {
        plan: {
          select: {
            leakId: true,
          },
        },
      },
    })

    if (!action || action.plan.leakId !== leakId) {
      return NextResponse.json({ error: 'Plan action not found' }, { status: 404 })
    }

    await db.$transaction(async (tx) => {
      await tx.leakFeedback.upsert({
        where: {
          leakId_solutionActionId: {
            leakId,
            solutionActionId,
          },
        },
        update: {
          result,
          comment: comment?.trim() || null,
        },
        create: {
          leakId,
          solutionActionId,
          result,
          comment: comment?.trim() || null,
        },
      })

      const existingPattern = await tx.userAiPattern.findUnique({
        where: { userId_leakType: { userId, leakType: leak.title } },
        select: {
          triedSolutions: true,
          whatWorked: true,
          analysisCount: true,
        },
      })

      const triedSolutions = Array.isArray(existingPattern?.triedSolutions)
        ? (existingPattern?.triedSolutions as unknown[])
            .map(normalizeTriedSolution)
            .filter((item): item is NonNullable<ReturnType<typeof normalizeTriedSolution>> => Boolean(item))
        : []

      const workedValue = result === 'worked' ? true : result === 'not_worked' ? false : null
      const existingIndex = triedSolutions.findIndex((item) => item.text === action.title)

      if (existingIndex >= 0) {
        triedSolutions[existingIndex] = {
          ...triedSolutions[existingIndex],
          worked: workedValue,
          result,
          comment: comment?.trim() || null,
        }
      } else {
        triedSolutions.push({
          text: action.title,
          worked: workedValue,
          result,
          comment: comment?.trim() || null,
        })
      }

      const whatWorked = Array.isArray(existingPattern?.whatWorked)
        ? ([...(existingPattern?.whatWorked as string[])] as string[])
        : []

      if (result === 'worked' && !whatWorked.includes(action.title)) {
        whatWorked.push(action.title)
      }

      await tx.userAiPattern.upsert({
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
      })
    })

    const plans = await loadPlans(leakId)
    return NextResponse.json({ success: true, plans, result })
  } catch (error) {
    console.error('Error saving leak feedback:', error)
    return NextResponse.json({ error: 'Failed to save leak feedback' }, { status: 500 })
  }
}
