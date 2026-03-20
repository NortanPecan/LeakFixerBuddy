import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { requireSelf } from '@/lib/server-auth'

const ConvertLeakPlanSchema = z.object({
  userId: z.string().min(1),
  mode: z.enum(['minimum', 'base', 'maximum']).optional(),
  actionId: z.string().min(1).optional(),
})

type PlanMode = 'minimum' | 'base' | 'maximum'
type EntityType = 'task' | 'ritual' | 'challenge' | 'content' | 'skill' | 'trait'
type HealthCheckSummary = { removedLinks: number; patchedLinks: number }

function normalizeMetadata(metadata: unknown): Record<string, unknown> {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {}
  return { ...(metadata as Record<string, unknown>) }
}

function getPayloadObject(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {}
  }

  return payload as Record<string, unknown>
}

function toDateFromHint(hint: unknown): Date | null {
  if (typeof hint !== 'string' || !hint.trim()) return null

  const key = hint.trim().toLowerCase()
  const date = new Date()
  date.setHours(0, 0, 0, 0)

  if (key === 'today') return date
  if (key === 'tomorrow') {
    date.setDate(date.getDate() + 1)
    return date
  }
  if (key === 'this_week') {
    date.setDate(date.getDate() + 3)
    return date
  }
  if (key === 'next_week') {
    date.setDate(date.getDate() + 7)
    return date
  }

  const parsed = new Date(hint)
  if (!Number.isNaN(parsed.getTime())) return parsed

  return null
}

function mapSphereToZone(sphere: string | null | undefined) {
  const normalized = String(sphere || '').trim().toLowerCase()

  if (!normalized) return 'leakfixer'
  if (normalized.includes('фин')) return 'finance'
  if (normalized.includes('money')) return 'finance'
  if (normalized.includes('health')) return 'health'
  if (normalized.includes('well')) return 'health'
  if (normalized.includes('спорт')) return 'health'
  if (normalized.includes('fit')) return 'health'
  if (normalized.includes('отнош')) return 'relationships'
  if (normalized.includes('social')) return 'relationships'
  if (normalized.includes('learn')) return 'learning'
  if (normalized.includes('skill')) return 'learning'
  if (normalized.includes('work')) return 'productivity'
  if (normalized.includes('prod')) return 'productivity'

  return normalized
}

function mapSphereToRitualCategory(sphere: string | null | undefined) {
  const zone = mapSphereToZone(sphere)

  if (zone === 'finance') return 'money'
  if (zone === 'relationships') return 'relationships'
  if (zone === 'learning') return 'learning'
  if (zone === 'productivity') return 'productivity'
  if (zone === 'health') return 'health'

  return 'mind'
}

function mapSphereToTraitCategory(sphere: string | null | undefined) {
  const zone = mapSphereToZone(sphere)

  if (zone === 'finance') return 'productivity'
  if (zone === 'relationships') return 'social'
  if (zone === 'learning') return 'productivity'
  if (zone === 'health') return 'health'

  return 'mind'
}

async function entityExists(
  tx: Prisma.TransactionClient,
  entityType: string,
  entityId: string,
) {
  if (entityType === 'task') {
    return Boolean(await tx.task.findUnique({ where: { id: entityId }, select: { id: true } }))
  }
  if (entityType === 'ritual') {
    return Boolean(await tx.ritual.findUnique({ where: { id: entityId }, select: { id: true } }))
  }
  if (entityType === 'challenge') {
    return Boolean(await tx.challenge.findUnique({ where: { id: entityId }, select: { id: true } }))
  }
  if (entityType === 'content') {
    return Boolean(await tx.contentItem.findUnique({ where: { id: entityId }, select: { id: true } }))
  }
  if (entityType === 'skill') {
    return Boolean(await tx.skill.findUnique({ where: { id: entityId }, select: { id: true } }))
  }
  if (entityType === 'trait') {
    return Boolean(await tx.trait.findUnique({ where: { id: entityId }, select: { id: true } }))
  }
  return false
}

