'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface WeekSummary {
  weekNum: number
  label: string
  avgMood: number
  avgEnergy: number
  avgEveningRating: number
  gymDays: number
  checkinDays: number
  ritualsCompletionRate: number
  habitsTotal: number
  totalExpenses: number
  tasksCompleted: number
  dataScore: number
}

interface MonthlySummary {
  avgMood: number
  avgEnergy: number
  avgEveningRating: number
  gymDays: number
  totalCheckins: number
  ritualsCompletionRate: number
  totalHabits: number
  totalExpenses: number
  totalTasks: number
}

interface MonthlyLeak {
  type: string
  severity: 'info' | 'warning' | 'critical'
  message: string
  emoji: string
  recommendation: string
  weeks?: number[]
}

interface Trend {
  metric: string
  direction: 'up' | 'down' | 'stable'
  delta: number
  label: string
  emoji: string
}

interface MonthlyReport {
  monthStart: string
  monthEnd: string
  weeks: WeekSummary[]
  summary: MonthlySummary
  deepLeaks: MonthlyLeak[]
  trends: Trend[]
}

export function MonthlyReportScreen() {
  const { user } = useAppStore()
  const [report, setReport] = useState<MonthlyReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [monthOffset, setMonthOffset] = useState(0) // 0 = this month, -1 = last month

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return
      setLoading(true)
      try {
        const monthStart = getMonthStart(monthOffset)
        const monthStartStr = monthStart.toISOString().split('T')[0]
        const res = await fetch(`/api/monthly-report?userId=${user.id}&monthStart=${monthStartStr}`)
        const data = await res.json()
        if (data.success) setReport(data)
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.id, monthOffset])

  if (loading) {
    return (
      <div className="flex flex-col gap-4 pb-20">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="flex flex-col gap-4 pb-20">
        <p className="text-white/40 text-center mt-10">Нет данных за этот месяц</p>
      </div>
    )
  }

  const monthLabel = monthOffset === 0
    ? 'Текущий месяц'
    : new Date(report.monthStart).toLocaleDateString('ru', { month: 'long', year: 'numeric' })

  const criticalLeaks = report.deepLeaks.filter(l => l.severity === 'critical')
  const warningLeaks = report.deepLeaks.filter(l => l.severity === 'warning')
  const infoLeaks = report.deepLeaks.filter(l => l.severity === 'info')

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Месячный отчёт</h2>
          <p className="text-white/40 text-sm">{monthLabel}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setMonthOffset(m => m - 1)}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-white/60 text-sm"
          >
            ←
          </button>
          {monthOffset < 0 && (
            <button
              onClick={() => setMonthOffset(m => m + 1)}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-white/60 text-sm"
            >
              →
            </button>
          )}
        </div>
      </div>

      {/* Monthly summary stats */}
      <div className="grid grid-cols-4 gap-2">
        <StatBadge label="Настр." value={report.summary.avgMood} emoji="🎭" />
        <StatBadge label="Энергия" value={report.summary.avgEnergy} emoji="⚡" />
        <StatBadge label="Зал" value={report.summary.gymDays} emoji="💪" suffix="д" />
        <StatBadge label="Ритуалы" value={report.summary.ritualsCompletionRate} emoji="🔥" suffix="%" />
      </div>
      <div className="grid grid-cols-4 gap-2">
        <StatBadge label="Чекапы" value={report.summary.totalCheckins} emoji="✓" />
        <StatBadge label="Привычки" value={report.summary.totalHabits} emoji="🔄" />
        <StatBadge label="Дела" value={report.summary.totalTasks} emoji="✅" />
        <StatBadge label="Расходы" value={report.summary.totalExpenses} emoji="💰" suffix="₽" />
      </div>

      {/* Trends */}
      {report.trends.length > 0 && (
        <Card
          style={{
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-white flex items-center gap-2">
              📈 Тренды за месяц
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {report.trends.map(trend => (
                <TrendBadge key={trend.metric} trend={trend} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deep Leaks */}
      {report.deepLeaks.length > 0 && (
        <Card
          style={{
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-white flex items-center gap-2">
              🔍 Глубокие лики
              {criticalLeaks.length > 0 && (
                <Badge className="bg-red-500/20 text-red-400 text-[10px]">
                  {criticalLeaks.length} критических
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[...criticalLeaks, ...warningLeaks, ...infoLeaks].map((leak, i) => (
              <div
                key={i}
                className="p-3 rounded-xl"
                style={{
                  background: leak.severity === 'critical'
                    ? 'rgba(239,68,68,0.1)'
                    : leak.severity === 'warning'
                    ? 'rgba(245,158,11,0.1)'
                    : 'rgba(99,102,241,0.1)',
                  border: `1px solid ${
                    leak.severity === 'critical' ? 'rgba(239,68,68,0.2)'
                    : leak.severity === 'warning' ? 'rgba(245,158,11,0.2)'
                    : 'rgba(99,102,241,0.2)'
                  }`,
                }}
              >
                <div className="flex gap-3">
                  <span className="text-xl flex-shrink-0">{leak.emoji}</span>
                  <div className="flex-1">
                    <p className="text-sm text-white/80">{leak.message}</p>
                    <p className="text-xs text-white/40 mt-1">→ {leak.recommendation}</p>
                    {leak.weeks && leak.weeks.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {leak.weeks.map(w => (
                          <Badge key={w} variant="outline" className="text-[10px] h-4">
                            Нед. {w}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Week-by-week breakdown */}
      <Card
        style={{
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-white">По неделям</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {report.weeks.map(week => (
            <WeekRow key={week.weekNum} week={week} />
          ))}
        </CardContent>
      </Card>

      {/* No data hint */}
      {report.deepLeaks.length === 0 && report.summary.totalCheckins < 5 && (
        <Card
          style={{
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.2)',
          }}
        >
          <CardContent className="pt-4">
            <p className="text-sm text-white/60 text-center">
              📊 Заполняй чекапы каждый день — через месяц появятся глубокие паттерны и рекомендации
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function StatBadge({ label, value, emoji, suffix = '' }: {
  label: string; value: number; emoji: string; suffix?: string
}) {
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
      <div className="text-[10px] text-white/40">{label}</div>
    </div>
  )
}

function TrendBadge({ trend }: { trend: Trend }) {
  const colors = {
    up: '#22c55e',
    down: '#ef4444',
    stable: '#6b7280',
  }
  const color = colors[trend.direction]

  return (
    <div
      className="flex items-center gap-2 p-2 rounded-lg"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <span className="text-base">{trend.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-white/50 truncate">{trend.label}</p>
        <div className="flex items-center gap-1">
          {trend.direction === 'up' ? (
            <TrendingUp className="w-3 h-3" style={{ color }} />
          ) : trend.direction === 'down' ? (
            <TrendingDown className="w-3 h-3" style={{ color }} />
          ) : (
            <Minus className="w-3 h-3" style={{ color }} />
          )}
          <span className="text-xs font-medium" style={{ color }}>
            {trend.direction === 'stable' ? 'Стабильно' : `${trend.delta > 0 ? '+' : ''}${trend.delta}`}
          </span>
        </div>
      </div>
    </div>
  )
}

function WeekRow({ week }: { week: WeekSummary }) {
  return (
    <div
      className="p-3 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-white">{week.label}</span>
        <div className="flex items-center gap-2">
          {week.gymDays > 0 && (
            <span className="text-xs text-white/50">💪{week.gymDays}</span>
          )}
          {week.ritualsCompletionRate > 0 && (
            <span className="text-xs text-white/50">🔥{week.ritualsCompletionRate}%</span>
          )}
          <Badge
            className="text-[10px] h-4"
            style={{
              background: week.dataScore >= 70 ? 'rgba(34,197,94,0.15)' : week.dataScore >= 40 ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.08)',
              color: week.dataScore >= 70 ? '#22c55e' : week.dataScore >= 40 ? '#f59e0b' : '#9ca3af',
              border: 'none',
            }}
          >
            {week.dataScore}% данных
          </Badge>
        </div>
      </div>
      <div className="flex gap-3 text-xs text-white/40">
        {week.avgMood > 0 && <span>🎭 {week.avgMood}</span>}
        {week.avgEnergy > 0 && <span>⚡ {week.avgEnergy}</span>}
        {week.avgEveningRating > 0 && <span>🌙 {week.avgEveningRating}</span>}
        {week.checkinDays > 0 && <span>✓ {week.checkinDays}/7</span>}
      </div>
    </div>
  )
}

function getMonthStart(offset: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - 29 + offset * 30)
  d.setHours(0, 0, 0, 0)
  return d
}
