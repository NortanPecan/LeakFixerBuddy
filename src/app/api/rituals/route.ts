import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { normalizeToDate, parseDateKey, formatDateKey, getDayOfWeek } from '@/lib/date-utils'

// GET - Fetch user's rituals with completions for a specific date
// /api/rituals?userId=xxx - Get rituals with today's completions
// /api/rituals?userId=xxx&date=YYYY-MM-DD - Get rituals with completions for specific date
// /api/rituals?userId=xxx&status=all - Get all rituals (including archived)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const status = searchParams.get('status') || 'active'
    const dateParam = searchParams.get('date')

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    // Parse target date (default to today)
    const targetDate = dateParam ? parseDateKey(dateParam) : normalizeToDate(new Date())
    const targetDayOfWeek = getDayOfWeek(targetDate)

    // Get all rituals for user
    const rituals = await db.ritual.findMany({
      where: { 
        userId,
        status: status === 'all' ? undefined : status 
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        completions: {
          where: {
            date: targetDate
          }
        }
      }
    })

    // Filter rituals by day of week and add completion status
    const ritualsData = rituals.map(ritual => {
      const days = JSON.parse(ritual.days as string) as number[]
      const isScheduledToday = days.length === 0 || days.includes(targetDayOfWeek)
      
      // Check completed for target date
      const completion = ritual.completions[0]
      const completed = completion?.completed ?? false

      // Calculate streak (last 30 days)
      return {
        ...ritual,
        days: undefined, // Remove raw JSON string
        daysArray: days,
        isScheduledToday,
        completed,
        completionNote: completion?.note,
        completionMood: completion?.mood,
        completions: undefined // Remove from response
      }
    })

    // Filter to only scheduled rituals for today view
    const todayRituals = ritualsData.filter(r => r.isScheduledToday)
    const completedToday = todayRituals.filter(r => r.completed).length

    return NextResponse.json({
      success: true,
      date: formatDateKey(targetDate),
      dayOfWeek: targetDayOfWeek,
      stats: {
        total: todayRituals.length,
        completed: completedToday,
        percentage: todayRituals.length > 0 ? Math.round((completedToday / todayRituals.length) * 100) : 0
      },
      rituals: ritualsData,
      todayRituals
    })
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

    return NextResponse.json({ success: true, ritual })
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

    return NextResponse.json({ success: true, ritual })
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

    return NextResponse.json({ success: true, ritual })
  } catch (error) {
    console.error('Archive ritual error:', error)
    return NextResponse.json({ error: 'Failed to archive ritual' }, { status: 500 })
  }
}
