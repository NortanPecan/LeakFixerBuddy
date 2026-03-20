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

const CONTEXT_LOOKBACK_DAYS = 7

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

  const [dailyStates, foodEntries, fitnessDays, transactions, emotionLogs, activeSupplementsCount, supplementIntakeCheckedCount, workoutCount, ritualCount, checkins, doneTasksCount, openTasksCount, linkedEntities, feedbackRows] =
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

    const previousSnapshot =
      target.leak.contextSnapshot &&
      typeof target.leak.contextSnapshot === 'object' &&
      !Array.isArray(target.leak.contextSnapshot)
        ? (target.leak.contextSnapshot as Record<string, unknown>)
        : {}
    const liveContext = await buildLiveLeakContext(userId, leakId)
    const mergedSnapshot = {
      ...previousSnapshot,
      live: liveContext,
      history: liveContext.history,
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
