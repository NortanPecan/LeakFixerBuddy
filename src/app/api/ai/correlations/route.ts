/**
 * GET /api/ai/correlations?userId=
 *
 * Collects 30 days of user data and asks Groq to find the top-5 behavioral patterns.
 * Cached in ai_logs (callType='correlations') for 24 hours.
 *
 * Response: { patterns: CorrelationPattern[], provider, cached, createdAt }
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { callAI } from '@/lib/ai-provider'
import { requireSelf } from '@/lib/server-auth'

export interface CorrelationPattern {
  pattern: string        // "В дни тренировок настроение выше на 1.5 балла"
  strength: 'strong' | 'moderate' | 'weak'
  recommendation: string // "Запланируй тренировки в понедельник и среду"
}

const CORRELATIONS_SYSTEM = `Ты аналитик данных для фитнес-приложения.
Тебе дают статистику пользователя за 30 дней: настроение, энергия, сон, тренировки, ритуалы, калории, вода.
Найди ТОП-5 значимых паттернов (корреляций) между переменными.
Используй конкретные числа из данных.
Отвечай ТОЛЬКО JSON без markdown:
[
  {"pattern":"описание паттерна с числами","strength":"strong|moderate|weak","recommendation":"конкретный совет"},
  ...
]
strength: strong = очевидная связь, moderate = заметная, weak = слабая.
Отвечай на русском языке.`

async function buildCorrelationContext(userId: string): Promise<string> {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  thirtyDaysAgo.setHours(0, 0, 0, 0)

  const [dailyStates, fitnessDaily, gymWorkouts, ritualCompletions, activeRituals, checkins] =
    await Promise.all([
      db.dailyState.findMany({
        where: { userId, date: { gte: thirtyDaysAgo } },
        orderBy: { date: 'asc' },
      }),
      db.fitnessDaily.findMany({
        where: { userId, date: { gte: thirtyDaysAgo } },
        orderBy: { date: 'asc' },
      }),
      db.gymWorkout.findMany({
        where: { userId, date: { gte: thirtyDaysAgo }, status: 'completed' },
        select: { date: true },
        orderBy: { date: 'asc' },
      }),
      db.ritualCompletion.findMany({
        where: { userId, date: { gte: thirtyDaysAgo }, completed: true },
        select: { date: true },
      }),
      db.ritual.count({ where: { userId, status: 'active' } }),
      db.dailyCheckin.findMany({
        where: { userId, date: { gte: thirtyDaysAgo } },
        select: { date: true, type: true, energy: true },
      }).catch(() => [] as { date: Date; type: string; energy: number | null }[]),
    ])

  // Build per-date snapshot
  const gymDates = new Set(gymWorkouts.map(w => w.date.toISOString().split('T')[0]))
  const ritualByDate = new Map<string, number>()
  ritualCompletions.forEach(rc => {
    const d = rc.date.toISOString().split('T')[0]
    ritualByDate.set(d, (ritualByDate.get(d) ?? 0) + 1)
  })
  const morningEnergyByDate = new Map<string, number>()
  checkins.filter(c => c.type === 'morning' && c.energy).forEach(c => {
    morningEnergyByDate.set(c.date.toISOString().split('T')[0], c.energy!)
  })
  const fitnessByDate = new Map(fitnessDaily.map(fd => [fd.date.toISOString().split('T')[0], fd]))

  const rows: string[] = []
  dailyStates.slice(-30).forEach(ds => {
    const d = ds.date.toISOString().split('T')[0]
    const fd = fitnessByDate.get(d)
    const ritDone = ritualByDate.get(d) ?? 0
    const ritRate = activeRituals > 0 ? Math.round((ritDone / activeRituals) * 100) : null
    const gym = gymDates.has(d) ? 'да' : 'нет'
    const me = morningEnergyByDate.get(d)

    rows.push(
      [
        `дата=${d}`,
        ds.mood !== null ? `настроение=${ds.mood}` : null,
        ds.energy !== null ? `энергия=${ds.energy}` : null,
        ds.sleepHours !== null ? `сон=${ds.sleepHours}ч` : null,
        me !== undefined ? `энергия_утром=${me}` : null,
        `зал=${gym}`,
        ritRate !== null ? `ритуалы=${ritRate}%` : null,
        fd?.calories ? `ккал=${fd.calories}` : null,
        fd?.water ? `вода=${fd.water}мл` : null,
      ]
        .filter(Boolean)
        .join(', ')
    )
  })

  if (rows.length < 5) {
    return 'Недостаточно данных для анализа (менее 5 дней).'
  }

  return `Данные за ${rows.length} дней (активных ритуалов: ${activeRituals}):\n${rows.join('\n')}`
}

// ─── GET /api/ai/correlations?userId= ────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const auth = requireSelf(request, userId)
  if ('error' in auth) return auth.error

  // Cache: 24 hours
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const cached = await db.aiLog.findFirst({
    where: {
      userId,
      callType: 'correlations',
      success: true,
      createdAt: { gte: oneDayAgo },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (cached) {
    try {
      const patterns = JSON.parse(cached.response) as CorrelationPattern[]
      return NextResponse.json({
        patterns,
        provider: cached.provider,
        cached: true,
        createdAt: cached.createdAt,
      })
    } catch {
      // cache is malformed, regenerate
    }
  }

  try {
    const context = await buildCorrelationContext(userId)

    if (context.startsWith('Недостаточно')) {
      return NextResponse.json({ patterns: [], cached: false, message: context })
    }

    const result = await callAI(CORRELATIONS_SYSTEM, context, {
      userId,
      callType: 'correlations',
    })

    // Parse JSON array from response
    let patterns: CorrelationPattern[] = []
    try {
      const raw = result.text.trim()
      // Strip possible markdown fences
      const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
      const parsed = JSON.parse(jsonStr) as CorrelationPattern[]
      patterns = Array.isArray(parsed)
        ? parsed.slice(0, 5).map(p => ({
            pattern: String(p.pattern ?? ''),
            strength: (['strong', 'moderate', 'weak'] as const).includes(p.strength as 'strong')
              ? (p.strength as 'strong' | 'moderate' | 'weak')
              : 'moderate',
            recommendation: String(p.recommendation ?? ''),
          }))
        : []
    } catch {
      // Fallback: wrap raw text
      patterns = [{ pattern: result.text.slice(0, 200), strength: 'moderate', recommendation: '' }]
    }

    return NextResponse.json({
      patterns,
      provider: result.provider,
      cached: false,
      createdAt: new Date(),
    })
  } catch (error) {
    console.error('[correlations]', error)
    return NextResponse.json({ error: 'AI недоступен' }, { status: 503 })
  }
}
