import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSelf } from '@/lib/server-auth'

function normalizePatternKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
}

function normalizeTriedSolution(item: unknown) {
  if (!item || typeof item !== 'object') return null
  const candidate = item as Record<string, unknown>
  if (typeof candidate.text !== 'string' || !candidate.text.trim()) return null

  return {
    text: candidate.text.trim(),
    worked:
      typeof candidate.worked === 'boolean'
        ? candidate.worked
        : null,
    result: typeof candidate.result === 'string' ? candidate.result : undefined,
    comment: typeof candidate.comment === 'string' ? candidate.comment : null,
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : null,
    sourceActionKind: typeof candidate.sourceActionKind === 'string' ? candidate.sourceActionKind : null,
    sourcePlanMode: typeof candidate.sourcePlanMode === 'string' ? candidate.sourcePlanMode : null,
    linkedEntityType: typeof candidate.linkedEntityType === 'string' ? candidate.linkedEntityType : null,
    linkedEntityLabel: typeof candidate.linkedEntityLabel === 'string' ? candidate.linkedEntityLabel : null,
  }
}

// GET /api/ai/patterns?userId=xxx — list all UserAiPattern records for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const auth = requireSelf(request, userId)
    if ('error' in auth) return auth.error

    const [patterns, activeLeaks] = await Promise.all([
      db.userAiPattern.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        select: {
          leakType: true,
          analysisCount: true,
          whatWorked: true,
          triedSolutions: true,
          updatedAt: true,
        },
      }),
      db.leak.findMany({
        where: {
          userId,
          status: {
            in: ['new', 'in_progress'],
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
        select: {
          id: true,
          title: true,
          status: true,
          updatedAt: true,
        },
      }),
    ])

    const leakMap = new Map<string, Array<{ id: string; title: string; status: string; updatedAt: string }>>()
    activeLeaks.forEach((leak) => {
      const key = normalizePatternKey(leak.title)
      const current = leakMap.get(key) || []
      current.push({
        id: leak.id,
        title: leak.title,
        status: leak.status,
        updatedAt: leak.updatedAt.toISOString(),
      })
      leakMap.set(key, current)
    })

    const enrichedPatterns = patterns.map((pattern) => {
      const patternKey = normalizePatternKey(pattern.leakType)
      let linkedLeaks = leakMap.get(patternKey) || []

      if (linkedLeaks.length === 0) {
        linkedLeaks = activeLeaks
          .filter((leak) => {
            const leakKey = normalizePatternKey(leak.title)
            return leakKey.includes(patternKey) || patternKey.includes(leakKey)
          })
          .map((leak) => ({
            id: leak.id,
            title: leak.title,
            status: leak.status,
            updatedAt: leak.updatedAt.toISOString(),
          }))
      }
      const triedSolutions = Array.isArray(pattern.triedSolutions)
        ? (pattern.triedSolutions as unknown[])
            .map(normalizeTriedSolution)
            .filter((item): item is NonNullable<ReturnType<typeof normalizeTriedSolution>> => Boolean(item))
        : []
      const workedCount = triedSolutions.filter((item) => item.result === 'worked').length
      const partialCount = triedSolutions.filter((item) => item.result === 'partially').length
      const failedCount = triedSolutions.filter((item) => item.result === 'not_worked').length
      const workedExamples = triedSolutions
        .filter((item) => item.result === 'worked' || item.worked === true)
        .slice(0, 6)

      return {
        ...pattern,
        triedSolutions,
        workedCount,
        partialCount,
        failedCount,
        workedExamples,
        activeLeakCount: linkedLeaks.length,
        activeLeaks: linkedLeaks,
      }
    })

    return NextResponse.json({ success: true, patterns: enrichedPatterns })
  } catch (error) {
    console.error('[ai/patterns GET] error:', error)
    return NextResponse.json({ error: 'Failed to get patterns' }, { status: 500 })
  }
}
