import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/notes - Get all notes for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const type = searchParams.get('type')
    const zone = searchParams.get('zone')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const where: {
      userId: string
      type?: string
      zone?: string
    } = { userId }

    if (type && type !== 'all') {
      where.type = type
    }

    if (zone && zone !== 'all') {
      where.zone = zone
    }

    const notes = await db.note.findMany({
      where,
      include: {
        links: {
          select: {
            id: true,
            entity: true,
            entityId: true,
            fragment: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })

    // Enrich links with entity details (task.chain, ritual, etc.)
    const taskLinks = notes.flatMap(n => n.links).filter(l => l.entity === 'task')
    const ritualLinks = notes.flatMap(n => n.links).filter(l => l.entity === 'ritual')
    const chainLinks = notes.flatMap(n => n.links).filter(l => l.entity === 'chain')
    
    // Load tasks with chain info
    const taskIds = taskLinks.map(l => l.entityId)
    const tasks = taskIds.length > 0 ? await db.task.findMany({
      where: { id: { in: taskIds } },
      select: { id: true, text: true, chainId: true, chain: { select: { id: true, title: true } } }
    }) : []

    // Load rituals
    const ritualIds = ritualLinks.map(l => l.entityId)
    const rituals = ritualIds.length > 0 ? await db.ritual.findMany({
      where: { id: { in: ritualIds } },
      select: { id: true, title: true, status: true }
    }) : []

    // Load chains
    const chainIds = chainLinks.map(l => l.entityId)
    const chains = chainIds.length > 0 ? await db.chain.findMany({
      where: { id: { in: chainIds } },
      select: { id: true, title: true, status: true }
    }) : []

    // Create lookup maps
    const taskMap = new Map(tasks.map(t => [t.id, t]))
    const ritualMap = new Map(rituals.map(r => [r.id, r]))
    const chainMap = new Map(chains.map(c => [c.id, c]))

    // Enrich notes with entity details
    const enrichedNotes = notes.map(note => ({
      ...note,
      links: note.links.map(link => {
        const enriched: {
          id: string
          entity: string
          entityId: string
          fragment: string | null
          entityDetails?: {
            type: 'task' | 'ritual' | 'chain'
            text?: string
            title?: string
            chain?: { id: string; title: string } | null
            status?: string
          }
        } = { ...link }
        
        if (link.entity === 'task') {
          const task = taskMap.get(link.entityId)
          if (task) {
            enriched.entityDetails = {
              type: 'task',
              text: task.text,
              chain: task.chain
            }
          }
        } else if (link.entity === 'ritual') {
          const ritual = ritualMap.get(link.entityId)
          if (ritual) {
            enriched.entityDetails = {
              type: 'ritual',
              title: ritual.title,
              status: ritual.status
            }
          }
        } else if (link.entity === 'chain') {
          const chain = chainMap.get(link.entityId)
          if (chain) {
            enriched.entityDetails = {
              type: 'chain',
              title: chain.title,
              status: chain.status
            }
          }
        }
        
        return enriched
      })
    }))

    // Count total for pagination
    const total = await db.note.count({ where })

    return NextResponse.json({ notes: enrichedNotes, total })
  } catch (error) {
    console.error('Error fetching notes:', error)
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
  }
}

// POST /api/notes - Create a new note
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, text, type, zone, date } = body

    if (!userId || !text) {
      return NextResponse.json({ error: 'userId and text required' }, { status: 400 })
    }

    const note = await db.note.create({
      data: {
        userId,
        text,
        type: type || 'thought',
        zone: zone || 'general',
        date: date ? new Date(date) : new Date(),
      },
      include: {
        links: true,
      }
    })

    return NextResponse.json({ note })
  } catch (error) {
    console.error('Error creating note:', error)
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
  }
}

// PATCH /api/notes - Update a note
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, text, type, zone, date } = body

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const updateData: {
      text?: string
      type?: string
      zone?: string
      date?: Date
    } = {}

    if (text !== undefined) updateData.text = text
    if (type !== undefined) updateData.type = type
    if (zone !== undefined) updateData.zone = zone
    if (date !== undefined) updateData.date = new Date(date)

    const note = await db.note.update({
      where: { id },
      data: updateData,
      include: {
        links: true,
      }
    })

    return NextResponse.json({ note })
  } catch (error) {
    console.error('Error updating note:', error)
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 })
  }
}

// DELETE /api/notes - Delete a note
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    // Delete links first
    await db.noteLink.deleteMany({
      where: { noteId: id }
    })

    // Delete note
    await db.note.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting note:', error)
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 })
  }
}
