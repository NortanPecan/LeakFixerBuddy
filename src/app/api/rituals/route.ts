import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  formatDateKey,
  getDayOfWeek,
  normalizeToDate,
  parseDateKey,
} from '@/lib/date-utils'
import { isScheduledDay, parseScheduleDays } from '@/lib/streak-utils'
import { requireSelf } from '@/lib/server-auth'

/**
 * GET /api/rituals?userId=xxx
 * GET /api/rituals?userId=xxx&date=YYYY-MM-DD
 * GET /api/rituals?userId=xxx&status=all
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const status = searchParams.get('status') || 'active'
    const dateParam = searchParams.get('date')

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const auth = requireSelf(request, userId)
    if ('error' in auth) return auth.error

    const targetDate = dateParam ? parseDateKey(dateParam) : normalizeToDate(new Date())
    const targetDayOfWeek = getDayOfWeek(targetDate)

    const rituals = await db.ritual.findMany({
      where: {
        userId,
        status: status === 'all' ? undefined : status,
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        completions: {
          where: {
            date: targetDate,
          },
        },
      },
    })

    const ritualsData = rituals.map((ritual) => {
      const days = parseScheduleDays(ritual.days)
      const isScheduledToday = days.length === 0 || days.includes(targetDayOfWeek)
      const completion = ritual.completions[0]
      const completedToday = completion?.completed ?? false

      return {
        ...ritual,
        days,
        isScheduledToday,
        completedToday,
        completionNote: completion?.note,
        completionMood: completion?.mood,
        completions: undefined,
      }
    })

    const todayRituals = ritualsData.filter((ritual) => ritual.isScheduledToday)
    const completedCount = todayRituals.filter((ritual) => ritual.completedToday).length

    return NextResponse.json({
      success: true,
      date: formatDateKey(targetDate),
      dayOfWeek: targetDayOfWeek,
      stats: {
        total: todayRituals.length,
        completed: completedCount,
        percentage: todayRituals.length > 0
          ? Math.round((completedCount / todayRituals.length) * 100)
          : 0,
      },
      rituals: ritualsData,
      todayRituals,
    })
  } catch (error) {
    console.error('Fetch rituals error:', error)
    return NextResponse.json({ error: 'Failed to fetch rituals' }, { status: 500 })
  }
}

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
      contentId,
    } = body

    if (!userId || !title || !category) {
      return NextResponse.json({ error: 'userId, title, and category required' }, { status: 400 })
    }

    const auth = requireSelf(request, userId)
    if ('error' in auth) return auth.error

    const existingRitual = await db.ritual.findFirst({
      where: {
        userId,
        title: { equals: title, mode: 'insensitive' },
        status: 'active',
      },
    })

    if (existingRitual) {
      return NextResponse.json(
        { error: `Ritual with title "${title}" already exists` },
        { status: 400 }
      )
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
      },
    })

    const attrKeys = ['health', 'mind', 'will']
    for (const key of attrKeys) {
      await db.userAttribute.upsert({
        where: { userId_key: { userId, key } },
        update: {},
        create: { userId, key, points: 0, level: 1 },
      })
    }

    return NextResponse.json({ success: true, ritual })
  } catch (error) {
    console.error('Create ritual error:', error)
    return NextResponse.json({ error: 'Failed to create ritual' }, { status: 500 })
  }
}

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
      sortOrder,
    } = body

    if (!ritualId) {
      return NextResponse.json({ error: 'ritualId required' }, { status: 400 })
    }

    const existingRitual = await db.ritual.findUnique({
      where: { id: ritualId },
      select: { userId: true },
    })

    if (!existingRitual) {
      return NextResponse.json({ error: 'Ritual not found' }, { status: 404 })
    }

    const auth = requireSelf(request, existingRitual.userId)
    if ('error' in auth) return auth.error

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
      data: updateData,
    })

    return NextResponse.json({ success: true, ritual })
  } catch (error) {
    console.error('Update ritual error:', error)
    return NextResponse.json({ error: 'Failed to update ritual' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ritualId = searchParams.get('ritualId')
    const permanent = searchParams.get('permanent') === 'true'

    if (!ritualId) {
      return NextResponse.json({ error: 'ritualId required' }, { status: 400 })
    }

    const existingRitual = await db.ritual.findUnique({
      where: { id: ritualId },
      select: { userId: true },
    })

    if (!existingRitual) {
      return NextResponse.json({ error: 'Ritual not found' }, { status: 404 })
    }

    const auth = requireSelf(request, existingRitual.userId)
    if ('error' in auth) return auth.error

    if (permanent) {
      await db.ritual.delete({ where: { id: ritualId } })
      return NextResponse.json({ success: true, deleted: true })
    }

    const ritual = await db.ritual.update({
      where: { id: ritualId },
      data: { status: 'archived' },
    })

    return NextResponse.json({ success: true, ritual })
  } catch (error) {
    console.error('Archive/delete ritual error:', error)
    return NextResponse.json({ error: 'Failed to delete ritual' }, { status: 500 })
  }
}
