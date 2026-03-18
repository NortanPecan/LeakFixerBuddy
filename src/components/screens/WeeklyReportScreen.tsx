'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { LeakAiAnalysisCard } from '@/components/LeakAiAnalysisCard'

interface DayData {
  date: string
  dayOfWeek: string
  mood: number | null
  energy: number | null
  morningEnergy: number | null
  eveningRating: number | null
  totalCalories: number
  foodCount: number
  foodGood: number
  foodNeutral: number
  foodBad: number
  hadGym: boolean
  morningCheckinDone: boolean
  eveningCheckinDone: boolean
  ritualsCompleted: number
  ritualsTotal: number
  habitsCompleted: number
  expenses: number
  sleepHours: number | null
}

interface LeakHint {
  type: string
  severity: 'info' | 'warning' | 'critical'
  message: string
  emoji: string
  days?: string[]
}

interface Summary {
  avgMood: number
  avgEnergy: number
  avgEveningRating: number
  gymDays: number
  checkinDays: number
  totalCalories: number
  avgCaloriesPerDay: number
  totalRitualsCompleted: number
  totalHabitsCompleted: number
  totalExpenses: number
  bestDay: DayData
}

interface WeeklyReport {
  weekStart: string
  weekEnd: string
  days: DayData[]
  summary: Summary
  leakHints: LeakHint[]
}

interface CorrelationPattern {
  pattern: string
  strength: 'strong' | 'moderate' | 'weak'
  recommendation: string
}

