import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST - Mark ritual as complete/incomplete for a date
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ritualId, userId, date, completed = true, note, mood } = body

    if (!ritualId || !userId) {
      return NextResponse.json({ error: 'ritualId and userId required' }, { status: 400 })
    }

    // Get the ritual to check attributes
    const ritual = await db.ritual.findUnique({
      where: { id: ritualId }
    })

    if (!ritual) {
      return NextResponse.json({ error: 'Ritual not found' }, { status: 404 })
    }

    // Parse date or use today
    const completionDate = date ? new Date(date) : new Date()
    completionDate.setHours(12, 0, 0, 0) // Normalize to noon

    // Upsert completion
    const completion = await db.ritualCompletion.upsert({
      where: {
        ritualId_date: {
          ritualId,
          date: completionDate
        }
      },
      update: {
        completed,
        note,
        mood
      },
      create: {
        ritualId,
        userId,
        date: completionDate,
        completed,
        note,
        mood
      }
    })

    // Update user attributes if completed
    if (completed && ritual.attributes) {
      const attributes = JSON.parse(ritual.attributes as string) as string[]
      for (const attr of attributes) {
        await db.userAttribute.upsert({
          where: {
            userId_key: {
              userId,
              key: attr
            }
          },
          update: {
            points: { increment: 10 }
          },
          create: {
            userId,
            key: attr,
            points: 10,
            level: 1
          }
        })
      }

      // Update level if points threshold reached
      const attrRecords = await db.userAttribute.findMany({
        where: { userId }
      })
      
      for (const attrRecord of attrRecords) {
        const newLevel = Math.floor(attrRecord.points / 100) + 1
        if (newLevel > attrRecord.level) {
          await db.userAttribute.update({
            where: { id: attrRecord.id },
            data: { level: newLevel }
          })
        }
      }
    }

    // Check achievements
    if (completed) {
      await checkAchievements(userId, ritualId)
    }

    return NextResponse.json({ completion })
  } catch (error) {
    console.error('Complete ritual error:', error)
    return NextResponse.json({ error: 'Failed to complete ritual' }, { status: 500 })
  }
}

// GET - Get completions for a ritual
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ritualId = searchParams.get('ritualId')
    const userId = searchParams.get('userId')
    const days = parseInt(searchParams.get('days') || '30')

    if (!ritualId) {
      return NextResponse.json({ error: 'ritualId required' }, { status: 400 })
    }

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    const completions = await db.ritualCompletion.findMany({
      where: {
        ritualId,
        date: { gte: startDate }
      },
      orderBy: { date: 'asc' }
    })

    // Calculate streak
    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Get ritual to check days
    const ritual = await db.ritual.findUnique({
      where: { id: ritualId }
    })
    
    if (ritual) {
      const ritualDays = JSON.parse(ritual.days as string) as number[]
      const completionMap = new Map(
        completions.map(c => [
          c.date.toISOString().split('T')[0],
          c.completed
        ])
      )

      // Count consecutive completed days
      let checkDate = new Date(today)
      for (let i = 0; i < days; i++) {
        const dateStr = checkDate.toISOString().split('T')[0]
        const dayOfWeek = checkDate.getDay() || 7
        
        // Only check days that should have this ritual
        if (ritualDays.includes(dayOfWeek)) {
          if (completionMap.get(dateStr)) {
            streak++
          } else if (checkDate < today) {
            // Past day without completion breaks streak
            break
          }
        }
        
        checkDate.setDate(checkDate.getDate() - 1)
      }
    }

    // Calculate stats
    const completedCount = completions.filter(c => c.completed).length
    const stats = {
      streak,
      completedDays: completedCount,
      totalDays: days,
      completionRate: Math.round((completedCount / days) * 100)
    }

    return NextResponse.json({ completions, stats })
  } catch (error) {
    console.error('Fetch completions error:', error)
    return NextResponse.json({ error: 'Failed to fetch completions' }, { status: 500 })
  }
}

// Check and award achievements
async function checkAchievements(userId: string, ritualId: string) {
  try {
    // Get total completions for this ritual
    const completions = await db.ritualCompletion.count({
      where: { ritualId, completed: true }
    })

    // Streak achievements
    const streakAchievements = [
      { code: 'RITUAL_STREAK_3', threshold: 3 },
      { code: 'RITUAL_STREAK_7', threshold: 7 },
      { code: 'RITUAL_STREAK_30', threshold: 30 },
    ]

    for (const achievement of streakAchievements) {
      if (completions >= achievement.threshold) {
        await db.achievement.upsert({
          where: { userId_code: { userId, code: achievement.code } },
          update: {},
          create: { userId, code: achievement.code }
        })
      }
    }
  } catch (error) {
    console.error('Check achievements error:', error)
  }
}
