import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { parseDateKey, formatDateKey, getStartOfDay } from '@/lib/date-utils'
import { 
  getQuestionsForPreset, 
  PRESET_INFO, 
  PresetLevel,
  getDailyQuestionsCount
} from '@/lib/wellbeing-config'
import { 
  calculateWellbeingScore, 
  countAnsweredQuestions
} from '@/lib/wellbeing-utils'
import { requireSelf } from '@/lib/server-auth'

/**
 * GET /api/wellbeing/daily?userId=xxx&date=YYYY-MM-DD
 * Get daily wellbeing data for a specific date
 * 
 * BUG-5 FIX: Returns recordPreset (original preset from DB) separately from current settings preset
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const dateStr = searchParams.get('date')

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }
    await requireSelf(request, userId)

    const targetDate = dateStr ? parseDateKey(dateStr) : new Date()
    const dateKey = formatDateKey(targetDate)

    // Get user settings for current preset
    let settings = await db.userWellbeingSettings.findUnique({
      where: { userId }
    })
    
    const currentSettingsPreset = (settings?.preset || 'core') as PresetLevel

    // Get existing daily wellbeing record
    const dailyWellbeing = await db.dailyWellbeing.findFirst({
      where: {
        userId,
        date: getStartOfDay(targetDate)
      }
    })

    // BUG-5 FIX: Use record's preset if exists, otherwise use current settings
    const recordPreset = (dailyWellbeing?.preset || null) as PresetLevel | null
    const displayPreset = (recordPreset || currentSettingsPreset) as PresetLevel
    
    const presetInfo = PRESET_INFO[displayPreset]
    const questions = getQuestionsForPreset(displayPreset, 'daily')

    const answers = dailyWellbeing?.answers 
      ? JSON.parse(dailyWellbeing.answers) 
      : {}
    
    const scores = dailyWellbeing?.scores 
      ? JSON.parse(dailyWellbeing.scores) 
      : null

    const answeredCount = countAnsweredQuestions(answers, displayPreset, 'daily')
    const totalQuestions = getDailyQuestionsCount(displayPreset)

    return NextResponse.json({
      success: true,
      data: {
        date: dateKey,
        preset: displayPreset,
        recordPreset,  // BUG-5 FIX: Original preset from record
        currentSettingsPreset,
        presetInfo,
        questions,
        answers,
        scores,
        progress: {
          answered: answeredCount,
          total: totalQuestions,
          percentage: totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0,
          isComplete: answeredCount >= totalQuestions
        },
        completedAt: dailyWellbeing?.completedAt || null
      }
    })
  } catch (error) {
    console.error('Get daily wellbeing error:', error)
    return NextResponse.json({ error: 'Failed to get daily wellbeing' }, { status: 500 })
  }
}

/**
 * POST /api/wellbeing/daily
 * Save or update daily wellbeing answers
 * Body: { userId, date?: string, preset, answers: { questionId: value } }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, date, preset, answers } = body

    if (!userId || !preset || !answers) {
      return NextResponse.json({ error: 'userId, preset, and answers required' }, { status: 400 })
    }
    await requireSelf(request, userId)

    const validPresets = ['core', 'expanded', 'full']
    if (!validPresets.includes(preset)) {
      return NextResponse.json({ error: 'Invalid preset' }, { status: 400 })
    }

    // Verify user exists
    const userExists = await db.appUser.findUnique({ where: { id: userId } })
    if (!userExists) {
      console.error('User not found:', userId)
      return NextResponse.json({ error: 'User not found. Please refresh the page.' }, { status: 401 })
    }

    const targetDate = date ? parseDateKey(date) : new Date()
    const dateKey = formatDateKey(targetDate)
    
    // Calculate scores
    const scores = calculateWellbeingScore(answers, preset as PresetLevel, 'daily')
    
    // Check if all questions answered
    const answeredCount = countAnsweredQuestions(answers, preset as PresetLevel, 'daily')
    const totalQuestions = getDailyQuestionsCount(preset as PresetLevel)
    const isComplete = answeredCount >= totalQuestions

    // Find existing record for this user and date
    const existing = await db.dailyWellbeing.findFirst({
      where: {
        userId,
        date: getStartOfDay(targetDate)
      }
    })

    const dailyWellbeing = existing
      ? await db.dailyWellbeing.update({
          where: { id: existing.id },
          data: {
            preset,
            answers: JSON.stringify(answers),
            scores: JSON.stringify(scores),
            completedAt: isComplete ? new Date() : null
          }
        })
      : await db.dailyWellbeing.create({
          data: {
            userId,
            date: getStartOfDay(targetDate),
            preset,
            answers: JSON.stringify(answers),
            scores: JSON.stringify(scores),
            completedAt: isComplete ? new Date() : null
          }
        })

    return NextResponse.json({
      success: true,
      data: {
        date: dateKey,
        preset,
        scores,
        progress: {
          answered: answeredCount,
          total: totalQuestions,
          percentage: totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 100,
          isComplete
        },
        completedAt: dailyWellbeing.completedAt
      }
    })
  } catch (error) {
    console.error('Save daily wellbeing error:', error)
    // Check if it's a foreign key error (user doesn't exist)
    if (error instanceof Error && error.message.includes('Foreign key')) {
      return NextResponse.json({ error: 'User not found. Please login again.' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to save daily wellbeing' }, { status: 500 })
  }
}

/**
 * DELETE /api/wellbeing/daily
 * Delete daily wellbeing record for a specific date
 * Body: { userId, date }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, date } = body

    if (!userId || !date) {
      return NextResponse.json({ error: 'userId and date required' }, { status: 400 })
    }
    await requireSelf(request, userId)

    const targetDate = parseDateKey(date)

    // Delete the record
    const deleted = await db.dailyWellbeing.deleteMany({
      where: {
        userId,
        date: getStartOfDay(targetDate)
      }
    })

    return NextResponse.json({
      success: true,
      deleted: deleted.count > 0
    })
  } catch (error) {
    console.error('Delete daily wellbeing error:', error)
    return NextResponse.json({ error: 'Failed to delete daily wellbeing' }, { status: 500 })
  }
}

/**
 * PUT /api/wellbeing/daily?userId=xxx&days=7
 * Get history for last N days
 */
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const days = parseInt(searchParams.get('days') || '7')

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }
    await requireSelf(request, userId)

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    const records = await db.dailyWellbeing.findMany({
      where: {
        userId,
        date: { gte: startDate }
      },
      orderBy: { date: 'desc' }
    })

    return NextResponse.json({
      success: true,
      history: records.map(r => ({
        date: formatDateKey(r.date),
        preset: r.preset,
        scores: r.scores ? JSON.parse(r.scores) : null,
        completedAt: r.completedAt
      }))
    })
  } catch (error) {
    console.error('Get wellbeing history error:', error)
    return NextResponse.json({ error: 'Failed to get history' }, { status: 500 })
  }
}
