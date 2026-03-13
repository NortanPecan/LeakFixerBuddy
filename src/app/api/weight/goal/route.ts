import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Get weight goal settings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const profile = await db.userProfile.findUnique({
      where: { userId },
      select: {
        weight: true,
        targetWeight: true,
        weightStart: true,
        weightStartAt: true,
        weightDeadline: true
      }
    })

    return NextResponse.json({ goal: profile || null })
  } catch (error) {
    console.error('Get weight goal error:', error)
    return NextResponse.json({ error: 'Failed to get weight goal' }, { status: 500 })
  }
}

// PATCH - Update weight goal settings
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, weightStart, targetWeight, weightDeadline, weightStartAt } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    
    if (weightStart !== undefined) updateData.weightStart = weightStart
    if (targetWeight !== undefined) updateData.targetWeight = targetWeight
    if (weightDeadline !== undefined) updateData.weightDeadline = weightDeadline ? new Date(weightDeadline) : null
    if (weightStartAt !== undefined) updateData.weightStartAt = weightStartAt ? new Date(weightStartAt) : null

    // Upsert profile
    const profile = await db.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        ...updateData
      },
      update: updateData
    })

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Update weight goal error:', error)
    return NextResponse.json({ error: 'Failed to update weight goal' }, { status: 500 })
  }
}
