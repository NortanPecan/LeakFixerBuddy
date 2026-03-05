import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/chains - Get all chains for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const status = searchParams.get('status') || 'active'

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const chains = await db.chain.findMany({
      where: {
        userId,
        status
      },
      include: {
        tasks: {
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    // Calculate chain stats
    const chainsWithStats = chains.map(chain => {
      const completedTasks = chain.tasks.filter(t => t.status === 'done').length
      const currentTask = chain.tasks.find(t => t.status === 'todo')
      const lastCompletedAt = chain.tasks
        .filter(t => t.status === 'done')
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0]?.updatedAt

      // Check if chain is stale (no activity for 7+ days)
      const daysSinceLastActivity = lastCompletedAt
        ? Math.floor((Date.now() - lastCompletedAt.getTime()) / (1000 * 60 * 60 * 24))
        : 999

      const isStale = daysSinceLastActivity >= 7 && chain.status === 'active'

      return {
        ...chain,
        completedCount: completedTasks,
        totalCount: chain.tasks.length,
        currentTask: currentTask ? {
          id: currentTask.id,
          text: currentTask.text,
          date: currentTask.date,
          daysWaiting: currentTask.date
            ? Math.floor((Date.now() - new Date(currentTask.date).getTime()) / (1000 * 60 * 60 * 24))
            : 0
        } : null,
        isStale,
        daysSinceLastActivity
      }
    })

    return NextResponse.json({ chains: chainsWithStats })
  } catch (error) {
    console.error('Error fetching chains:', error)
    return NextResponse.json({ error: 'Failed to fetch chains' }, { status: 500 })
  }
}

// POST /api/chains - Create a new chain
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, title, firstStepText } = body

    if (!userId || !title) {
      return NextResponse.json({ error: 'userId and title are required' }, { status: 400 })
    }

    // Create chain with first step
    const chain = await db.chain.create({
      data: {
        userId,
        title,
        status: 'active',
        tasks: firstStepText ? {
          create: {
            userId,
            text: firstStepText,
            status: 'todo',
            order: 0
          }
        } : undefined
      },
      include: {
        tasks: true
      }
    })

    return NextResponse.json({ chain })
  } catch (error) {
    console.error('Error creating chain:', error)
    return NextResponse.json({ error: 'Failed to create chain' }, { status: 500 })
  }
}

// PATCH /api/chains - Update a chain
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { chainId, status, title } = body

    if (!chainId) {
      return NextResponse.json({ error: 'chainId is required' }, { status: 400 })
    }

    const chain = await db.chain.update({
      where: { id: chainId },
      data: {
        ...(status && { status }),
        ...(title && { title })
      }
    })

    return NextResponse.json({ chain })
  } catch (error) {
    console.error('Error updating chain:', error)
    return NextResponse.json({ error: 'Failed to update chain' }, { status: 500 })
  }
}

// DELETE /api/chains - Delete a chain
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const chainId = searchParams.get('chainId')

    if (!chainId) {
      return NextResponse.json({ error: 'chainId is required' }, { status: 400 })
    }

    // Delete all tasks first
    await db.task.deleteMany({
      where: { chainId }
    })

    // Delete chain
    await db.chain.delete({
      where: { id: chainId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting chain:', error)
    return NextResponse.json({ error: 'Failed to delete chain' }, { status: 500 })
  }
}
