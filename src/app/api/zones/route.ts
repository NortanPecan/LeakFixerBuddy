import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Default zones that every user gets on first load
const DEFAULT_ZONES = [
  { key: 'leakfixer', name: 'LeakFixer', emoji: '🔧', color: '#4a5568', sortOrder: 0 },
  { key: 'ai', name: 'ИИ', emoji: '🤖', color: '#6366f1', sortOrder: 1 },
  { key: 'poker', name: 'Покер', emoji: '♠️', color: '#059669', sortOrder: 2 },
  { key: 'health', name: 'Здоровье', emoji: '💪', color: '#dc2626', sortOrder: 3 },
  { key: 'life', name: 'Жизнь', emoji: '🏠', color: '#f59e0b', sortOrder: 4 },
  { key: 'savings', name: 'Резерв', emoji: '💰', color: '#10b981', sortOrder: 5 },
  { key: 'general', name: 'Общее', emoji: '📦', color: '#6b7280', sortOrder: 6 },
]

// GET /api/zones?userId=xxx - Get user zones
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    let zones = await db.zone.findMany({
      where: { userId },
      orderBy: { sortOrder: 'asc' }
    })

    // If no zones exist, create default ones
    if (zones.length === 0) {
      zones = await db.zone.createMany({
        data: DEFAULT_ZONES.map(zone => ({
          userId,
          ...zone,
          isDefault: true,
          isActive: true
        }))
      })
      
      // Fetch the created zones
      zones = await db.zone.findMany({
        where: { userId },
        orderBy: { sortOrder: 'asc' }
      })
    }

    return NextResponse.json({ success: true, zones })
  } catch (error) {
    console.error('Error fetching zones:', error)
    return NextResponse.json({ error: 'Failed to fetch zones' }, { status: 500 })
  }
}

// POST /api/zones - Create new zone
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, key, name, emoji, color, sortOrder } = body

    if (!userId || !key || !name) {
      return NextResponse.json({ error: 'userId, key, and name are required' }, { status: 400 })
    }

    // Check for duplicate key
    const existing = await db.zone.findFirst({
      where: { userId, key: { equals: key, mode: 'insensitive' } }
    })

    if (existing) {
      return NextResponse.json(
        { error: `Зона с ключом "${key}" уже существует` },
        { status: 400 }
      )
    }

    const zone = await db.zone.create({
      data: {
        userId,
        key: key.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        name,
        emoji: emoji || '📁',
        color: color || '#6b7280',
        sortOrder: sortOrder || 0,
        isDefault: false,
        isActive: true
      }
    })

    return NextResponse.json({ success: true, zone })
  } catch (error) {
    console.error('Error creating zone:', error)
    return NextResponse.json({ error: 'Failed to create zone' }, { status: 500 })
  }
}

// PATCH /api/zones - Update zone
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    // Check if zone is default (can't change key of default zones)
    if (data.key) {
      const existing = await db.zone.findUnique({ where: { id } })
      if (existing?.isDefault && existing.key !== data.key) {
        return NextResponse.json(
          { error: 'Нельзя изменить ключ стандартной зоны' },
          { status: 400 }
        )
      }
    }

    const zone = await db.zone.update({
      where: { id },
      data
    })

    return NextResponse.json({ success: true, zone })
  } catch (error) {
    console.error('Error updating zone:', error)
    return NextResponse.json({ error: 'Failed to update zone' }, { status: 500 })
  }
}

// DELETE /api/zones?id=xxx - Delete zone
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    // Check if zone is default
    const zone = await db.zone.findUnique({ where: { id } })
    if (zone?.isDefault) {
      return NextResponse.json(
        { error: 'Нельзя удалить стандартную зону. Можно только скрыть её.' },
        { status: 400 }
      )
    }

    await db.zone.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting zone:', error)
    return NextResponse.json({ error: 'Failed to delete zone' }, { status: 500 })
  }
}
