import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Default categories for new users
const DEFAULT_CATEGORIES = [
  { name: 'Steam / связки', zone: 'steam', icon: '🎮', color: '#1b2838' },
  { name: 'LeakFixer / разработка', zone: 'leakfixer', icon: '🔧', color: '#4a5568' },
  { name: 'ИИ / подписки', zone: 'ai', icon: '🤖', color: '#6366f1' },
  { name: 'Покер / банкролл', zone: 'poker', icon: '♠️', color: '#059669' },
  { name: 'Здоровье / зал', zone: 'health', icon: '💪', color: '#dc2626' },
  { name: 'Быт / жизнь', zone: 'life', icon: '🏠', color: '#f59e0b' },
  { name: 'Подушка / резерв', zone: 'savings', icon: '💰', color: '#10b981' },
]

// GET /api/categories?userId=xxx - Get user categories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    let categories = await db.category.findMany({
      where: { userId },
      orderBy: { sortOrder: 'asc' }
    })

    // Create default categories if none exist
    if (categories.length === 0) {
      categories = await Promise.all(
        DEFAULT_CATEGORIES.map((cat, index) =>
          db.category.create({
            data: {
              userId,
              name: cat.name,
              zone: cat.zone,
              icon: cat.icon,
              color: cat.color,
              sortOrder: index
            }
          })
        )
      )
    }

    // Calculate spent amount for each category
    const categoriesWithSpent = await Promise.all(
      categories.map(async (category) => {
        const transactions = await db.transaction.findMany({
          where: { categoryId: category.id }
        })
        const spent = transactions.reduce((sum, t) => sum + t.amount, 0)
        return {
          ...category,
          spent
        }
      })
    )

    return NextResponse.json({ success: true, categories: categoriesWithSpent })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}

// POST /api/categories - Create category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, name, zone, monthlyTarget, icon, color, sortOrder } = body

    if (!userId || !name) {
      return NextResponse.json({ error: 'userId and name are required' }, { status: 400 })
    }

    const category = await db.category.create({
      data: {
        userId,
        name,
        zone: zone || 'general',
        monthlyTarget,
        icon,
        color,
        sortOrder: sortOrder || 0
      }
    })

    return NextResponse.json({ success: true, category })
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}

// PATCH /api/categories - Update category
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const category = await db.category.update({
      where: { id },
      data
    })

    return NextResponse.json({ success: true, category })
  } catch (error) {
    console.error('Error updating category:', error)
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
  }
}

// DELETE /api/categories?id=xxx - Delete category
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    // Set categoryId to null for all transactions in this category
    await db.transaction.updateMany({
      where: { categoryId: id },
      data: { categoryId: null }
    })

    await db.category.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
  }
}
