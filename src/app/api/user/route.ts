import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Get user profile
 * GET /api/user?id=<userId>
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('id')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    const user = await db.appUser.findUnique({
      where: { id: userId },
      include: {
        profile: true,
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      user: {
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        photoUrl: user.photoUrl,
        language: user.language,
        day: user.day,
        streak: user.streak,
        points: user.points,
      },
      profile: user.profile ? {
        weight: user.profile.weight,
        height: user.profile.height,
        age: user.profile.age,
        sex: user.profile.sex,
        targetWeight: user.profile.targetWeight,
        targetCalories: user.profile.targetCalories,
        workProfile: user.profile.workProfile,
        waterBaseline: user.profile.waterBaseline,
        bio: user.profile.bio,
      } : null
    })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'Failed to get user' },
      { status: 500 }
    )
  }
}

/**
 * Update user profile
 * PATCH /api/user
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, day, streak, points, profile } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    // Update user fields
    const updateData: Record<string, unknown> = {}
    if (day !== undefined) updateData.day = day
    if (streak !== undefined) updateData.streak = streak
    if (points !== undefined) updateData.points = points

    if (Object.keys(updateData).length > 0) {
      await db.appUser.update({
        where: { id: userId },
        data: updateData
      })
    }

    // Update profile if provided
    if (profile) {
      const profileData: Record<string, unknown> = {}
      if (profile.weight !== undefined) profileData.weight = profile.weight
      if (profile.height !== undefined) profileData.height = profile.height
      if (profile.age !== undefined) profileData.age = profile.age
      if (profile.sex !== undefined) profileData.sex = profile.sex
      if (profile.targetWeight !== undefined) profileData.targetWeight = profile.targetWeight
      if (profile.targetCalories !== undefined) profileData.targetCalories = profile.targetCalories
      if (profile.workProfile !== undefined) profileData.workProfile = profile.workProfile
      if (profile.waterBaseline !== undefined) profileData.waterBaseline = profile.waterBaseline
      if (profile.bio !== undefined) profileData.bio = profile.bio

      if (Object.keys(profileData).length > 0) {
        await db.userProfile.update({
          where: { userId },
          data: profileData
        })
      }
    }

    // Return updated user
    const updatedUser = await db.appUser.findUnique({
      where: { id: userId },
      include: { profile: true }
    })

    return NextResponse.json({
      success: true,
      user: updatedUser
    })
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}
