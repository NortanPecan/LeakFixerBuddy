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

function patternTokens(value: string) {
  return normalizePatternKey(value)
    .split(' ')
    .map((item) => item.trim())
    .filter((item) => item.length >= 3)
}

function tokenOverlapScore(a: string[], b: string[]) {
  if (!a.length || !b.length) return 0
  const aSet = new Set(a)
  const bSet = new Set(b)
  const intersection = Array.from(aSet).filter((item) => bSet.has(item)).length
  const union = new Set([...aSet, ...bSet]).size
  return union > 0 ? intersection / union : 0
}

function isClusterMatch(a: string, b: string) {
  if (!a || !b) return false
  if (a === b) return true
  if (a.includes(b) || b.includes(a)) return true
  const overlap = tokenOverlapScore(patternTokens(a), patternTokens(b))
  return overlap >= 0.45
}

function clusterMatchConfidence(a: string, b: string) {
  if (!a || !b) return 0
  if (a === b) return 1
  if (a.includes(b) || b.includes(a)) return 0.8
  return tokenOverlapScore(patternTokens(a), patternTokens(b))
}

function resolveClusterConflictLabel(workedCount: number, failedCount: number) {
  if (workedCount <= 0 || failedCount <= 0) {
    return { label: 'none' as const, ratio: 0 }
  }
  const ratio = Math.min(workedCount, failedCount) / Math.max(workedCount, failedCount)
  if (ratio >= 0.7) {
    return { label: 'high' as const, ratio: Number(ratio.toFixed(2)) }
  }
  return { label: 'mixed' as const, ratio: Number(ratio.toFixed(2)) }
}

