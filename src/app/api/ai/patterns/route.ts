import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/ai/patterns?userId=xxx — list all UserAiPattern records for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const patterns = await db.userAiPattern.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        leakType: true,
        analysisCount: true,
        whatWorked: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ success: true, patterns })
  } catch (error) {
    console.error('[ai/patterns GET] error:', error)
    return NextResponse.json({ error: 'Failed to get patterns' }, { status: 500 })
  }
}
