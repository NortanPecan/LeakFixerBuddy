import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Fetch all skills for user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const skills = await db.skill.findMany({
      where: { userId, isArchived: false },
      orderBy: { createdAt: 'desc' },
      include: {
        history: { orderBy: { createdAt: 'desc' }, take: 10 }
      }
    })

    return NextResponse.json({ skills })
  } catch (error) {
    console.error('Fetch skills error:', error)
    return NextResponse.json({ error: 'Failed to fetch skills' }, { status: 500 })
  }
}

// POST - Create new skill
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, name, description, category, icon, color } = body

    if (!userId || !name) {
      return NextResponse.json({ error: 'userId and name required' }, { status: 400 })
    }

    const skill = await db.skill.create({
      data: {
        userId,
        name,
        description,
        category: category || 'general',
        icon,
        color
      }
    })

    return NextResponse.json({ skill })
  } catch (error) {
    console.error('Create skill error:', error)
    return NextResponse.json({ error: 'Failed to create skill' }, { status: 500 })
  }
}

// PATCH - Update skill (including XP/level changes)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, description, category, icon, color, xpGained, reason, sourceId, isArchived } = body

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    // If XP change, handle level up logic
    if (xpGained) {
      const skill = await db.skill.findUnique({ where: { id } })
      if (!skill) {
        return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
      }

      let newXP = skill.xp + xpGained
      let newLevel = skill.level
      let leveledUp = false

      // Level up if XP exceeds threshold
      while (newXP >= skill.xpToNext && newLevel < skill.maxLevel) {
        newXP -= skill.xpToNext
        newLevel++
        leveledUp = true
      }

      // Cap XP
      if (newLevel >= skill.maxLevel) {
        newXP = Math.min(newXP, skill.xpToNext - 1)
      }

      await db.skill.update({
        where: { id },
        data: { xp: newXP, level: newLevel }
      })

      // Create history entry
      await db.skillHistory.create({
        data: {
          skillId: id,
          oldLevel: skill.level,
          newLevel,
          xpGained,
          reason,
          sourceId
        }
      })

      return NextResponse.json({ skill: { ...skill, xp: newXP, level: newLevel }, leveledUp })
    }

    const skill = await db.skill.update({
      where: { id },
      data: { name, description, category, icon, color, isArchived }
    })

    return NextResponse.json({ skill })
  } catch (error) {
    console.error('Update skill error:', error)
    return NextResponse.json({ error: 'Failed to update skill' }, { status: 500 })
  }
}

// DELETE - Delete skill
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    await db.skill.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete skill error:', error)
    return NextResponse.json({ error: 'Failed to delete skill' }, { status: 500 })
  }
}
