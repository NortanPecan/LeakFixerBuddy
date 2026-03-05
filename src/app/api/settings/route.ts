import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/settings?userId=xxx - Get user settings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Get or create settings
    let settings = await db.userSettings.findUnique({
      where: { userId }
    })

    if (!settings) {
      settings = await db.userSettings.create({
        data: { userId }
      })
    }

    return NextResponse.json({ success: true, settings })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

// POST /api/settings - Create settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, ...data } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Check if exists
    const existing = await db.userSettings.findUnique({
      where: { userId }
    })

    if (existing) {
      return NextResponse.json({ success: true, settings: existing })
    }

    const settings = await db.userSettings.create({
      data: {
        userId,
        ...data
      }
    })

    return NextResponse.json({ success: true, settings })
  } catch (error) {
    console.error('Error creating settings:', error)
    return NextResponse.json({ error: 'Failed to create settings' }, { status: 500 })
  }
}

// PATCH /api/settings - Update settings
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, ...data } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Check if exists, create if not
    let settings = await db.userSettings.findUnique({
      where: { userId }
    })

    if (!settings) {
      settings = await db.userSettings.create({
        data: { userId, ...data }
      })
    } else {
      settings = await db.userSettings.update({
        where: { userId },
        data
      })
    }

    return NextResponse.json({ success: true, settings })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
