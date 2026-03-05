import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/content/link - Create a link from content to entity (note, ritual, chain)
// Also creates the entity if createEntity is true
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { contentId, entity, entityId, fragment, createEntity, entityData } = body

    if (!contentId || !entity) {
      return NextResponse.json({ error: 'contentId and entity required' }, { status: 400 })
    }

    // Validate entity type
    const validEntities = ['note', 'task', 'ritual', 'chain']
    if (!validEntities.includes(entity)) {
      return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 })
    }

    let createdEntityId = entityId

    // If createEntity is true, create the entity first
    if (createEntity && entityData) {
      if (entity === 'note') {
        const note = await db.note.create({
          data: {
            userId: entityData.userId,
            text: entityData.text || fragment || 'New note',
            type: entityData.type || 'content',
            zone: entityData.zone || 'general',
          }
        })
        createdEntityId = note.id
        
        // Create NoteLink as well
        await db.noteLink.create({
          data: {
            noteId: note.id,
            entity: 'content',
            entityId: contentId,
            fragment: fragment || null,
          }
        })
      } else if (entity === 'task') {
        const task = await db.task.create({
          data: {
            userId: entityData.userId,
            text: entityData.text || fragment || 'New task',
            contentId: contentId,
            zone: entityData.zone || null,
            date: entityData.date ? new Date(entityData.date) : null,
          }
        })
        createdEntityId = task.id
      } else if (entity === 'ritual') {
        const ritual = await db.ritual.create({
          data: {
            userId: entityData.userId,
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
            userId: entityData.userId,
            title: entityData.title || fragment || 'New chain',
          }
        })
        createdEntityId = chain.id
      }
    }

    if (!createdEntityId) {
      return NextResponse.json({ error: 'entityId or createEntity with entityData required' }, { status: 400 })
    }

    // Create the content link
    const link = await db.contentLink.create({
      data: {
        contentId,
        entity,
        entityId: createdEntityId,
        fragment: fragment || null,
      }
    })

    return NextResponse.json({ link, entityId: createdEntityId })
  } catch (error) {
    console.error('Error creating content link:', error)
    return NextResponse.json({ error: 'Failed to create content link' }, { status: 500 })
  }
}

// DELETE /api/content/link - Delete a link
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    await db.contentLink.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting content link:', error)
    return NextResponse.json({ error: 'Failed to delete content link' }, { status: 500 })
  }
}
