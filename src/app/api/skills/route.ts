import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/skills?userId=...&category=...&importance=...
 * Returns all skills for a user (optionally filtered)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const category = searchParams.get('category')
    const importance = searchParams.get('importance')

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const where: Record<string, unknown> = { userId, isArchived: false }
    if (category) where.category = category
    if (importance) where.importance = parseInt(importance)

    const skills = await db.skill.findMany({
      where,
      orderBy: [{ importance: 'desc' }, { level: 'desc' }, { createdAt: 'asc' }],
      include: {
        history: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    })

    return NextResponse.json({ skills })
  } catch (error) {
    console.error('[Skills GET] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch skills' }, { status: 500 })
  }
}

/**
 * POST /api/skills
 * Create a new skill
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, name, description, category, color, importance } = body

    if (!userId || !name?.trim()) {
      return NextResponse.json({ error: 'userId and name required' }, { status: 400 })
    }

    const skill = await db.skill.create({
      data: {
        userId,
        name: name.trim(),
        description: description?.trim() || null,
        category: category || 'general',
        color: color || '#10b981',
        importance: importance || 2,
      },
    })

    return NextResponse.json({ skill })
  } catch (error) {
    console.error('[Skills POST] Error:', error)
    return NextResponse.json({ error: 'Failed to create skill' }, { status: 500 })
  }
}

/**
 * PATCH /api/skills
 * Update skill fields or add XP
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, description, category, importance, xpGained, reason } = body

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    // XP gain path
    if (typeof xpGained === 'number' && xpGained > 0) {
      const skill = await db.skill.findUnique({ where: { id } })
      if (!skill) return NextResponse.json({ error: 'Skill not found' }, { status: 404 })

      let newXp = skill.xp + xpGained
      let newLevel = skill.level
      let xpToNext = skill.xpToNext

      // Level up loop
      while (newXp >= xpToNext && newLevel < skill.maxLevel) {
        newXp -= xpToNext
        newLevel++
        // Each level requires 20% more XP
        xpToNext = Math.round(xpToNext * 1.2)
      }

      const leveledUp = newLevel > skill.level

      const updated = await db.skill.update({
        where: { id },
        data: {
          xp: newXp,
          level: newLevel,
          xpToNext,
        },
      })

      if (leveledUp) {
        await db.skillHistory.create({
          data: {
            skillId: id,
            oldLevel: skill.level,
            newLevel,
            xpGained,
            reason: reason || 'manual',
          },
        })
      }

      return NextResponse.json({ skill: updated, leveledUp, newLevel })
    }

    // Regular update
    const updated = await db.skill.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(category !== undefined && { category }),
        ...(importance !== undefined && { importance }),
      },
    })

    return NextResponse.json({ skill: updated })
  } catch (error) {
    console.error('[Skills PATCH] Error:', error)
    return NextResponse.json({ error: 'Failed to update skill' }, { status: 500 })
  }
}

/**
 * DELETE /api/skills?id=...
 * Archive a skill
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    await db.skill.update({
      where: { id },
      data: { isArchived: true },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Skills DELETE] Error:', error)
    return NextResponse.json({ error: 'Failed to delete skill' }, { status: 500 })
  }
}
