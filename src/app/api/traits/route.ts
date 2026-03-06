import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Fetch all traits for user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const traits = await db.trait.findMany({
      where: { userId, isArchived: false },
      orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
      include: {
        history: { orderBy: { createdAt: 'desc' }, take: 10 }
      }
    })

    return NextResponse.json({ traits })
  } catch (error) {
    console.error('Fetch traits error:', error)
    return NextResponse.json({ error: 'Failed to fetch traits' }, { status: 500 })
  }
}

// POST - Create new trait
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, name, description, type, category, icon, color, score } = body

    if (!userId || !name) {
      return NextResponse.json({ error: 'userId and name required' }, { status: 400 })
    }

    const trait = await db.trait.create({
      data: {
        userId,
        name,
        description,
        type: type || 'positive',
        category: category || 'general',
        icon,
        color,
        score: score || 5
      }
    })

    return NextResponse.json({ trait })
  } catch (error) {
    console.error('Create trait error:', error)
    return NextResponse.json({ error: 'Failed to create trait' }, { status: 500 })
  }
}

// PATCH - Update trait (including score changes)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, description, type, category, icon, color, scoreChange, reason, sourceId, isArchived } = body

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    // If score change
    if (scoreChange !== undefined) {
      const trait = await db.trait.findUnique({ where: { id } })
      if (!trait) {
        return NextResponse.json({ error: 'Trait not found' }, { status: 404 })
      }

      const newScore = Math.max(1, Math.min(10, trait.score + scoreChange))

      await db.trait.update({
        where: { id },
        data: { score: newScore }
      })

      // Create history entry
      await db.traitHistory.create({
        data: {
          traitId: id,
          oldScore: trait.score,
          newScore,
          delta: scoreChange,
          reason,
          sourceId
        }
      })

      return NextResponse.json({ trait: { ...trait, score: newScore } })
    }

    const trait = await db.trait.update({
      where: { id },
      data: { name, description, type, category, icon, color, isArchived }
    })

    return NextResponse.json({ trait })
  } catch (error) {
    console.error('Update trait error:', error)
    return NextResponse.json({ error: 'Failed to update trait' }, { status: 500 })
  }
}

// DELETE - Delete trait
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    await db.trait.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete trait error:', error)
    return NextResponse.json({ error: 'Failed to delete trait' }, { status: 500 })
  }
}
