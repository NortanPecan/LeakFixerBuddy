import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { callAI } from '@/lib/ai-provider'

const WEEKLY_DIGEST_SYSTEM = `Ты персональный коуч по саморазвитию в приложении LeakFixer Buddy.
Тебе дают статистику пользователя за прошедшую неделю.
Напиши краткое резюме недели: 3-4 предложения на русском языке.
Структура: 1) что было лучшим за неделю, 2) главный лик (проблемная зона), 3) один конкретный совет на следующую неделю.
Правила: без markdown-разметки, эмодзи допустимы, конкретные цифры из данных, поддерживающий тон.
Ответь ТОЛЬКО текстом резюме, без заголовков.`

async function buildWeeklyContext(userId: string): Promise<string> {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  sevenDaysAgo.setHours(0, 0, 0, 0)

  const [
    user,
    userProfile,
    fitnessDays,
    dailyStates,
    ritualCompletions,
    activeRituals,
    gymWorkouts,
    transactions,
    topLeakPattern,
  ] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { streak: true, day: true, firstName: true },
    }),
    db.userProfile.findUnique({ where: { userId }, select: { leakProfile: true } }),
    db.fitnessDaily.findMany({ where: { userId, date: { gte: sevenDaysAgo } } }),
    db.dailyState.findMany({ where: { userId, date: { gte: sevenDaysAgo } } }),
    db.ritualCompletion.findMany({
      where: { userId, date: { gte: sevenDaysAgo }, completed: true },
    }),
    db.ritual.count({ where: { userId, status: 'active' } }),
    db.gymWorkout.findMany({
      where: { userId, date: { gte: sevenDaysAgo }, status: 'completed' },
    }),
    db.transaction.findMany({
      where: { userId, date: { gte: sevenDaysAgo } },
      select: { amount: true },
    }),
    db.userAiPattern.findFirst({
      where: { userId, NOT: { leakType: 'tg_input_patterns' } },
      orderBy: { updatedAt: 'desc' },
      select: { leakType: true },
    }),
  ])

  const avgMood = dailyStates.length
    ? (dailyStates.reduce((s, d) => s + (d.mood ?? 5), 0) / dailyStates.length).toFixed(1)
    : null
  const avgEnergy = dailyStates.length
    ? (dailyStates.reduce((s, d) => s + (d.energy ?? 5), 0) / dailyStates.length).toFixed(1)
    : null
  const avgSleep = dailyStates.filter(d => d.sleepHours).length
    ? (
        dailyStates.reduce((s, d) => s + (d.sleepHours ?? 0), 0) /
        dailyStates.filter(d => d.sleepHours).length
      ).toFixed(1)
    : null
  const avgCalories = fitnessDays.length
    ? Math.round(fitnessDays.reduce((s, d) => s + (d.calories ?? 0), 0) / fitnessDays.length)
    : null
  const avgWater = fitnessDays.length
    ? Math.round(fitnessDays.reduce((s, d) => s + (d.water ?? 0), 0) / fitnessDays.length)
    : null
  const ritualRate =
    activeRituals > 0
      ? Math.round((ritualCompletions.length / (activeRituals * 7)) * 100)
      : null

  const totalExpenses = transactions
    .filter(t => (t.amount as number) < 0)
    .reduce((s, t) => s + Math.abs(t.amount as number), 0)

  // Human-readable leak label
  const LEAK_LABELS: Record<string, string> = {
    low_energy: 'низкая энергия',
    no_gym: 'нет тренировок',
    ritual_consistency: 'непоследовательность в ритуалах',
    calorie_spikes: 'скачки калорий',
    sleep_deficit: 'недосып',
    expense_spike: 'всплески расходов',
    high_stress: 'высокий стресс',
    missed_checkins: 'пропущенные чек-апы',
    gym_dropout: 'прекратил ходить в зал',
    weekend_ritual_drop: 'провалы ритуалов в выходные',
  }
  const topLeakLabel = topLeakPattern?.leakType
    ? (LEAK_LABELS[topLeakPattern.leakType] ?? topLeakPattern.leakType.replace(/_/g, ' '))
    : null

  const lines = [
    `Пользователь: ${user?.firstName ?? 'Аноним'}, стрик ${user?.streak ?? 0} дней (день ${user?.day ?? 1} в приложении)`,
    avgMood !== null ? `Среднее настроение за неделю: ${avgMood}/10` : null,
    avgEnergy !== null ? `Средняя энергия: ${avgEnergy}/10` : null,
    avgSleep !== null ? `Средний сон: ${avgSleep} ч` : null,
    `Тренировок за неделю: ${gymWorkouts.length}`,
    ritualRate !== null ? `Выполнение ритуалов: ${ritualRate}% (${ritualCompletions.length} из ${activeRituals * 7} возможных)` : null,
    avgCalories !== null ? `Среднее потребление калорий: ${avgCalories} ккал/день` : null,
    avgWater !== null ? `Среднее потребление воды: ${avgWater} мл/день` : null,
    totalExpenses > 0 ? `Расходы за неделю: ${Math.round(totalExpenses)} руб.` : null,
    topLeakLabel ? `Главная проблемная зона (лик): ${topLeakLabel}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  return lines || 'Новый пользователь, данных за неделю пока нет.'
}

// Start of current Monday (00:00)
function getWeekStart(): Date {
  const d = new Date()
  const day = d.getDay() // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day // days to subtract to get to Monday
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

// ─── GET /api/ai/weekly-digest?userId=xxx ─────────────────────────────────────
// Returns this week's digest (cached in ai_logs) or generates a new one
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const weekStart = getWeekStart()

  // Check cache: already generated this week?
  const cached = await db.aiLog.findFirst({
    where: {
      userId,
      callType: 'weekly_digest',
      success: true,
      createdAt: { gte: weekStart },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (cached) {
    return NextResponse.json({
      digest: cached.response,
      provider: cached.provider,
      cached: true,
      createdAt: cached.createdAt,
    })
  }

  try {
    const userContext = await buildWeeklyContext(userId)
    const result = await callAI(WEEKLY_DIGEST_SYSTEM, userContext, {
      userId,
      callType: 'weekly_digest',
    })

    return NextResponse.json({
      digest: result.text,
      provider: result.provider,
      cached: false,
      createdAt: new Date(),
    })
  } catch (error) {
    console.error('[weekly-digest GET]', error)
    return NextResponse.json({ error: 'AI недоступен' }, { status: 503 })
  }
}

// ─── POST /api/ai/weekly-digest ───────────────────────────────────────────────
// Generate digest for single user (used by send-weekly-digest cron)
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await request.json()) as { userId?: string }
    const { userId } = body
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const weekStart = getWeekStart()
    const cached = await db.aiLog.findFirst({
      where: { userId, callType: 'weekly_digest', success: true, createdAt: { gte: weekStart } },
      select: { response: true, provider: true },
    })
    if (cached) {
      return NextResponse.json({ digest: cached.response, provider: cached.provider, cached: true })
    }

    const userContext = await buildWeeklyContext(userId)
    const result = await callAI(WEEKLY_DIGEST_SYSTEM, userContext, {
      userId,
      callType: 'weekly_digest',
    })

    return NextResponse.json({ digest: result.text, provider: result.provider, cached: false })
  } catch (error) {
    console.error('[weekly-digest POST]', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
