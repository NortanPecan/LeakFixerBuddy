import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

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
    const { userId, chainId, text, date, time, zone, ritualId, notes, order } = body

    if (!userId || !text) {
      return NextResponse.json({ error: 'userId and text are required' }, { status: 400 })
    }

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
    const { taskId, text, status, date, time, zone, notes, order, chainId } = body

    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 })
    }

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

    // Get task to find its chain and order
    const task = await db.task.findUnique({
      where: { id: taskId },
      select: { chainId: true, order: true }
    })

    // Delete task
    await db.task.delete({
      where: { id: taskId }
    })

    // Reorder remaining tasks in chain if needed
    if (task?.chainId) {
      const remainingTasks = await db.task.findMany({
        where: { chainId: task.chainId },
        orderBy: { order: 'asc' }
      })

      // Update order for all tasks
      for (let i = 0; i < remainingTasks.length; i++) {
        if (remainingTasks[i].order !== i) {
          await db.task.update({
            where: { id: remainingTasks[i].id },
            data: { order: i }
          })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
  }
}
