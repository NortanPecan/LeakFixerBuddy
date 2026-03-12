import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { normalizeToDate, getStartOfDay, getEndOfDay, formatDateKey, parseDateKey } from '@/lib/date-utils'

// GET /api/food?userId=xxx - Get food entries for today
// GET /api/food?userId=xxx&date=YYYY-MM-DD - Get food for specific date
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const dateParam = searchParams.get('date')

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  try {
    const targetDate = dateParam ? parseDateKey(dateParam) : normalizeToDate(new Date())
    const startOfTargetDay = getStartOfDay(targetDate)
    const endOfTargetDay = getEndOfDay(targetDate)

    const entries = await db.foodEntry.findMany({
      where: {
        userId,
        date: {
          gte: startOfTargetDay,
          lt: endOfTargetDay
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    // Calculate totals
    const totals = {
      calories: entries.reduce((sum, e) => sum + (e.calories || 0), 0),
      protein: entries.reduce((sum, e) => sum + (e.protein || 0), 0),
      fat: entries.reduce((sum, e) => sum + (e.fat || 0), 0),
      carbs: entries.reduce((sum, e) => sum + (e.carbs || 0), 0)
    }

    // Group by meal type
    const byMealType = {
      breakfast: entries.filter(e => e.mealType === 'breakfast'),
      lunch: entries.filter(e => e.mealType === 'lunch'),
      dinner: entries.filter(e => e.mealType === 'dinner'),
      snack: entries.filter(e => e.mealType === 'snack')
    }

    return NextResponse.json({
      success: true,
      date: formatDateKey(targetDate),
      entries,
      totals,
      byMealType
    })
  } catch (error) {
    console.error('Error fetching food entries:', error)
    return NextResponse.json({ error: 'Failed to fetch food entries' }, { status: 500 })
  }
}

// POST /api/food - Create food entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, name, mealType, calories, protein, fat, carbs, amount, quality, note, date } = body

    if (!userId || !name) {
      return NextResponse.json({ error: 'userId and name are required' }, { status: 400 })
    }

    const targetDate = date ? parseDateKey(date) : normalizeToDate(new Date())

    const entry = await db.foodEntry.create({
      data: {
        userId,
        name,
        mealType: mealType || 'snack',
        calories,
        protein,
        fat,
        carbs,
        amount,
        quality,
        note,
        date: targetDate
      }
    })

    return NextResponse.json({ success: true, entry })
  } catch (error) {
    console.error('Error creating food entry:', error)
    return NextResponse.json({ error: 'Failed to create food entry' }, { status: 500 })
  }
}

// DELETE /api/food?id=xxx - Delete food entry
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  try {
    await db.foodEntry.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting food entry:', error)
    return NextResponse.json({ error: 'Failed to delete food entry' }, { status: 500 })
  }
}
