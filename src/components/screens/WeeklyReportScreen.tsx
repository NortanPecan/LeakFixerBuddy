'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface DayData {
  date: string
  dayOfWeek: string
  mood: number | null
  energy: number | null
  morningEnergy: number | null
  eveningRating: number | null
  totalCalories: number
  foodCount: number
  hadGym: boolean
  morningCheckinDone: boolean
  eveningCheckinDone: boolean
  ritualsCompleted: number
  ritualsTotal: number
  habitsCompleted: number
  expenses: number
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

export function WeeklyReportScreen() {
  const { user } = useAppStore()
  const [report, setReport] = useState<WeeklyReport | null>(null)
  const [prevSummary, setPrevSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [weekOffset, setWeekOffset] = useState(0) // 0 = this week, -1 = last week

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
                className="flex gap-3 p-3 rounded-xl"
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
                <span className="text-xl flex-shrink-0">{hint.emoji}</span>
                <div>
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
    </div>
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
