import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireSelf } from '@/lib/server-auth'

const LeakStatusSchema = z.enum(['new', 'in_progress', 'resolved', 'archived'])
const LeakSeveritySchema = z.enum(['info', 'warning', 'critical'])
const LeakSourceSchema = z.enum(['manual', 'signal', 'imported', 'ai_suggested'])
const LeakActionEntitySchema = z.enum(['task', 'ritual', 'challenge', 'content', 'skill', 'trait'])

const LeakActionLinkSchema = z.object({
  entityType: LeakActionEntitySchema,
  entityId: z.string().min(1),
  label: z.string().min(1).max(200),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
})

const CreateLeakSchema = z.object({
  userId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  source: LeakSourceSchema.optional(),
  severity: LeakSeveritySchema.optional(),
  sphere: z.string().max(100).optional().nullable(),
  contextSnapshot: z.record(z.string(), z.unknown()).optional().nullable(),
})

const UpdateLeakSchema = z.object({
  userId: z.string().min(1),
  id: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  status: LeakStatusSchema.optional(),
  severity: LeakSeveritySchema.optional(),
  sphere: z.string().max(100).optional().nullable(),
  contextSnapshot: z.record(z.string(), z.unknown()).optional().nullable(),
  appendAction: LeakActionLinkSchema.optional(),
})

// GET /api/leaks?userId=...&status=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const auth = requireSelf(request, userId)
    if ('error' in auth) return auth.error

    const where: {
      userId: string
      status?: string
    } = { userId }

    if (status && status !== 'all') {
      const parsedStatus = LeakStatusSchema.safeParse(status)
      if (!parsedStatus.success) {
        return NextResponse.json({ error: 'invalid status' }, { status: 400 })
      }
      where.status = parsedStatus.data
    }

    const leaks = await db.leak.findMany({
      where,
      include: {
        actions: {
          orderBy: [
            { createdAt: 'desc' },
            { updatedAt: 'desc' },
          ],
        },
      },
      orderBy: [
        { updatedAt: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
    })

    return NextResponse.json({ leaks })
  } catch (error) {
    console.error('Error fetching leaks:', error)
    return NextResponse.json({ error: 'Failed to fetch leaks' }, { status: 500 })
  }
}

// POST /api/leaks
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = CreateLeakSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid leak payload', issues: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { userId, title, description, source, severity, sphere, contextSnapshot } = parsed.data

    const auth = requireSelf(request, userId)
    if ('error' in auth) return auth.error

    const normalizedTitle = title.trim()
    const normalizedDescription = description?.trim() || null

    const duplicateLeak = await db.leak.findFirst({
      where: {
        userId,
        status: {
          in: ['new', 'in_progress'],
        },
        title: {
          equals: normalizedTitle,
          mode: 'insensitive',
        },
      },
      include: {
        actions: {
          orderBy: [
            { createdAt: 'desc' },
            { updatedAt: 'desc' },
          ],
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    if (duplicateLeak) {
      const sameDescription =
        !normalizedDescription ||
        (duplicateLeak.description || '').trim().toLowerCase() === normalizedDescription.toLowerCase()
      if (sameDescription) {
        return NextResponse.json({ leak: duplicateLeak, deduped: true })
      }
    }

    const leak = await db.leak.create({
      data: {
        userId,
        title: normalizedTitle,
        description: normalizedDescription,
        source: source || 'manual',
        severity: severity || 'warning',
        sphere: sphere?.trim() || null,
        contextSnapshot: contextSnapshot ?? null,
      },
      include: {
        actions: {
          orderBy: [
            { createdAt: 'desc' },
            { updatedAt: 'desc' },
          ],
        },
      },
    })

    return NextResponse.json({ leak })
  } catch (error) {
    console.error('Error creating leak:', error)
    return NextResponse.json({ error: 'Failed to create leak' }, { status: 500 })
  }
}

// PATCH /api/leaks
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = UpdateLeakSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid leak update payload', issues: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { userId, id, title, description, status, severity, sphere, contextSnapshot, appendAction } = parsed.data

    const auth = requireSelf(request, userId)
    if ('error' in auth) return auth.error

    const existingLeak = await db.leak.findUnique({
      where: { id },
      select: { userId: true, status: true },
    })

    if (!existingLeak) {
      return NextResponse.json({ error: 'Leak not found' }, { status: 404 })
    }

    if (existingLeak.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const leak = await db.$transaction(async (tx) => {
      await tx.leak.update({
        where: { id },
        data: {
          title: title?.trim(),
          description: description !== undefined ? (description?.trim() || null) : undefined,
          status,
          severity,
          sphere: sphere !== undefined ? (sphere?.trim() || null) : undefined,
          contextSnapshot: contextSnapshot !== undefined ? (contextSnapshot ?? null) : undefined,
          resolvedAt:
            status === 'resolved'
              ? new Date()
              : status && existingLeak.status === 'resolved'
                ? null
                : undefined,
        },
      })

      if (appendAction) {
        await tx.leakActionLink.upsert({
          where: {
            leakId_entityType_entityId: {
              leakId: id,
              entityType: appendAction.entityType,
              entityId: appendAction.entityId,
            },
          },
          update: {
            label: appendAction.label.trim(),
            status: appendAction.status || 'active',
            metadata: appendAction.metadata ?? null,
          },
          create: {
            leakId: id,
            entityType: appendAction.entityType,
            entityId: appendAction.entityId,
            label: appendAction.label.trim(),
            status: appendAction.status || 'active',
            metadata: appendAction.metadata ?? null,
          },
        })
      }

      return tx.leak.findUnique({
        where: { id },
        include: {
          actions: {
            orderBy: [
              { createdAt: 'desc' },
              { updatedAt: 'desc' },
            ],
          },
        },
      })
    })

    if (!leak) {
      return NextResponse.json({ error: 'Leak not found after update' }, { status: 404 })
    }

    return NextResponse.json({ leak })
  } catch (error) {
    console.error('Error updating leak:', error)
    return NextResponse.json({ error: 'Failed to update leak' }, { status: 500 })
  }
}