function resolveClusterConfidence(params: {
  baseConfidence: number
  size: number
  analysisCount: number
  workedCount: number
  failedCount: number
}) {
  const { baseConfidence, size, analysisCount, workedCount, failedCount } = params
  const evidenceBoost = Math.min(0.18, Math.log2(Math.max(analysisCount, 1) + 1) * 0.06)
  const sizeBoost = Math.min(0.1, Math.max(0, size - 1) * 0.03)
  const { ratio } = resolveClusterConflictLabel(workedCount, failedCount)
  const conflictPenalty = ratio > 0 ? Math.min(0.28, ratio * 0.32) : 0
  const value = Math.max(0.05, Math.min(1, baseConfidence + evidenceBoost + sizeBoost - conflictPenalty))
  return Number(value.toFixed(2))
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

    const leakMap = new Map<string, Array<{
      id: string
      title: string
      status: string
      updatedAt: string
      matchType: 'exact' | 'fuzzy'
    }>>()
    activeLeaks.forEach((leak) => {
      const key = normalizePatternKey(leak.title)
      const current = leakMap.get(key) || []
      current.push({
        id: leak.id,
        title: leak.title,
        status: leak.status,
        updatedAt: leak.updatedAt.toISOString(),
        matchType: 'exact',
      })
      leakMap.set(key, current)
    })

    const enrichedPatterns = patterns.map((pattern) => {
      const patternKey = normalizePatternKey(pattern.leakType)
      let linkedLeaks = leakMap.get(patternKey) || []
      let linkType: 'exact' | 'fuzzy' | 'none' = linkedLeaks.length > 0 ? 'exact' : 'none'

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
            matchType: 'fuzzy' as const,
          }))
        if (linkedLeaks.length > 0) {
          linkType = 'fuzzy'
        }
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
        patternKey,
        triedSolutions,
        workedCount,
        partialCount,
        failedCount,
        workedExamples,
        linkType,
        activeLeakCount: linkedLeaks.length,
        activeLeaks: linkedLeaks,
      }
    })
    const clusters: Array<{
      key: string
      label: string
      members: number[]
      confidence: number
    }> = []
    enrichedPatterns.forEach((pattern, index) => {
      const match = clusters.find((cluster) => isClusterMatch(cluster.key, pattern.patternKey))
      if (match) {
        match.members.push(index)
        match.confidence = Math.max(match.confidence, clusterMatchConfidence(match.key, pattern.patternKey))
        return
      }
      clusters.push({
        key: pattern.patternKey || `cluster-${index}`,
        label: pattern.leakType,
        members: [index],
        confidence: 1,
      })
    })

    const clusterStats = clusters
      .map((cluster) => {
        const members = cluster.members.map((index) => enrichedPatterns[index])
        const workedCount = members.reduce((sum, item) => sum + (item.workedCount || 0), 0)
        const partialCount = members.reduce((sum, item) => sum + (item.partialCount || 0), 0)
        const failedCount = members.reduce((sum, item) => sum + (item.failedCount || 0), 0)
        const analysisCount = members.reduce((sum, item) => sum + (item.analysisCount || 0), 0)
        const leakTypes = members.map((item) => item.leakType)
        const workedExamples = members
          .flatMap((item) => item.workedExamples || [])
          .map((item) => item.text)
          .filter(Boolean)
          .slice(0, 6)
        const failedExamples = members
          .flatMap((item) => item.triedSolutions || [])
          .filter((item) => item.result === 'not_worked')
          .map((item) => item.text)
          .filter(Boolean)
          .slice(0, 6)
        const conflict = resolveClusterConflictLabel(workedCount, failedCount)
        const confidence = resolveClusterConfidence({
          baseConfidence: cluster.confidence,
          size: members.length,
          analysisCount,
          workedCount,
          failedCount,
        })
        return {
          key: cluster.key,
          label: cluster.label,
          size: members.length,
          confidence,
          rawConfidence: Number(cluster.confidence.toFixed(2)),
          conflict: conflict.label,
          conflictRatio: conflict.ratio,
          workedCount,
          partialCount,
          failedCount,
          analysisCount,
          leakTypes,
          workedExamples,
          failedExamples,
        }
      })
      .sort((a, b) => b.size - a.size || b.analysisCount - a.analysisCount)

    const patternsWithCluster = enrichedPatterns.map((pattern) => {
      const cluster =
        clusterStats.find((item) => isClusterMatch(item.key, pattern.patternKey)) || null
      return {
        ...pattern,
        clusterKey: cluster?.key || pattern.patternKey,
        clusterLabel: cluster?.label || pattern.leakType,
        clusterSize: cluster?.size || 1,
        clusterConfidence: cluster?.confidence || 1,
        clusterRawConfidence: cluster?.rawConfidence || 1,
        clusterConflict: cluster?.conflict || 'none',
        clusterConflictRatio: cluster?.conflictRatio || 0,
        clusterWorkedCount: cluster?.workedCount || pattern.workedCount || 0,
        clusterPartialCount: cluster?.partialCount || pattern.partialCount || 0,
        clusterFailedCount: cluster?.failedCount || pattern.failedCount || 0,
        clusterLeakTypes: cluster?.leakTypes || [pattern.leakType],
        clusterWorkedExamples: cluster?.workedExamples || [],
        clusterFailedExamples: cluster?.failedExamples || [],
      }
    })
    const clustersView = clusterStats.slice(0, 12).map((cluster) => ({
      key: cluster.key,
      label: cluster.label,
      size: cluster.size,
      confidence: cluster.confidence,
      rawConfidence: cluster.rawConfidence,
      conflict: cluster.conflict,
      conflictRatio: cluster.conflictRatio,
      workedCount: cluster.workedCount,
      partialCount: cluster.partialCount,
      failedCount: cluster.failedCount,
      analysisCount: cluster.analysisCount,
      leakTypes: cluster.leakTypes.slice(0, 6),
      workedExamples: cluster.workedExamples,
      failedExamples: cluster.failedExamples,
    }))

    return NextResponse.json({ success: true, patterns: patternsWithCluster, clusters: clustersView })
  } catch (error) {
    console.error('[ai/patterns GET] error:', error)
    return NextResponse.json({ error: 'Failed to get patterns' }, { status: 500 })
  }
}
