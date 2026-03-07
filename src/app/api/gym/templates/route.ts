import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Fetch all exercise templates for user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const muscleGroup = searchParams.get('muscleGroup')
    const includeArchived = searchParams.get('includeArchived') === 'true'

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const where: {
      userId: string
      isArchived?: boolean
      muscleGroup?: string
    } = { userId }

    if (!includeArchived) {
      where.isArchived = false
    }

    if (muscleGroup) {
      where.muscleGroup = muscleGroup
    }

    const templates = await db.gymExerciseTemplate.findMany({
      where,
      orderBy: [
        { muscleGroup: 'asc' },
        { name: 'asc' }
      ],
      include: {
        _count: {
          select: { exercises: true }
        }
      }
    })

    return NextResponse.json({ templates })
  } catch (error) {
    console.error('Fetch exercise templates error:', error)
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
  }
}

// POST - Create new exercise template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      name,
      muscleGroup,
      goal,
      defaultScheme,
      progressionType,
      progressionStep,
      currentWeight,
      nextWeight,
      techniqueNotes
    } = body

    if (!userId || !name) {
      return NextResponse.json({ error: 'userId and name required' }, { status: 400 })
    }

    const template = await db.gymExerciseTemplate.create({
      data: {
        userId,
        name,
        muscleGroup: muscleGroup || null,
        goal: goal || null,
        defaultScheme: defaultScheme || null,
        progressionType: progressionType || 'manual',
        progressionStep: progressionStep || null,
        currentWeight: currentWeight || null,
        nextWeight: nextWeight || null,
        techniqueNotes: techniqueNotes || null
      }
    })

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Create exercise template error:', error)
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
  }
}

// PATCH - Update exercise template
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      id,
      name,
      muscleGroup,
      goal,
      defaultScheme,
      progressionType,
      progressionStep,
      currentWeight,
      nextWeight,
      techniqueNotes,
      isArchived
    } = body

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const updateData: {
      name?: string
      muscleGroup?: string | null
      goal?: string | null
      defaultScheme?: string | null
      progressionType?: string
      progressionStep?: number | null
      currentWeight?: number | null
      nextWeight?: number | null
      techniqueNotes?: string | null
      isArchived?: boolean
    } = {}

    if (name !== undefined) updateData.name = name
    if (muscleGroup !== undefined) updateData.muscleGroup = muscleGroup
    if (goal !== undefined) updateData.goal = goal
    if (defaultScheme !== undefined) updateData.defaultScheme = defaultScheme
    if (progressionType !== undefined) updateData.progressionType = progressionType
    if (progressionStep !== undefined) updateData.progressionStep = progressionStep
    if (currentWeight !== undefined) updateData.currentWeight = currentWeight
    if (nextWeight !== undefined) updateData.nextWeight = nextWeight
    if (techniqueNotes !== undefined) updateData.techniqueNotes = techniqueNotes
    if (isArchived !== undefined) updateData.isArchived = isArchived

    const template = await db.gymExerciseTemplate.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Update exercise template error:', error)
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
  }
}

// DELETE - Archive exercise template (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const hardDelete = searchParams.get('hardDelete') === 'true'

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    if (hardDelete) {
      await db.gymExerciseTemplate.delete({
        where: { id }
      })
    } else {
      await db.gymExerciseTemplate.update({
        where: { id },
        data: { isArchived: true }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete exercise template error:', error)
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
  }
}
