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
    return NextResponse.json({ plans })
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
    const body = (await request.json()) as { userId?: string; regenerate?: boolean }
    const { leakId } = await context.params
    const userId = body.userId
    const regenerate = body.regenerate === true

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
        return NextResponse.json({ plans: existingPlans, cached: true })
      }
    }

    const { plans, provider } = await generateLeakPlans({
      userId,
      leak: target.leak,
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
            isSelected: plan.mode === 'base',
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
    return NextResponse.json({ plans: storedPlans, provider, cached: false })
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
    })

    const plans = await loadPlans(leakId)
    return NextResponse.json({ plans, selectedMode: mode })
  } catch (error) {
    console.error('Error selecting leak plan:', error)
    return NextResponse.json({ error: 'Failed to select leak plan' }, { status: 500 })
  }
}
