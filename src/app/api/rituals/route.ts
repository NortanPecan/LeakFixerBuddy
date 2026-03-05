import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Fetch user's rituals
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const status = searchParams.get('status') || 'active'

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const rituals = await db.ritual.findMany({
      where: { 
        userId,
        status: status === 'all' ? undefined : status 
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        completions: {
          where: {
            date: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          }
        }
      }
    })

    // Calculate streak and today's completion
    const ritualsData = rituals.map(ritual => {
      // Check completed today
      const completedToday = ritual.completions.some(c => c.completed)
      
      // Calculate streak
      return {
        ...ritual,
        completedToday,
        completions: undefined // Remove from response
      }
    })

    return NextResponse.json({ rituals: ritualsData })
  } catch (error) {
    console.error('Fetch rituals error:', error)
    return NextResponse.json({ error: 'Failed to fetch rituals' }, { status: 500 })
  }
}

// POST - Create new ritual
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      userId, 
      title, 
      type, 
      category, 
      days, 
      timeWindow, 
      reminder, 
      reminderTime, 
      goalShort, 
      description, 
      attributes,
      isFromPreset,
      presetId,
      sortOrder,
      contentId
    } = body

    if (!userId || !title || !category) {
      return NextResponse.json({ error: 'userId, title, and category required' }, { status: 400 })
    }

    const ritual = await db.ritual.create({
      data: {
        userId,
        title,
        type: type || 'regular',
        category,
        days: JSON.stringify(days || [1, 2, 3, 4, 5, 6, 7]),
        timeWindow: timeWindow || 'any',
        reminder: reminder || false,
        reminderTime,
        goalShort,
        description,
        attributes: JSON.stringify(attributes || []),
        isFromPreset: isFromPreset || false,
        presetId,
        sortOrder: sortOrder || 0,
        contentId: contentId || null,
      }
    })

    // Initialize user attributes if not exists
    const attrKeys = ['health', 'mind', 'will']
    for (const key of attrKeys) {
      await db.userAttribute.upsert({
        where: { userId_key: { userId, key } },
        update: {},
        create: { userId, key, points: 0, level: 1 }
      })
    }

    return NextResponse.json({ ritual })
  } catch (error) {
    console.error('Create ritual error:', error)
    return NextResponse.json({ error: 'Failed to create ritual' }, { status: 500 })
  }
}

// PATCH - Update ritual
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      ritualId, 
      title, 
      days, 
      timeWindow, 
      reminder, 
      reminderTime, 
      goalShort, 
      description, 
      attributes,
      status,
      sortOrder
    } = body

    if (!ritualId) {
      return NextResponse.json({ error: 'ritualId required' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (title !== undefined) updateData.title = title
    if (days !== undefined) updateData.days = JSON.stringify(days)
    if (timeWindow !== undefined) updateData.timeWindow = timeWindow
    if (reminder !== undefined) updateData.reminder = reminder
    if (reminderTime !== undefined) updateData.reminderTime = reminderTime
    if (goalShort !== undefined) updateData.goalShort = goalShort
    if (description !== undefined) updateData.description = description
    if (attributes !== undefined) updateData.attributes = JSON.stringify(attributes)
    if (status !== undefined) updateData.status = status
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder

    const ritual = await db.ritual.update({
      where: { id: ritualId },
      data: updateData
    })

    return NextResponse.json({ ritual })
  } catch (error) {
    console.error('Update ritual error:', error)
    return NextResponse.json({ error: 'Failed to update ritual' }, { status: 500 })
  }
}

// DELETE - Archive ritual
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ritualId = searchParams.get('ritualId')

    if (!ritualId) {
      return NextResponse.json({ error: 'ritualId required' }, { status: 400 })
    }

    // Archive instead of delete
    const ritual = await db.ritual.update({
      where: { id: ritualId },
      data: { status: 'archived' }
    })

    return NextResponse.json({ ritual })
  } catch (error) {
    console.error('Archive ritual error:', error)
    return NextResponse.json({ error: 'Failed to archive ritual' }, { status: 500 })
  }
}
