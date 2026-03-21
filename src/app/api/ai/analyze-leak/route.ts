import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { analyzeLeakWithAI } from '@/lib/ai-analyze-leak'
import { requireSelf } from '@/lib/server-auth'

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

  const auth = requireSelf(request, userId)
  if ('error' in auth) return auth.error

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
 * PATCH /api/ai/analyze-leak
 * Body: { userId, leakType, solutionText, worked: boolean }
 * Записывает фидбек по решению: worked/not worked → улучшает следующий анализ.
 */
export async function PATCH(request: NextRequest) {
  let body: { userId?: string; leakType?: string; solutionText?: string; worked?: boolean }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { userId, leakType, solutionText, worked } = body
  if (!userId || !leakType || !solutionText || worked === undefined) {
    return NextResponse.json(
      { error: 'userId, leakType, solutionText and worked are required' },
      { status: 400 }
    )
  }

  const auth = requireSelf(request, userId)
  if ('error' in auth) return auth.error

  const pattern = await db.userAiPattern.findUnique({
    where: { userId_leakType: { userId, leakType } },
  })

  if (!pattern) {
    return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })
  }

  const tried = ((pattern.triedSolutions ?? []) as { text: string; triedAt?: string; worked: boolean | null }[])
  const updatedTried = tried.map(s =>
    s.text === solutionText ? { ...s, worked } : s
  )
  // Если решения не было в tried — добавим его
  if (!tried.some(s => s.text === solutionText)) {
    updatedTried.push({ text: solutionText, worked })
  }

  const whatWorked = ((pattern.whatWorked ?? []) as string[])
  const updatedWhatWorked = worked && !whatWorked.includes(solutionText)
    ? [...whatWorked, solutionText]
    : whatWorked

  await db.userAiPattern.update({
    where: { userId_leakType: { userId, leakType } },
    data: {
      triedSolutions: updatedTried,
      whatWorked:     updatedWhatWorked,
    },
  })

  return NextResponse.json({ success: true })
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

  const auth = requireSelf(request, userId)
  if ('error' in auth) return auth.error

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
