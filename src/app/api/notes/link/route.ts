import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuthenticatedUser, requireSelf } from '@/lib/server-auth'

// POST /api/notes/link - Create a link from note to entity (task/ritual/chain)
// Also creates the entity if entityId is not provided
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { noteId, entity, entityId, fragment, createEntity, entityData } = body

    if (!noteId || !entity) {
      return NextResponse.json({ error: 'noteId and entity required' }, { status: 400 })
    }

    const note = await db.note.findUnique({
      where: { id: noteId },
      select: { userId: true },
    })
    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }
    await requireSelf(request, note.userId)

    // Validate entity type
    const validEntities = ['task', 'ritual', 'chain']
    if (!validEntities.includes(entity)) {
      return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 })
    }

    let createdEntityId = entityId

    // If createEntity is true, create the entity first
    if (createEntity && entityData) {
      if (entity === 'task') {
        const task = await db.task.create({
          data: {
            userId: note.userId,
            text: entityData.text || fragment || 'New task',
            chainId: entityData.chainId,
            zone: entityData.zone,
            date: entityData.date ? new Date(entityData.date) : null,
            noteId: noteId,
          }
        })
        createdEntityId = task.id
      } else if (entity === 'ritual') {
        const ritual = await db.ritual.create({
          data: {
            userId: note.userId,
            title: entityData.title || fragment || 'New ritual',
            category: entityData.category || 'health',
            type: entityData.type || 'regular',
            days: entityData.days || '[]',
            attributes: entityData.attributes || '[]',
          }
        })
        createdEntityId = ritual.id
      } else if (entity === 'chain') {
        const chain = await db.chain.create({
          data: {
            userId: note.userId,
            title: entityData.title || fragment || 'New chain',
          }
        })
        createdEntityId = chain.id
      }
    }

    if (!createdEntityId) {
      return NextResponse.json({ error: 'entityId or createEntity with entityData required' }, { status: 400 })
    }

    // Create the link
    const link = await db.noteLink.create({
      data: {
        noteId,
        entity,
        entityId: createdEntityId,
        fragment: fragment || null,
      }
    })

    return NextResponse.json({ link, entityId: createdEntityId })
  } catch (error) {
    console.error('Error creating note link:', error)
    return NextResponse.json({ error: 'Failed to create note link' }, { status: 500 })
  }
}

// DELETE /api/notes/link - Delete a link
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const auth = await requireAuthenticatedUser(request)
    const link = await db.noteLink.findUnique({
      where: { id },
      include: {
        note: {
          select: { userId: true },
        },
      },
    })
    if (!link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }
    if (link.note.userId !== auth.session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await db.noteLink.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting note link:', error)
    return NextResponse.json({ error: 'Failed to delete note link' }, { status: 500 })
  }
}