async function runLeakActionLinkHealthCheck(
  tx: Prisma.TransactionClient,
  leakId: string,
  plans: Array<{
    id: string
    mode: string
    actions: Array<{ id: string; kind: string; title: string }>
  }>,
): Promise<HealthCheckSummary> {
  const links = await tx.leakActionLink.findMany({
    where: { leakId },
    select: {
      id: true,
      entityType: true,
      entityId: true,
      label: true,
      metadata: true,
      status: true,
    },
  })

  const actions = plans.flatMap((plan) =>
    plan.actions.map((action) => ({
      ...action,
      planId: plan.id,
      planMode: plan.mode,
      titleKey: action.title.trim().toLowerCase(),
    })),
  )
  const actionsById = new Map(actions.map((action) => [action.id, action]))
  const actionsByKindTitle = new Map(actions.map((action) => [`${action.kind}|${action.titleKey}`, action]))

  let removedLinks = 0
  let patchedLinks = 0

  for (const link of links) {
    const exists = await entityExists(tx, link.entityType, link.entityId)
    if (!exists) {
      await tx.leakActionLink.delete({ where: { id: link.id } })
      removedLinks += 1
      continue
    }

    const metadata = normalizeMetadata(link.metadata)
    const sourceActionId =
      typeof metadata.sourceActionId === 'string' && metadata.sourceActionId
        ? metadata.sourceActionId
        : null
    const sourceActionKind =
      typeof metadata.sourceActionKind === 'string' ? metadata.sourceActionKind : null
    const sourceActionTitle =
      typeof metadata.sourceActionTitle === 'string' ? metadata.sourceActionTitle : null
    const byId = sourceActionId ? actionsById.get(sourceActionId) || null : null
    const fallbackByKey =
      sourceActionKind && sourceActionTitle
        ? actionsByKindTitle.get(`${sourceActionKind}|${sourceActionTitle.trim().toLowerCase()}`) || null
        : null
    const fallbackByLabel =
      actionsByKindTitle.get(`${link.entityType}|${link.label.trim().toLowerCase()}`) || null
    const resolvedAction = byId || fallbackByKey || fallbackByLabel

    let changed = false
    if (resolvedAction) {
      if (metadata.sourceActionId !== resolvedAction.id) {
        metadata.sourceActionId = resolvedAction.id
        changed = true
      }
      if (metadata.sourceActionTitle !== resolvedAction.title) {
        metadata.sourceActionTitle = resolvedAction.title
        changed = true
      }
      if (metadata.sourceActionKind !== resolvedAction.kind) {
        metadata.sourceActionKind = resolvedAction.kind
        changed = true
      }
      if (metadata.sourcePlanId !== resolvedAction.planId) {
        metadata.sourcePlanId = resolvedAction.planId
        changed = true
      }
      if (metadata.sourcePlanMode !== resolvedAction.planMode) {
        metadata.sourcePlanMode = resolvedAction.planMode
        changed = true
      }
      if (link.status !== 'active') {
        changed = true
      }
    } else if (sourceActionId || sourceActionKind || sourceActionTitle) {
      delete metadata.sourceActionId
      delete metadata.sourceActionTitle
      delete metadata.sourceActionKind
      delete metadata.sourcePlanId
      delete metadata.sourcePlanMode
      changed = true
    }

    if (changed) {
      await tx.leakActionLink.update({
        where: { id: link.id },
        data: {
          metadata,
          status: 'active',
        },
      })
      patchedLinks += 1
    }
  }

  return { removedLinks, patchedLinks }
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
      status: true,
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

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ leakId: string }> },
) {
  try {
    const body = await request.json()
    const parsed = ConvertLeakPlanSchema.safeParse(body)
    const { leakId } = await context.params

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid convert payload', issues: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { userId, mode, actionId } = parsed.data
    const auth = requireSelf(request, userId)
    if ('error' in auth) return auth.error

    const target = await getLeakForUser(leakId, userId)
    if ('error' in target) return target.error

    const plans = await db.leakSolutionPlan.findMany({
      where: { leakId },
      include: {
        actions: {
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

    if (plans.length === 0) {
      return NextResponse.json({ error: 'No plans found for leak' }, { status: 400 })
    }

    const selectedPlan =
      plans.find((plan) => mode ? plan.mode === mode : plan.isSelected) ||
      plans.find((plan) => plan.mode === ((mode || 'base') as PlanMode))

    if (!selectedPlan) {
      return NextResponse.json({ error: 'Selected plan not found' }, { status: 404 })
    }

    const targetActions = actionId
      ? selectedPlan.actions.filter((action) => action.id === actionId)
      : selectedPlan.actions

    if (actionId && targetActions.length === 0) {
      return NextResponse.json({ error: 'Selected action not found in plan' }, { status: 404 })
    }

    const zone = mapSphereToZone(target.leak.sphere)
    const ritualCategory = mapSphereToRitualCategory(target.leak.sphere)
    const traitCategory = mapSphereToTraitCategory(target.leak.sphere)

    const result = await db.$transaction(async (tx) => {
      const createdEntities: Array<{ entityType: EntityType; entityId: string; label: string }> = []
      let skippedActions = 0
      let reusedActions = 0
      const healthCheck = await runLeakActionLinkHealthCheck(tx, leakId, plans)
      const existingLinks = await tx.leakActionLink.findMany({
        where: { leakId },
        select: {
          entityType: true,
          entityId: true,
          label: true,
          metadata: true,
        },
      })

      for (const action of targetActions) {
        const payload = getPayloadObject(action.payload)
        const sharedMetadata = {
          ...(payload || {}),
          sourcePlanId: selectedPlan.id,
          sourcePlanMode: selectedPlan.mode,
          sourcePlanSummary: selectedPlan.summary,
          sourcePlanConfidenceLabel: selectedPlan.confidenceLabel,
          sourcePlanConfidenceReason: selectedPlan.confidenceReason || null,
          sourceActionId: action.id,
          sourceActionTitle: action.title,
          sourceActionKind: action.kind,
        }

        if (typeof payload.convertedEntityId === 'string' && payload.convertedEntityId) {
          skippedActions += 1
          continue
        }

        const existingLinkForAction = existingLinks.find((link) => {
          const metadata =
            link.metadata && typeof link.metadata === 'object' && !Array.isArray(link.metadata)
              ? (link.metadata as Record<string, unknown>)
              : {}
          return metadata.sourceActionId === action.id
        }) || existingLinks.find((link) => {
          const metadata =
            link.metadata && typeof link.metadata === 'object' && !Array.isArray(link.metadata)
              ? (link.metadata as Record<string, unknown>)
              : {}
          return (
            metadata.sourceActionKind === action.kind &&
            String(metadata.sourceActionTitle || '').trim().toLowerCase() === action.title.trim().toLowerCase()
          )
        }) || existingLinks.find(
          (link) => link.entityType === action.kind && link.label.trim().toLowerCase() === action.title.trim().toLowerCase(),
        )

        if (existingLinkForAction) {
          reusedActions += 1
          await tx.leakActionLink.upsert({
            where: {
              leakId_entityType_entityId: {
                leakId,
                entityType: existingLinkForAction.entityType,
                entityId: existingLinkForAction.entityId,
              },
            },
            update: {
              label: existingLinkForAction.label,
              status: 'active',
              metadata: sharedMetadata,
            },
            create: {
              leakId,
              entityType: existingLinkForAction.entityType,
              entityId: existingLinkForAction.entityId,
              label: existingLinkForAction.label,
              status: 'active',
              metadata: sharedMetadata,
            },
          })
          await tx.leakSolutionAction.update({
            where: { id: action.id },
            data: {
              payload: {
                ...payload,
                convertedEntityId: existingLinkForAction.entityId,
                convertedEntityType: existingLinkForAction.entityType,
                convertedEntityLabel: existingLinkForAction.label,
                convertedAt: new Date().toISOString(),
              },
            },
          })
          continue
        }

        let created:
          | { entityType: EntityType; entityId: string; label: string }
          | null = null

        if (action.kind === 'task') {
          const task = await tx.task.create({
            data: {
              userId,
              text: action.title,
              status: 'todo',
              date: toDateFromHint(payload.suggestedDeadline) || null,
              zone: zone || 'LeakFixer',
              notes: action.description || target.leak.description || target.leak.title,
            },
          })

          created = { entityType: 'task', entityId: task.id, label: task.text }
        } else if (action.kind === 'ritual') {
          const days = Array.isArray(payload.days)
            ? payload.days.filter((day): day is number => typeof day === 'number')
            : [1, 2, 3, 4, 5, 6, 7]

          const ritual = await tx.ritual.create({
            data: {
              userId,
              title: action.title,
              type: 'regular',
              category: ritualCategory,
              days: JSON.stringify(days),
              timeWindow: 'any',
              goalShort: target.leak.title,
              description: action.description || target.leak.description || target.leak.title,
              attributes: JSON.stringify(
                ritualCategory === 'health'
                  ? ['health', 'will']
                  : ritualCategory === 'relationships'
                    ? ['mind', 'will']
                    : ['mind', 'will'],
              ),
            },
          })

          created = { entityType: 'ritual', entityId: ritual.id, label: ritual.title }
        } else if (action.kind === 'challenge') {
          const challenge = await tx.challenge.create({
            data: {
              userId,
              name: action.title,
              title: action.title,
              description: action.description || target.leak.description || target.leak.title,
              type: 'custom',
              category: 'lifestyle',
              zone,
              duration:
                typeof payload.suggestedDurationDays === 'number'
                  ? payload.suggestedDurationDays
                  : 14,
              config: JSON.stringify({
                leakId,
                planId: selectedPlan.id,
                actionId: action.id,
                source: 'leak-plan',
              }),
              status: 'active',
            },
          })

          created = {
            entityType: 'challenge',
            entityId: challenge.id,
            label: challenge.title || challenge.name,
          }
        } else if (action.kind === 'content') {
          const item = await tx.contentItem.create({
            data: {
              userId,
              type: typeof payload.contentType === 'string' ? payload.contentType : 'article',
              title: action.title,
              description: action.description || target.leak.description || null,
              zone,
              status: 'planned',
            },
          })

          created = { entityType: 'content', entityId: item.id, label: item.title }
        } else if (action.kind === 'skill') {
          const skill = await tx.skill.create({
            data: {
              userId,
              name: action.title,
              description: action.description || null,
              category: zone === 'relationships' ? 'relationships' : zone === 'health' ? 'health' : 'general',
              importance: 2,
              color: '#10b981',
            },
          })

          created = { entityType: 'skill', entityId: skill.id, label: skill.name }
        } else if (action.kind === 'trait') {
          const trait = await tx.trait.create({
            data: {
              userId,
              name: action.title,
              description: action.description || null,
              type: 'positive',
              category: traitCategory,
              score: 5,
              targetScore: 7,
            },
          })

          created = { entityType: 'trait', entityId: trait.id, label: trait.name }
        }

        if (!created) {
          skippedActions += 1
          continue
        }

        createdEntities.push(created)
        existingLinks.push({
          entityType: created.entityType,
          entityId: created.entityId,
          label: created.label,
          metadata: sharedMetadata,
        })

        await tx.leakActionLink.upsert({
          where: {
            leakId_entityType_entityId: {
              leakId,
              entityType: created.entityType,
              entityId: created.entityId,
            },
          },
          update: {
            label: created.label,
            status: 'active',
            metadata: sharedMetadata,
          },
          create: {
            leakId,
            entityType: created.entityType,
            entityId: created.entityId,
            label: created.label,
            status: 'active',
            metadata: sharedMetadata,
          },
        })

        await tx.leakSolutionAction.update({
          where: { id: action.id },
          data: {
            payload: {
              ...payload,
              convertedEntityId: created.entityId,
              convertedEntityType: created.entityType,
              convertedEntityLabel: created.label,
              convertedAt: new Date().toISOString(),
            },
          },
        })
      }

      if (target.leak.status === 'new' && createdEntities.length > 0) {
        await tx.leak.update({
          where: { id: leakId },
          data: { status: 'in_progress' },
        })
      }

      const updatedLeak = await tx.leak.findUnique({
        where: { id: leakId },
        include: {
          actions: {
            orderBy: [
              { createdAt: 'desc' },
              { updatedAt: 'desc' },
            ],
          },
        },
      })

      const updatedPlans = await tx.leakSolutionPlan.findMany({
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

      return {
        updatedLeak,
        updatedPlans,
        createdEntities,
        skippedActions,
        reusedActions,
        healthCheck,
      }
    })

    return NextResponse.json({
      success: true,
      leak: result.updatedLeak,
      plans: result.updatedPlans,
      createdCount: result.createdEntities.length,
      skippedActions: result.skippedActions,
      reusedActions: result.reusedActions,
      healthCheck: result.healthCheck,
      createdEntities: result.createdEntities,
      appliedMode: selectedPlan.mode,
      appliedActionId: actionId || null,
    })
  } catch (error) {
    console.error('Error converting leak plan:', error)
    return NextResponse.json({ error: 'Failed to convert leak plan' }, { status: 500 })
  }
}
