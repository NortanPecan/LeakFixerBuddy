import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/content - Get all content items with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const zone = searchParams.get('zone')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const where: {
      userId: string
      type?: string
      status?: string
      zone?: string
    } = { userId }

    if (type && type !== 'all') {
      where.type = type
    }

    if (status && status !== 'all') {
      where.status = status
    }

    if (zone && zone !== 'all') {
      where.zone = zone
    }

    const items = await db.contentItem.findMany({
      where,
      include: {
        links: {
          select: {
            id: true,
            entity: true,
            entityId: true,
            fragment: true,
          }
        },
        tasks: {
          select: {
            id: true,
            text: true,
            status: true,
          }
        },
        rituals: {
          select: {
            id: true,
            title: true,
            status: true,
            category: true,
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      skip: offset,
    })

    // Count total for pagination
    const total = await db.contentItem.count({ where })

    return NextResponse.json({ items, total })
  } catch (error) {
    console.error('Error fetching content:', error)
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 })
  }
}

// POST /api/content - Create a new content item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      type,
      title,
      status,
      source,
      url,
      zone,
      totalUnits,
      currentUnits,
      unitType,
      author,
      imageUrl,
      description
    } = body

    if (!userId || !type || !title) {
      return NextResponse.json({ error: 'userId, type, and title required' }, { status: 400 })
    }

    const item = await db.contentItem.create({
      data: {
        userId,
        type,
        title,
        status: status || 'planned',
        source: source || null,
        url: url || null,
        zone: zone || 'general',
        totalUnits: totalUnits || null,
        currentUnits: currentUnits || 0,
        unitType: unitType || null,
        author: author || null,
        imageUrl: imageUrl || null,
        description: description || null,
      },
      include: {
        links: true,
        tasks: true,
      }
    })

    return NextResponse.json({ item })
  } catch (error) {
    console.error('Error creating content:', error)
    return NextResponse.json({ error: 'Failed to create content' }, { status: 500 })
  }
}

