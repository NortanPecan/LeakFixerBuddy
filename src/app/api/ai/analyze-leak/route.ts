import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { analyzeLeakWithAI } from '@/lib/ai-analyze-leak'

/**
 * POST /api/ai/analyze-leak
 * Body: { userId, leakType, leakMessage, severity? }
 */
export async function POST(request: NextRequest) {
  let body: { userId?: string; leakType?: string; leakMessage?: string; severity?: string }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { userId, leakType, leakMessage, severity = 'warning' } = body
  if (!userId || !leakType || !leakMessage) {
    return NextResponse.json(
      { error: 'userId, leakType and leakMessage are required' },
      { status: 400 }
    )
  }

  try {
    const { analysis, provider } = await analyzeLeakWithAI({
      userId, leakType, leakMessage, severity, callType: 'analyze-leak',
    })
    return NextResponse.json({ success: true, analysis, provider, cached: false })
  } catch (err) {
    console.error('[analyze-leak] failed:', err)
    return NextResponse.json(
      { error: 'AI providers unavailable. Add GROQ_API_KEY or GEMINI_API_KEY to ENV.' },
      { status: 503 }
    )
  }
}

/**
 * GET /api/ai/analyze-leak?userId=...&leakType=...
 * Возвращает последний сохранённый анализ без нового AI-вызова.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId   = searchParams.get('userId')
  const leakType = searchParams.get('leakType')

  if (!userId || !leakType) {
    return NextResponse.json({ error: 'userId and leakType required' }, { status: 400 })
  }

  const pattern = await db.userAiPattern.findUnique({
    where: { userId_leakType: { userId, leakType } },
    select: { lastAnalysis: true, lastProvider: true, updatedAt: true, analysisCount: true },
  })

  if (!pattern?.lastAnalysis) {
    return NextResponse.json({ success: false, analysis: null })
  }

  return NextResponse.json({
    success:       true,
    analysis:      pattern.lastAnalysis,
    provider:      pattern.lastProvider,
    cached:        true,
    analysisCount: pattern.analysisCount,
    updatedAt:     pattern.updatedAt,
  })
}
