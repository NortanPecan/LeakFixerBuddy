import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { requireSelf } from '@/lib/server-auth'

const CreateTaskSchema = z.object({
  userId: z.string().min(1),
  text: z.string().min(1).max(500),
  chainId: z.string().optional().nullable(),
  date: z.string().optional().nullable(),
  time: z.string().optional().nullable(),
  zone: z.string().optional().nullable(),
  ritualId: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  order: z.number().int().optional(),
})

const UpdateTaskSchema = z.object({
  taskId: z.string().min(1),
  text: z.string().min(1).max(500).optional(),
  status: z.enum(['todo', 'done', 'skipped']).optional(),
  date: z.string().optional().nullable(),
  time: z.string().optional().nullable(),
  zone: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  order: z.number().int().optional(),
  chainId: z.string().optional().nullable(),
})

// GET /api/tasks - Get tasks for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const date = searchParams.get('date') // YYYY-MM-DD format
    const chainId = searchParams.get('chainId')
    const status = searchParams.get('status')
    const noDate = searchParams.get('noDate') === 'true'

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const auth = requireSelf(request, userId)
    if ('error' in auth) return auth.error

    const where: {
      userId: string
      chainId?: string | null
      status?: string
      date?: { gte?: Date; lte?: Date } | null
    } = { userId }

    if (chainId) {
      where.chainId = chainId
    }

    if (status) {
      where.status = status
    }

    if (noDate) {
      where.date = null
    } else if (date) {
      const dateStart = new Date(date)
      dateStart.setHours(0, 0, 0, 0)
      const dateEnd = new Date(date)
      dateEnd.setHours(23, 59, 59, 999)
      where.date = { gte: dateStart, lte: dateEnd }
    }

    const tasks = await db.task.findMany({
      where,
      include: {
        chain: true
      },
      orderBy: [
        { order: 'asc' },
        { createdAt: 'asc' }
      ]
    })

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = CreateTaskSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
    }
    const { userId, chainId, text, date, time, zone, ritualId, notes, order } = parsed.data
    const auth = requireSelf(request, userId)
    if ('error' in auth) return auth.error

    // If adding to a chain, get the next order number
    let taskOrder = order ?? 0
    if (chainId && order === undefined) {
      const lastTask = await db.task.findFirst({
        where: { chainId },
        orderBy: { order: 'desc' }
      })
      taskOrder = (lastTask?.order ?? -1) + 1
    }

    const task = await db.task.create({
      data: {
        userId,
        chainId: chainId || null,
        text,
        status: 'todo',
        order: taskOrder,
        date: date ? new Date(date) : null,
        time: time || null,
        zone: zone || null,
        ritualId: ritualId || null,
        notes: notes || null
      },
      include: {
        chain: true
      }
    })

    return NextResponse.json({ task })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}

// PATCH /api/tasks - Update a task
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = UpdateTaskSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
    }
    const { taskId, text, status, date, time, zone, notes, order, chainId } = parsed.data

    const existingTask = await db.task.findUnique({
      where: { id: taskId },
      select: { userId: true },
    })

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const auth = requireSelf(request, existingTask.userId)
    if ('error' in auth) return auth.error

    const task = await db.task.update({
      where: { id: taskId },
      data: {
        ...(text !== undefined && { text }),
        ...(status !== undefined && { status }),
        ...(date !== undefined && { date: date ? new Date(date) : null }),
        ...(time !== undefined && { time: time || null }),
        ...(zone !== undefined && { zone: zone || null }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(order !== undefined && { order }),
        ...(chainId !== undefined && { chainId: chainId || null })
      },
      include: {
        chain: true
      }
    })

    return NextResponse.json({ task })
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}

// DELETE /api/tasks - Delete a task
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')

    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 })
    }

    const existingTask = await db.task.findUnique({
      where: { id: taskId },
      select: { userId: true },
    })

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const auth = requireSelf(request, existingTask.userId)
    if ('error' in auth) return auth.error

    // Use transaction for atomic delete + reorder
    await db.$transaction(async (tx) => {
      // Get task to find its chain and order
      const task = await tx.task.findUnique({
        where: { id: taskId },
        select: { chainId: true, order: true }
      })

      if (!task) {
        throw new Error('Task not found')
      }

      // Delete task
      await tx.task.delete({
        where: { id: taskId }
      })

      // Reorder remaining tasks in chain if needed
      if (task.chainId) {
        const remainingTasks = await tx.task.findMany({
          where: { chainId: task.chainId },
          orderBy: { order: 'asc' },
          select: { id: true, order: true }
        })

        // Build bulk update operations
        const updates = remainingTasks
          .map((t, i) => {
            if (t.order !== i) {
              return tx.task.update({
                where: { id: t.id },
                data: { order: i }
              })
            }
            return null
          })
          .filter((u): u is NonNullable<typeof u> => u !== null)

        // Execute all updates in parallel within transaction
        await Promise.all(updates)
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
  }
}
