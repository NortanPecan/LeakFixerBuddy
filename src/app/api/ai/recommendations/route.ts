import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSelf } from '@/lib/server-auth'

/**
 * GET /api/ai/recommendations?userId=...
 * Возвращает самый свежий UserAiPattern за последние 7 дней.
 * Используется виджетом «💡 AI Рекомендации» на HomeScreen.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  const auth = requireSelf(request, userId)
  if ('error' in auth) return auth.error

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const pattern = await db.userAiPattern.findFirst({
    where: {
      userId,
      updatedAt: { gte: sevenDaysAgo },
      lastAnalysis: { not: undefined },
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      leakType:     true,
      lastAnalysis: true,
      lastProvider: true,
      updatedAt:    true,
    },
  })

  if (!pattern?.lastAnalysis) {
    return NextResponse.json({ success: false, recommendation: null })
  }

  return NextResponse.json({
    success:        true,
    recommendation: {
      leakType:  pattern.leakType,
      analysis:  pattern.lastAnalysis,
      provider:  pattern.lastProvider,
      updatedAt: pattern.updatedAt,
    },
  })
}
