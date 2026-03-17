import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { callAI } from '@/lib/ai-provider'
import {
  buildLeakAnalysisMessage,
  getLeakAnalysisSystemPrompt,
  parseLeakAnalysis,
  type UserContextForPrompt,
  type PastPattern,
} from '@/lib/ai-leak-prompts'

/**
 * POST /api/ai/analyze-leak
 *
 * Body: { userId, leakType, leakMessage, severity }
 *
 * Собирает персональный контекст пользователя, вызывает Groq → Gemini,
 * сохраняет результат в user_ai_patterns, возвращает LeakAnalysis.
 */
export async function POST(request: NextRequest) {
  let body: {
    userId?: string
    leakType?: string
    leakMessage?: string
    severity?: string
  }

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

  // ── 1. Загружаем контекст пользователя ───────────────────────────────────

  const [profile, settings, recentStates, recentCheckins, gymPeriods, recentRituals, existingPattern] =
    await Promise.all([
      db.userProfile.findUnique({
        where: { userId },
        select: { age: true, workProfile: true, targetWeight: true, leakProfile: true },
      }),
      db.userSettings.findUnique({ where: { userId }, select: { hiddenWidgets: true } }),
      // Последние 7 дней настроения/энергии/сна
      db.dailyState.findMany({
        where: {
          userId,
          date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        select: { mood: true, energy: true, sleepHours: true },
      }),
      // Чекапы за 7 дней (энергия утром)
      db.dailyCheckin.findMany({
        where: {
          userId,
          date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          type: 'morning',
        },
        select: { energy: true },
      }).catch(() => [] as { energy: number | null }[]),
      // Тренировки за 7 дней
      db.gymPeriod.findFirst({
        where: { userId, isActive: true },
        select: { id: true },
      }),
      // Ритуалы за 7 дней
      db.ritualCompletion.findMany({
        where: {
          userId,
          date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        select: { completed: true },
      }).catch(() => [] as { completed: boolean }[]),
      // Существующий паттерн для этого лика (история)
      db.userAiPattern.findUnique({
        where: { userId_leakType: { userId, leakType } },
      }),
    ])

  // Тренировки за 7 дней
  let gymDays = 0
  if (gymPeriods) {
    gymDays = await db.gymWorkout
      .count({
        where: {
          periodId: gymPeriods.id,
          date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          completed: true,
        },
      })
      .catch(() => 0)
  }

  // Средние значения за 7 дней
  const avgMood = recentStates.length
    ? recentStates.reduce((s, d) => s + (d.mood ?? 0), 0) / recentStates.filter(d => d.mood).length || 0
    : 0
  const avgEnergy = recentCheckins.length
    ? recentCheckins.reduce((s, c) => s + (c.energy ?? 0), 0) / recentCheckins.filter(c => c.energy).length || 0
    : 0
  const avgSleep = recentStates.filter(d => d.sleepHours).length
    ? recentStates.reduce((s, d) => s + (d.sleepHours ?? 0), 0) /
      recentStates.filter(d => d.sleepHours).length
    : 0
  const ritualRate = recentRituals.length
    ? (recentRituals.filter(r => r.completed).length / recentRituals.length) * 100
    : 0

  // Прошлые паттерны
  const pastPatterns: PastPattern[] = []
  if (existingPattern) {
    const tried = (existingPattern.triedSolutions as { text: string }[]) ?? []
    const worked = (existingPattern.whatWorked as string[]) ?? []
    pastPatterns.push({
      leakType,
      triedSolutions: tried.map(t => t.text),
      whatWorked: worked,
    })
  }

  const userCtx: UserContextForPrompt = {
    leakProfile: (profile?.leakProfile as string[]) ?? [],
    profile: {
      age:           profile?.age ?? undefined,
      workProfile:   profile?.workProfile ?? undefined,
      targetWeight:  profile?.targetWeight ?? undefined,
    },
    recentStats: {
      avgMood:      Number(avgMood.toFixed(1)),
      avgEnergy:    Number(avgEnergy.toFixed(1)),
      gymDays,
      ritualRate:   Number(ritualRate.toFixed(0)),
      sleepAvg:     Number(avgSleep.toFixed(1)),
      avgCalories:  0, // без дополнительного запроса к foodEntry
    },
    pastPatterns,
  }

  // ── 2. Вызываем AI ───────────────────────────────────────────────────────

  const systemPrompt = getLeakAnalysisSystemPrompt()
  const userMessage  = buildLeakAnalysisMessage(leakType, leakMessage, severity, userCtx)

  let aiResult: { text: string; provider: 'groq' | 'gemini' }
  try {
    aiResult = await callAI(systemPrompt, userMessage)
  } catch (err) {
    console.error('[analyze-leak] AI call failed:', err)
    return NextResponse.json(
      { error: 'AI providers unavailable. Add GROQ_API_KEY or GEMINI_API_KEY to ENV.' },
      { status: 503 }
    )
  }

  const analysis = parseLeakAnalysis(aiResult.text)
  analysis.provider = aiResult.provider

  // ── 3. Сохраняем в user_ai_patterns ─────────────────────────────────────

  const existingTried = existingPattern
    ? ((existingPattern.triedSolutions as object[]) ?? [])
    : []
  // Добавляем новые решения в историю попыток (без дублей)
  const existingSolutions = existingTried as { text: string }[]
  const newTriedEntries = analysis.solutions
    .filter(s => !existingSolutions.some(e => e.text === s.text))
    .map(s => ({ text: s.text, triedAt: new Date().toISOString(), worked: null }))

  await db.userAiPattern.upsert({
    where:  { userId_leakType: { userId, leakType } },
    update: {
      lastAnalysis:   analysis as object,
      triedSolutions: [...existingSolutions, ...newTriedEntries],
      analysisCount:  { increment: 1 },
      lastProvider:   aiResult.provider,
    },
    create: {
      userId,
      leakType,
      lastAnalysis:   analysis as object,
      triedSolutions: newTriedEntries,
      whatWorked:     [],
      analysisCount:  1,
      lastProvider:   aiResult.provider,
    },
  })

  // ── 4. Ответ ─────────────────────────────────────────────────────────────

  return NextResponse.json({
    success: true,
    analysis,
    provider: aiResult.provider,
    cached: false,
  })
}

/**
 * GET /api/ai/analyze-leak?userId=...&leakType=...
 * Возвращает последний сохранённый анализ (без нового AI-вызова)
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
