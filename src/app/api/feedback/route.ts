import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/feedback?userId=xxx - Get user feedbacks (optional, for admin)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const feedbacks = await db.feedback.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ success: true, feedbacks })
  } catch (error) {
    console.error('Error fetching feedbacks:', error)
    return NextResponse.json({ error: 'Failed to fetch feedbacks' }, { status: 500 })
  }
}

// POST /api/feedback - Create feedback
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, type, message } = body

    if (!userId || !type || !message) {
      return NextResponse.json({ error: 'userId, type, and message are required' }, { status: 400 })
    }

    const validTypes = ['bug', 'idea', 'question', 'review']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid feedback type' }, { status: 400 })
    }

    const feedback = await db.feedback.create({
      data: {
        userId,
        type,
        message
      }
    })

    return NextResponse.json({ success: true, feedback })
  } catch (error) {
    console.error('Error creating feedback:', error)
    return NextResponse.json({ error: 'Failed to create feedback' }, { status: 500 })
  }
}