export function WeeklyReportScreen() {
  const { user } = useAppStore()
  const [report, setReport] = useState<WeeklyReport | null>(null)
  const [prevSummary, setPrevSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [weekOffset, setWeekOffset] = useState(0) // 0 = this week, -1 = last week
  const [aiCorrelations, setAiCorrelations] = useState<CorrelationPattern[] | null>(null)
  const [correlationsLoading, setCorrelationsLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return
      setLoading(true)
      try {
        const weekStart = getMonday(weekOffset)
        const weekStartStr = weekStart.toISOString().split('T')[0]
        const prevWeekStart = getMonday(weekOffset - 1)
        const prevWeekStartStr = prevWeekStart.toISOString().split('T')[0]
        const [res, prevRes] = await Promise.all([
          fetch(`/api/weekly-report?userId=${user.id}&weekStart=${weekStartStr}`),
          fetch(`/api/weekly-report?userId=${user.id}&weekStart=${prevWeekStartStr}`),
        ])
        const data = await res.json()
        const prevData = await prevRes.json()
        if (data.success) setReport(data)
        if (prevData.success) setPrevSummary(prevData.summary)
        else setPrevSummary(null)
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.id, weekOffset])

  useEffect(() => {
    if (!user?.id) return
    setCorrelationsLoading(true)
    fetch(`/api/ai/correlations?userId=${user.id}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.patterns)) setAiCorrelations(d.patterns) })
      .catch(() => {})
      .finally(() => setCorrelationsLoading(false))
  }, [user?.id])

  if (loading) {
    return (
      <div className="flex flex-col gap-4 pb-20">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="flex flex-col gap-4 pb-20">
        <p className="text-white/40 text-center mt-10">Нет данных за эту неделю</p>
      </div>
    )
  }

  const weekLabel = weekOffset === 0 ? 'Эта неделя' : `Неделя ${report.weekStart}`

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Недельный отчёт</h2>
          <p className="text-white/40 text-sm">{weekLabel}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setWeekOffset(w => w - 1)}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-white/60 text-sm"
          >
            ←
          </button>
          {weekOffset < 0 && (
            <button
              onClick={() => setWeekOffset(w => w + 1)}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-white/60 text-sm"
            >
              →
            </button>
          )}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-2">
        <StatBadge label="Настр." value={report.summary.avgMood} emoji="🎭" prev={prevSummary?.avgMood} />
        <StatBadge label="Энергия" value={report.summary.avgEnergy} emoji="⚡" prev={prevSummary?.avgEnergy} />
        <StatBadge label="Зал" value={report.summary.gymDays} emoji="💪" suffix="д" prev={prevSummary?.gymDays} />
        <StatBadge label="Чекапы" value={report.summary.checkinDays} emoji="✓" suffix="/7" prev={prevSummary?.checkinDays} />
      </div>
      {/* Second row of stats */}
      <div className="grid grid-cols-4 gap-2">
        <StatBadge label="Ритуалы" value={report.summary.totalRitualsCompleted} emoji="🔥" prev={prevSummary?.totalRitualsCompleted} />
        <StatBadge label="Привычки" value={report.summary.totalHabitsCompleted} emoji="🔄" prev={prevSummary?.totalHabitsCompleted} />
        <StatBadge label="Оценка дня" value={report.summary.avgEveningRating} emoji="🌙" prev={prevSummary?.avgEveningRating} />
        <StatBadge label="Расходы" value={report.summary.totalExpenses} emoji="💰" suffix="₽" prev={prevSummary?.totalExpenses} invertDelta />
      </div>

      {/* Mood & Energy mini-chart */}
      <MoodEnergyChart days={report.days} />

      {/* Best day highlight */}
      {report.summary.bestDay && (report.summary.bestDay.mood !== null || report.summary.bestDay.energy !== null) && (
        <Card style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🌟</span>
              <div className="flex-1">
                <span className="text-sm font-medium text-emerald-300">Лучший день: </span>
                <span className="text-sm text-white/70">{report.summary.bestDay.dayOfWeek}</span>
                <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                  {report.summary.bestDay.mood !== null && <span>🎭 {report.summary.bestDay.mood}/10</span>}
                  {report.summary.bestDay.energy !== null && <span>⚡ {report.summary.bestDay.energy}/10</span>}
                  {report.summary.bestDay.hadGym && <span>💪 зал</span>}
                  {report.summary.bestDay.ritualsCompleted > 0 && (
                    <span>🔥 {report.summary.bestDay.ritualsCompleted}/{report.summary.bestDay.ritualsTotal}</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leak hints — most important block */}
      {report.leakHints.length > 0 && (
        <Card
          style={{
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-white flex items-center gap-2">
              🔍 Найденные паттерны
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.leakHints.map((hint, i) => (
              <div
                key={i}
                className="p-3 rounded-xl"
                style={{
                  background: hint.severity === 'critical'
                    ? 'rgba(239,68,68,0.1)'
                    : hint.severity === 'warning'
                    ? 'rgba(245,158,11,0.1)'
                    : 'rgba(99,102,241,0.1)',
                  border: `1px solid ${
                    hint.severity === 'critical' ? 'rgba(239,68,68,0.2)'
                    : hint.severity === 'warning' ? 'rgba(245,158,11,0.2)'
                    : 'rgba(99,102,241,0.2)'
                  }`,
                }}
              >
                <div className="flex gap-3">
                  <span className="text-xl flex-shrink-0">{hint.emoji}</span>
                  <div className="flex-1">
                    <p className="text-sm text-white/80">{hint.message}</p>
                    {hint.days && (
                      <div className="flex gap-1 mt-1">
                        {hint.days.map(d => (
                          <Badge key={d} variant="outline" className="text-[10px] h-4">
                            {d}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {user?.id && (
                      <LeakAiAnalysisCard
                        userId={user.id}
                        leakType={hint.type}
                        leakMessage={hint.message}
                        severity={hint.severity}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Day-by-day view */}
      <Card
        style={{
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-white">По дням</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {report.days.map((day) => (
            <DayRow key={day.date} day={day} />
          ))}
        </CardContent>
      </Card>

      {/* No data hint */}
      {report.leakHints.length === 0 && report.summary.checkinDays < 3 && (
        <Card
          style={{
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.2)',
          }}
        >
          <CardContent className="pt-4">
            <p className="text-sm text-white/60 text-center">
              📊 Заполняй чекапы каждый день — через неделю появятся первые паттерны
            </p>
          </CardContent>
        </Card>
      )}

      {/* Correlation insights (3.2) */}
      <CorrelationInsights days={report.days} />

      {/* AI Correlations (5) */}
      {(correlationsLoading || (aiCorrelations && aiCorrelations.length > 0)) && (
        <Card className="bg-card/50 backdrop-blur border-violet-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              🧬 AI-паттерны (30 дней)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {correlationsLoading ? (
              <p className="text-sm text-white/40">Анализирую паттерны...</p>
            ) : (
              <div className="flex flex-col gap-3">
                {aiCorrelations!.map((p, i) => {
                  const strengthColor = p.strength === 'strong' ? 'text-green-400' : p.strength === 'moderate' ? 'text-yellow-400' : 'text-white/50'
                  const strengthLabel = p.strength === 'strong' ? '●●●' : p.strength === 'moderate' ? '●●○' : '●○○'
                  return (
                    <div key={i} className="border border-white/10 rounded-lg p-3">
                      <p className="text-sm text-white/90">{p.pattern}</p>
                      <p className={`text-xs mt-1 font-mono ${strengthColor}`}>{strengthLabel}</p>
                      {p.recommendation && (
                        <p className="text-xs text-white/60 mt-1">💡 {p.recommendation}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Smart recommendation (6.5) */}
      <SmartRecommendation report={report} />

      {/* AI Prompt export */}
      <AiPromptButton report={report} />
    </div>
  )
}

function CorrelationInsights({ days }: { days: DayData[] }) {
  const insights: Array<{ emoji: string; text: string }> = []

  const daysWithData = days.filter(d => d.mood !== null || d.energy !== null)
  if (daysWithData.length < 3) return null

  // Gym → mood correlation
  const gymDays = days.filter(d => d.hadGym && d.mood !== null)
  const noGymDays = days.filter(d => !d.hadGym && d.mood !== null)
  if (gymDays.length >= 2 && noGymDays.length >= 2) {
    const avgMoodGym = gymDays.reduce((s, d) => s + (d.mood ?? 0), 0) / gymDays.length
    const avgMoodNoGym = noGymDays.reduce((s, d) => s + (d.mood ?? 0), 0) / noGymDays.length
    if (avgMoodGym - avgMoodNoGym > 1.5) {
      insights.push({ emoji: '🏋️', text: `В дни тренировок настроение в среднем на ${(avgMoodGym - avgMoodNoGym).toFixed(1)} балла выше` })
    }
  }

  // Rituals → energy correlation
  const fullRitualDays = days.filter(d => d.ritualsTotal > 0 && d.ritualsCompleted === d.ritualsTotal && d.energy !== null)
  const missedRitualDays = days.filter(d => d.ritualsTotal > 0 && d.ritualsCompleted < d.ritualsTotal / 2 && d.energy !== null)
  if (fullRitualDays.length >= 2 && missedRitualDays.length >= 1) {
    const avgEnergyFull = fullRitualDays.reduce((s, d) => s + (d.energy ?? 0), 0) / fullRitualDays.length
    const avgEnergyMissed = missedRitualDays.reduce((s, d) => s + (d.energy ?? 0), 0) / missedRitualDays.length
    if (avgEnergyFull - avgEnergyMissed > 1) {
      insights.push({ emoji: '🎯', text: `Когда все ритуалы выполнены — энергия выше на ${(avgEnergyFull - avgEnergyMissed).toFixed(1)} балла` })
    }
  }

  // High calories → lower next-day energy
  const calDays = days
    .map((d, i) => ({ d, i }))
    .filter(({ d, i }) => i < days.length - 1 && d.totalCalories > 0)
  const highCalThenLowEnergy = calDays.filter(({ d, i }) => {
    const nextDay = days[i + 1]
    return d.totalCalories > 2500 && nextDay?.energy !== null && (nextDay.energy ?? 10) < 5
  }).map(({ d }) => d)
  if (highCalThenLowEnergy.length >= 2) {
    insights.push({ emoji: '🍔', text: `${highCalThenLowEnergy.length}× после дня переедания (>2500 ккал) энергия на следующий день падала ниже 5` })
  }

  // Sleep → next-day energy correlation
  const sleepDaysIndexed = days
    .map((d, i) => ({ d, i }))
    .filter(({ d, i }) => d.sleepHours !== null && i < days.length - 1)
  const sleepDays = sleepDaysIndexed.map(({ d }) => d)
  if (sleepDays.length >= 2) {
    const goodSleepNextEnergy = sleepDaysIndexed
      .filter(({ d }) => (d.sleepHours ?? 0) >= 7.5)
      .map(({ i }) => days[i + 1]?.energy)
      .filter((e): e is number => e !== null && e !== undefined)
    const shortSleepNextEnergy = sleepDaysIndexed
      .filter(({ d }) => (d.sleepHours ?? 0) < 6)
      .map(({ i }) => days[i + 1]?.energy)
      .filter((e): e is number => e !== null && e !== undefined)
    if (goodSleepNextEnergy.length >= 2 && shortSleepNextEnergy.length >= 1) {
      const avgGood = goodSleepNextEnergy.reduce((a, b) => a + b, 0) / goodSleepNextEnergy.length
      const avgShort = shortSleepNextEnergy.reduce((a, b) => a + b, 0) / shortSleepNextEnergy.length
      if (avgGood - avgShort > 1.5) {
        insights.push({ emoji: '😴', text: `После ночи 7.5ч+ энергия на следующий день выше на ${(avgGood - avgShort).toFixed(1)} балла` })
      }
    }
  }

  // Gym → next-day mood (gym lifts mood the day after)
  const gymNextMoods = days
    .map((d, i) => ({ d, i }))
    .filter(({ d, i }) => d.hadGym && i < days.length - 1 && days[i + 1].mood !== null)
    .map(({ i }) => days[i + 1].mood as number)
  const noGymNextMoods = days
    .map((d, i) => ({ d, i }))
    .filter(({ d, i }) => !d.hadGym && i < days.length - 1 && days[i + 1].mood !== null)
    .map(({ i }) => days[i + 1].mood as number)
  if (gymNextMoods.length >= 2 && noGymNextMoods.length >= 2) {
    const avgGym = gymNextMoods.reduce((a, b) => a + b, 0) / gymNextMoods.length
    const avgNo = noGymNextMoods.reduce((a, b) => a + b, 0) / noGymNextMoods.length
    if (avgGym - avgNo > 1.2) {
      insights.push({ emoji: '💪', text: `После тренировок настроение на следующий день выше на ${(avgGym - avgNo).toFixed(1)} балла` })
    }
  }

  // Evening checkin → better day rating
  const withEvening = days.filter(d => d.eveningCheckinDone && d.eveningRating !== null)
  const withoutEvening = days.filter(d => !d.eveningCheckinDone && d.eveningRating !== null)
  if (withEvening.length >= 2 && withoutEvening.length >= 1) {
    const avgWith = withEvening.reduce((s, d) => s + (d.eveningRating ?? 0), 0) / withEvening.length
    const avgWithout = withoutEvening.reduce((s, d) => s + (d.eveningRating ?? 0), 0) / withoutEvening.length
    if (avgWith - avgWithout > 1) {
      insights.push({ emoji: '🌙', text: `В дни с вечерним чекапом оценка дня выше на ${(avgWith - avgWithout).toFixed(1)} балла` })
    }
  }

  if (insights.length === 0) return null

  return (
    <Card style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          🔗 Паттерны недели
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {insights.map((ins, i) => (
          <div key={i} className="flex gap-2 text-sm">
            <span>{ins.emoji}</span>
            <span className="text-white/70">{ins.text}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function SmartRecommendation({ report }: { report: WeeklyReport }) {
  const s = report.summary
  const days = report.days

  interface Rec { emoji: string; title: string; action: string; score: number }
  const candidates: Rec[] = []

  // Low checkin rate
  if (s.checkinDays < 4) {
    candidates.push({
      emoji: '☀️',
      title: 'Фокус на чекапы',
      action: `Ты заполнил чекапы только ${s.checkinDays}/7 дней. На следующей неделе ставь будильник на 8:00 и 20:00 — данных для анализа будет в разы больше.`,
      score: (7 - s.checkinDays) * 2,
    })
  }

  // Low gym
  if (s.gymDays === 0) {
    candidates.push({
      emoji: '💪',
      title: 'Добавь одну тренировку',
      action: 'Ноль тренировок за неделю — запланируй хотя бы одну. Даже 30 минут изменят самочувствие и статистику.',
      score: 12,
    })
  } else if (s.gymDays === 1) {
    candidates.push({
      emoji: '💪',
      title: 'Ещё одна тренировка',
      action: 'Всего 1 тренировка за неделю — попробуй добавить вторую. Два раза в неделю уже системный результат.',
      score: 7,
    })
  }

  // Low mood
  if (s.avgMood > 0 && s.avgMood < 5) {
    candidates.push({
      emoji: '🧠',
      title: 'Работа с настроением',
      action: `Среднее настроение ${s.avgMood.toFixed(1)}/10 — критически низко. Приоритет на следующей неделе: 8+ часов сна и ежедневная прогулка.`,
      score: (5 - s.avgMood) * 3,
    })
  }

  // Low energy
  if (s.avgEnergy > 0 && s.avgEnergy < 5) {
    candidates.push({
      emoji: '⚡',
      title: 'Восстанови энергию',
      action: `Средняя энергия ${s.avgEnergy.toFixed(1)}/10. Попробуй: ранний подъём в одно время, нет кофе после 13:00, 20 минут ходьбы.`,
      score: (5 - s.avgEnergy) * 3,
    })
  }

  // Low rituals completion
  const ritualDays = days.filter(d => d.ritualsTotal > 0)
  if (ritualDays.length >= 3) {
    const avgRate = ritualDays.reduce((acc, d) => acc + d.ritualsCompleted / d.ritualsTotal, 0) / ritualDays.length
    if (avgRate < 0.5) {
      candidates.push({
        emoji: '🔥',
        title: 'Упрости ритуалы',
        action: `Ритуалы выполнены менее чем наполовину. Убери 1–2 ритуала, которые не идут — лучше меньше, но стабильно каждый день.`,
        score: (0.5 - avgRate) * 20,
      })
    }
  }

  if (candidates.length === 0) {
    // All good — give a growth rec
    return (
      <Card style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
        <CardContent className="pt-3 pb-3">
          <div className="flex gap-3 items-start">
            <span className="text-xl">🎯</span>
            <div>
              <p className="text-sm font-medium text-emerald-300">Рекомендация недели</p>
              <p className="text-sm text-white/60 mt-1">Неделя прошла хорошо! Выбери одну привычку и подними планку на 10%.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  candidates.sort((a, b) => b.score - a.score)
  const best = candidates[0]

  return (
    <Card style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
      <CardContent className="pt-3 pb-3">
        <div className="flex gap-3 items-start">
          <span className="text-xl">{best.emoji}</span>
          <div>
            <p className="text-sm font-medium text-indigo-300">💡 Рекомендация: {best.title}</p>
            <p className="text-sm text-white/60 mt-1">{best.action}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AiPromptButton({ report }: { report: WeeklyReport }) {
  const [copied, setCopied] = useState(false)

  const buildPrompt = (): string => {
    const s = report.summary
    const lines: string[] = []

    lines.push(`Ты — эксперт по саморазвитию и поведенческому анализу. Проанализируй мою неделю (${report.weekStart} — ${report.weekEnd}) и найди закономерности, паттерны и рекомендации.`)
    lines.push('')
    lines.push('## Статистика недели')
    lines.push(`- Среднее настроение: ${s.avgMood > 0 ? s.avgMood.toFixed(1) : 'нет данных'}/10`)
    lines.push(`- Средняя энергия: ${s.avgEnergy > 0 ? s.avgEnergy.toFixed(1) : 'нет данных'}/10`)
    lines.push(`- Средняя оценка дня: ${s.avgEveningRating > 0 ? s.avgEveningRating.toFixed(1) : 'нет данных'}/10`)
    lines.push(`- Дней в зале: ${s.gymDays}/7`)
    lines.push(`- Утренних чекапов: ${s.checkinDays}/7`)
    lines.push(`- Ритуалов выполнено: ${s.totalRitualsCompleted}`)
    lines.push(`- Привычек выполнено: ${s.totalHabitsCompleted}`)
    if (s.totalExpenses > 0) lines.push(`- Расходы: ${s.totalExpenses.toFixed(0)} ₽`)
    if (s.avgCaloriesPerDay > 0) lines.push(`- Среднее кКал/день: ${s.avgCaloriesPerDay.toFixed(0)}`)

    lines.push('')
    lines.push('## По дням')
    report.days.forEach(d => {
      const parts: string[] = [d.dayOfWeek]
      if (d.mood !== null) parts.push(`настр.${d.mood}`)
      if (d.morningEnergy !== null) parts.push(`энерг.${d.morningEnergy}`)
      if (d.eveningRating !== null) parts.push(`день${d.eveningRating}`)
      if (d.hadGym) parts.push('зал✓')
      if (d.morningCheckinDone) parts.push('утро✓')
      if (d.ritualsTotal > 0) parts.push(`ритуалы ${d.ritualsCompleted}/${d.ritualsTotal}`)
      if (d.habitsCompleted > 0) parts.push(`привычки ${d.habitsCompleted}`)
      if (d.expenses > 0) parts.push(`₽${d.expenses.toFixed(0)}`)
      lines.push(`- ${parts.join(' | ')}`)
    })

    if (report.leakHints.length > 0) {
      lines.push('')
      lines.push('## Найденные паттерны (автоматически)')
      report.leakHints.forEach(h => {
        lines.push(`- [${h.severity}] ${h.emoji} ${h.message}`)
      })
    }

    lines.push('')
    lines.push('## Задание')
    lines.push('1. Выдели 2–3 ключевых лика (утечки энергии/продуктивности) на основе данных')
    lines.push('2. Объясни связи между показателями (например: низкая энергия → меньше ритуалов → хуже день)')
    lines.push('3. Дай 2–3 конкретных действия на следующую неделю')
    lines.push('4. Что из паттернов требует немедленного внимания?')

    return lines.join('\n')
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildPrompt())
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback: select text
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="w-full py-3 rounded-2xl text-sm font-medium transition-all flex items-center justify-center gap-2"
      style={{
        background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(99,102,241,0.12)',
        border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(99,102,241,0.25)'}`,
        color: copied ? '#86efac' : '#a5b4fc',
      }}
    >
      {copied ? '✓ Скопировано!' : '🤖 Скопировать промпт для ИИ'}
    </button>
  )
}

function MoodEnergyChart({ days }: { days: DayData[] }) {
  const hasAnyData = days.some(d => d.mood !== null || d.morningEnergy !== null)
  if (!hasAnyData) return null

  const MAX = 10
  const H = 48 // chart area height px

  function dotColor(v: number): string {
    if (v >= 7) return '#22c55e'
    if (v >= 4) return '#f59e0b'
    return '#ef4444'
  }

  const dayLabels = days.map(d => d.dayOfWeek)

  // Build SVG polylines for mood and energy
  const points = (values: (number | null)[]): string => {
    const pts: string[] = []
    values.forEach((v, i) => {
      if (v === null) return
      const x = ((i / 6) * 100).toFixed(1)
      const y = (H - (v / MAX) * H).toFixed(1)
      pts.push(`${x},${y}`)
    })
    return pts.join(' ')
  }

  const moodVals = days.map(d => d.mood)
  const energyVals = days.map(d => d.morningEnergy)
  const hasMood = moodVals.some(v => v !== null)
  const hasEnergy = energyVals.some(v => v !== null)

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.1)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-white">Настроение и энергия</span>
        <div className="flex items-center gap-3 text-[10px] text-white/40">
          {hasMood && <span><span className="inline-block w-2 h-2 rounded-full bg-violet-400 mr-1" />настр.</span>}
          {hasEnergy && <span><span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1" />энергия</span>}
        </div>
      </div>

      {/* SVG chart */}
      <svg
        viewBox={`0 0 100 ${H}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height: H }}
      >
        {/* Horizontal guide lines at 4 and 7 */}
        {[4, 7].map(v => (
          <line
            key={v}
            x1="0" x2="100"
            y1={H - (v / MAX) * H} y2={H - (v / MAX) * H}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="0.5"
          />
        ))}

        {/* Mood polyline */}
        {hasMood && (
          <polyline
            points={points(moodVals)}
            fill="none"
            stroke="#a78bfa"
            strokeWidth="1.2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {/* Energy polyline */}
        {hasEnergy && (
          <polyline
            points={points(energyVals)}
            fill="none"
            stroke="#fbbf24"
            strokeWidth="1.2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Mood dots */}
        {hasMood && moodVals.map((v, i) => v !== null ? (
          <circle
            key={`m${i}`}
            cx={((i / 6) * 100).toFixed(1)}
            cy={(H - (v / MAX) * H).toFixed(1)}
            r="2.2"
            fill={dotColor(v)}
          />
        ) : null)}

        {/* Energy dots */}
        {hasEnergy && energyVals.map((v, i) => v !== null ? (
          <circle
            key={`e${i}`}
            cx={((i / 6) * 100).toFixed(1)}
            cy={(H - (v / MAX) * H).toFixed(1)}
            r="2.2"
            fill={dotColor(v)}
            stroke="#fbbf24"
            strokeWidth="0.8"
          />
        ) : null)}
      </svg>

      {/* Day labels */}
      <div className="flex justify-between mt-1">
        {dayLabels.map((label, i) => (
          <span key={i} className="text-[9px] text-white/30">{label}</span>
        ))}
      </div>

      {/* Color legend */}
      <div className="flex gap-3 mt-2 text-[9px] text-white/30">
        <span><span style={{ color: '#22c55e' }}>●</span> ≥7 хорошо</span>
        <span><span style={{ color: '#f59e0b' }}>●</span> 4–6 норм</span>
        <span><span style={{ color: '#ef4444' }}>●</span> ≤3 плохо</span>
      </div>
    </div>
  )
}

function StatBadge({ label, value, emoji, suffix = '', prev, invertDelta = false }: {
  label: string; value: number; emoji: string; suffix?: string; prev?: number; invertDelta?: boolean
}) {
  const showDelta = prev !== undefined && prev > 0 && value > 0
  const delta = showDelta ? value - prev : 0
  const isPositive = invertDelta ? delta < 0 : delta > 0
  const isNegative = invertDelta ? delta > 0 : delta < 0

  return (
    <div
      className="rounded-xl p-2 text-center"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="text-lg">{emoji}</div>
      <div className="text-base font-bold text-white">
        {value > 0
          ? (value >= 10000 ? `${(value / 1000).toFixed(0)}k` : value.toFixed(value % 1 === 0 ? 0 : 1))
          : '—'
        }{value > 0 ? suffix : ''}
      </div>
      {showDelta && delta !== 0 ? (
        <div
          className="text-[9px] font-medium"
          style={{ color: isPositive ? '#22c55e' : isNegative ? '#ef4444' : '#ffffff40' }}
        >
          {delta > 0 ? '+' : ''}{delta.toFixed(delta % 1 === 0 ? 0 : 1)}{suffix}
        </div>
      ) : (
        <div className="text-[10px] text-white/40">{label}</div>
      )}
      {showDelta && delta !== 0 && <div className="text-[9px] text-white/30">{label}</div>}
    </div>
  )
}

function DayRow({ day }: { day: DayData }) {
  const hasMood = day.mood !== null || day.eveningRating !== null
  const rating = day.eveningRating ?? day.mood ?? null

  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
      <div className="w-8 text-xs text-white/40 font-medium">{day.dayOfWeek}</div>

      {/* Checkin dots */}
      <div className="flex gap-1">
        <div
          className="w-2 h-2 rounded-full"
          style={{ background: day.morningCheckinDone ? '#6366f1' : 'rgba(255,255,255,0.1)' }}
          title="Утро"
        />
        <div
          className="w-2 h-2 rounded-full"
          style={{ background: day.eveningCheckinDone ? '#f59e0b' : 'rgba(255,255,255,0.1)' }}
          title="Вечер"
        />
      </div>

      {/* Gym */}
      <div className="w-5 text-center text-sm">{day.hadGym ? '💪' : ''}</div>

      {/* Rituals */}
      {day.ritualsTotal > 0 && (
        <div
          className="w-5 text-center text-[10px] font-bold"
          style={{
            color: day.ritualsCompleted / day.ritualsTotal >= 0.8 ? '#22c55e'
              : day.ritualsCompleted / day.ritualsTotal >= 0.5 ? '#f59e0b' : '#ef4444',
          }}
          title={`Ритуалы: ${day.ritualsCompleted}/${day.ritualsTotal}`}
        >
          🔥
        </div>
      )}

      {/* Energy bar */}
      <div className="flex-1">
        {day.morningEnergy !== null ? (
          <div className="flex items-center gap-1">
            <div
              className="h-1.5 rounded-full transition-all"
              style={{
                width: `${(day.morningEnergy / 10) * 100}%`,
                background: day.morningEnergy >= 7
                  ? 'linear-gradient(90deg, #22c55e, #10b981)'
                  : day.morningEnergy >= 5
                  ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                  : 'linear-gradient(90deg, #ef4444, #f97316)',
              }}
            />
            <span className="text-[10px] text-white/30">⚡{day.morningEnergy}</span>
          </div>
        ) : (
          <div className="h-1.5 rounded-full bg-white/5 w-full" />
        )}
      </div>

      {/* Food quality mini-bar */}
      {day.foodCount > 0 && (
        <div
          className="flex h-2 rounded-full overflow-hidden w-12 flex-shrink-0"
          title={`Еда: ${day.foodGood}✅ ${day.foodNeutral}🟡 ${day.foodBad}❌ (${day.totalCalories} ккал)`}
        >
          {day.foodGood > 0 && (
            <div style={{ flex: day.foodGood, background: '#22c55e' }} />
          )}
          {day.foodNeutral > 0 && (
            <div style={{ flex: day.foodNeutral, background: '#f59e0b' }} />
          )}
          {day.foodBad > 0 && (
            <div style={{ flex: day.foodBad, background: '#ef4444' }} />
          )}
        </div>
      )}

      {/* Day rating */}
      <div className="w-8 text-right">
        {rating !== null ? (
          <span
            className="text-sm font-bold"
            style={{
              color: rating >= 7 ? '#22c55e' : rating >= 5 ? '#f59e0b' : '#ef4444',
            }}
          >
            {rating}
          </span>
        ) : (
          <span className="text-white/20 text-xs">—</span>
        )}
      </div>
    </div>
  )
}

function getMonday(weekOffset = 0): Date {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff + weekOffset * 7)
  d.setHours(0, 0, 0, 0)
  return d
}
