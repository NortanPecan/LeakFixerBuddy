import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

import { startOfDay, endOfDay } from '@/lib/date-utils'

// Helper functions
function getStartOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function getEndOfDay(date: Date): Date {
  const d = getStartOfDay(date)
  d.setDate(d.getDate() + 1)
  return d
}

// POST /api/supplements/intake - Toggle intake checked status
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { supplementId, userId, date, checked } = body

    if (!supplementId || !userId) {
      return NextResponse.json({ error: 'supplementId and userId are required' }, { status: 400 })
    }

    // Get target date (start of day)
    const targetDate = date ? new Date(date) : new Date()
    const startOfTargetDay = getStartOfDay(targetDate)
    const endOfTargetDay = getEndOfDay(targetDate)

    // Find or create intake
    let intake = await db.supplementIntake.findFirst({
      where: {
        supplementId,
        date: {
          gte: startOfTargetDay,
          lt: endOfTargetDay
        }
      }
    })

    if (intake) {
      // Update
      intake = await db.supplementIntake.update({
        where: { id: intake.id },
        data: { checked }
      })
    } else {
      // Create new intake
      intake = await db.supplementIntake.create({
        data: {
          supplementId,
          userId,
          date: startOfTargetDay,
          checked
        }
      })
    }

    return NextResponse.json({ success: true, intake })
  } catch (error) {
    console.error('Error toggling intake:', error)
    return NextResponse.json({ error: 'Failed to toggle intake' }, { status: 500 })
  }
}
