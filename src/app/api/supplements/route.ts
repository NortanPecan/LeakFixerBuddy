import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/supplements?userId=xxx - Get all supplements with today's intake status
// GET /api/supplements?userId=xxx&date=YYYY-MM-DD - Get supplements for specific date
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const dateParam = searchParams.get('date')
  
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  try {
    // Get all active supplements for user
    const supplements = await db.supplement.findMany({
      where: { userId, isActive: true },
      orderBy: { sortOrder: 'asc' }
    })

    // Get today's date (start of day in UTC)
    const targetDate = dateParam ? new Date(dateParam) : new Date()
    targetDate.setHours(0, 0, 0, 0)
    const dayOfWeek = targetDate.getDay() || 7 // Convert 0 (Sunday) to 7

    // Filter supplements for today (by days array)
    const todaySupplements = supplements.filter(s => {
      try {
        const days = JSON.parse(s.days) as number[]
        return days.length === 0 || days.includes(dayOfWeek)
      } catch {
        return true // If parse fails, show it
      }
    })

    // Get intakes for today
    const intakes = await db.supplementIntake.findMany({
      where: {
        userId,
        date: {
          gte: targetDate,
          lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)
        }
      }
    })

    // Map intakes to supplements
    const intakeMap = new Map(intakes.map(i => [i.supplementId, i]))

    // Build response with checked status
    const result = todaySupplements.map(s => ({
      ...s,
      days: JSON.parse(s.days),
      checked: intakeMap.get(s.id)?.checked ?? false,
      intakeId: intakeMap.get(s.id)?.id ?? null
    }))

    // Calculate stats
    const total = result.length
    const checked = result.filter(s => s.checked).length
    const progress = total > 0 ? Math.round((checked / total) * 100) : 0

    return NextResponse.json({
      success: true,
      supplements: result,
      stats: { total, checked, progress }
    })
  } catch (error) {
    console.error('Error fetching supplements:', error)
    return NextResponse.json({ error: 'Failed to fetch supplements' }, { status: 500 })
  }
}

// POST /api/supplements - Create new supplement
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, name, dosage, unit, standardDose, timeWindow, days } = body

    if (!userId || !name) {
      return NextResponse.json({ error: 'userId and name are required' }, { status: 400 })
    }

    const supplement = await db.supplement.create({
      data: {
        userId,
        name,
        dosage: dosage || null,
        unit: unit || 'мг',
        standardDose: standardDose || 1,
        timeWindow: timeWindow || 'any',
        days: JSON.stringify(days || [1, 2, 3, 4, 5, 6, 7])
      }
    })

    return NextResponse.json({ success: true, supplement })
  } catch (error) {
    console.error('Error creating supplement:', error)
    return NextResponse.json({ error: 'Failed to create supplement' }, { status: 500 })
  }
}

// PATCH /api/supplements - Update supplement
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    // Convert days array to JSON string if provided
    if (data.days && Array.isArray(data.days)) {
      data.days = JSON.stringify(data.days)
    }

    const supplement = await db.supplement.update({
      where: { id },
      data
    })

    return NextResponse.json({ success: true, supplement })
  } catch (error) {
    console.error('Error updating supplement:', error)
    return NextResponse.json({ error: 'Failed to update supplement' }, { status: 500 })
  }
}

// DELETE /api/supplements?id=xxx - Delete supplement
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  try {
    // Delete all intakes first
    await db.supplementIntake.deleteMany({ where: { supplementId: id } })
    // Delete supplement
    await db.supplement.delete({ where: { id } })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting supplement:', error)
    return NextResponse.json({ error: 'Failed to delete supplement' }, { status: 500 })
  }
}
