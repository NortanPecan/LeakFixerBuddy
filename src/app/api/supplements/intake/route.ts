import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { normalizeToDate, parseDateKey } from '@/lib/date-utils'

// POST /api/supplements/intake - Toggle intake checked status
// Body: { supplementId, userId, date?: string, checked: boolean }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { supplementId, userId, date, checked } = body

    if (!supplementId || !userId) {
      return NextResponse.json({ error: 'supplementId and userId are required' }, { status: 400 })
    }

    // Parse date or use today - normalize to start of day
    const targetDate = date ? parseDateKey(date) : normalizeToDate(new Date())

    // Find existing intake
    let intake = await db.supplementIntake.findFirst({
      where: {
        supplementId,
        date: targetDate
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
          date: targetDate,
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
