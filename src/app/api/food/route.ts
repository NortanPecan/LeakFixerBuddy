import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  formatDateKey,
  getStartOfDay,
  getStartOfNextDay,
  normalizeToDate,
  parseDateKey,
} from '@/lib/date-utils'
import { requireSelf } from '@/lib/server-auth'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const dateParam = searchParams.get('date')

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  const auth = requireSelf(request, userId)
  if ('error' in auth) return auth.error

  try {
    const targetDate = dateParam ? parseDateKey(dateParam) : normalizeToDate(new Date())
    const startOfTargetDay = getStartOfDay(targetDate)
    const startOfNextDay = getStartOfNextDay(targetDate)

    const entries = await db.foodEntry.findMany({
      where: {
        userId,
        date: {
          gte: startOfTargetDay,
          lt: startOfNextDay,
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    const totals = {
      calories: entries.reduce((sum, entry) => sum + (entry.calories || 0), 0),
      protein: entries.reduce((sum, entry) => sum + (entry.protein || 0), 0),
      fat: entries.reduce((sum, entry) => sum + (entry.fat || 0), 0),
      carbs: entries.reduce((sum, entry) => sum + (entry.carbs || 0), 0),
    }

    const byMealType: Record<string, typeof entries> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    }

    entries.forEach((entry) => {
      if (entry.mealType.startsWith('custom:')) {
        if (!byMealType[entry.mealType]) {
          byMealType[entry.mealType] = []
        }
        byMealType[entry.mealType].push(entry)
        return
      }

      if (byMealType[entry.mealType]) {
        byMealType[entry.mealType].push(entry)
        return
      }

      byMealType.snack.push(entry)
    })

    return NextResponse.json({
      success: true,
      date: formatDateKey(targetDate),
      entries,
      totals,
      byMealType,
    })
  } catch (error) {
    console.error('Error fetching food entries:', error)
    return NextResponse.json({ error: 'Failed to fetch food entries' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, name, mealType, time, calories, protein, fat, carbs, amount, quality, note, date } = body

    if (!userId || !name) {
      return NextResponse.json({ error: 'userId and name are required' }, { status: 400 })
    }

    const auth = requireSelf(request, userId)
    if ('error' in auth) return auth.error

    const targetDate = date ? parseDateKey(date) : normalizeToDate(new Date())

    const entry = await db.foodEntry.create({
      data: {
        userId,
        name,
        mealType: mealType || 'snack',
        time,
        calories,
        protein,
        fat,
        carbs,
        amount,
        quality,
        note,
        date: targetDate,
      },
    })

    return NextResponse.json({ success: true, entry })
  } catch (error) {
    console.error('Error creating food entry:', error)
    return NextResponse.json({ error: 'Failed to create food entry' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  try {
    const existingEntry = await db.foodEntry.findUnique({
      where: { id },
      select: { userId: true },
    })

    if (!existingEntry) {
      return NextResponse.json({ error: 'Food entry not found' }, { status: 404 })
    }

    const auth = requireSelf(request, existingEntry.userId)
    if ('error' in auth) return auth.error

    await db.foodEntry.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting food entry:', error)
    return NextResponse.json({ error: 'Failed to delete food entry' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, mealType, time, calories, protein, fat, carbs, amount, quality, note, date } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const existingEntry = await db.foodEntry.findUnique({
      where: { id },
      select: { userId: true },
    })

    if (!existingEntry) {
      return NextResponse.json({ error: 'Food entry not found' }, { status: 404 })
    }

    const auth = requireSelf(request, existingEntry.userId)
    if ('error' in auth) return auth.error

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (mealType !== undefined) updateData.mealType = mealType
    if (time !== undefined) updateData.time = time
    if (calories !== undefined) updateData.calories = calories
    if (protein !== undefined) updateData.protein = protein
    if (fat !== undefined) updateData.fat = fat
    if (carbs !== undefined) updateData.carbs = carbs
    if (amount !== undefined) updateData.amount = amount
    if (quality !== undefined) updateData.quality = quality
    if (note !== undefined) updateData.note = note
    if (date !== undefined) updateData.date = parseDateKey(date)

    const entry = await db.foodEntry.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, entry })
  } catch (error) {
    console.error('Error updating food entry:', error)
    return NextResponse.json({ error: 'Failed to update food entry' }, { status: 500 })
  }
}
