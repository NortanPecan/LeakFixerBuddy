'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft,
  Flame,
  Target,
  TrendingUp,
  Calendar,
  Activity,
  Moon,
  Zap,
  Brain
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts'

interface HistoryEntry {
  date: string
  ritualsTotal: number
  ritualsCompleted: number
  ritualsRate: number
  habitsTotal: number
  habitsCompleted: number
  habitsRate: number
  tasksCompleted: number
  mood: number | null
  energy: number | null
  stress: number | null
  sleepHours: number | null
  overallScore: number
}

interface WeeklySummary {
  week: string
  avgScore: number
  avgRituals: number
  avgHabits: number
}

interface StatsData {
  history: HistoryEntry[]
  streaks: {
    current: number
    max: number
  }
  weeklySummary: WeeklySummary[]
  totals: {
    totalRituals: number
    totalHabits: number
    totalTasks: number
    avgMood: number | null
    avgEnergy: number | null
  }
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']

export function StatsScreen() {
  const { user, setScreen } = useAppStore()
  const [data, setData] = useState<StatsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [period, setPeriod] = useState<7 | 14 | 30>(14)

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return
      setIsLoading(true)
      try {
        const response = await fetch(`/api/stats/history?userId=${user.id}&days=${period}`)
        if (!response.ok) throw new Error('Failed to load stats')
        const statsData = await response.json()
        setData(statsData)
      } catch (error) {
        console.error('Failed to load stats:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [user?.id, period])

  // Prepare chart data
  const last14Days = data?.history.slice(-14) || []
  const last7Days = data?.history.slice(-7) || []

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => setScreen('profile')}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Статистика</h1>
      </div>

      {/* Period selector */}
      <div className="flex gap-1">
        {[7, 14, 30].map(days => (
          <Button
            key={days}
            size="sm"
            variant={period === days ? 'default' : 'outline'}
            onClick={() => setPeriod(days as 7 | 14 | 30)}
            className="flex-1"
          >
            {days} дней
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="bg-card/50 backdrop-blur">
              <CardContent className="pt-4">
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data ? (
        <>
          {/* Streak cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 border-orange-500/30">
              <CardContent className="pt-4 text-center">
                <Flame className="w-8 h-8 mx-auto text-orange-400 mb-2" />
                <p className="text-3xl font-bold text-orange-400">{data.streaks.current}</p>
                <p className="text-xs text-muted-foreground">Текущая серия</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-emerald-500/30">
              <CardContent className="pt-4 text-center">
                <Trophy className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
                <p className="text-3xl font-bold text-emerald-400">{data.streaks.max}</p>
                <p className="text-xs text-muted-foreground">Лучшая серия</p>
              </CardContent>
            </Card>
          </div>

          {/* Totals */}
          <Card className="bg-card/50 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-5 h-5" />
                Всего за {period} дней
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">{data.totals.totalRituals}</p>
                  <p className="text-xs text-muted-foreground">Ритуалов</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{data.totals.totalHabits}</p>
                  <p className="text-xs text-muted-foreground">Привычек</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{data.totals.totalTasks}</p>
                  <p className="text-xs text-muted-foreground">Дел</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Overall Score Chart */}
          <Card className="bg-card/50 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Общий прогресс
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={last7Days}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDate}
                      tick={{ fontSize: 10, fill: '#9ca3af' }}
                    />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="overallScore"
                      name="Балл"
                      stroke="#10b981"
                      fillOpacity={1}
                      fill="url(#colorScore)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Rituals & Habits Rate */}
          <Card className="bg-card/50 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Выполнение ритуалов и привычек
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={last7Days}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDate}
                      tick={{ fontSize: 10, fill: '#9ca3af' }}
                    />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="ritualsRate" name="Ритуалы %" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="habitsRate" name="Привычки %" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-purple-500" />
                  <span className="text-xs text-muted-foreground">Ритуалы</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-blue-500" />
                  <span className="text-xs text-muted-foreground">Привычки</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mood & Energy Chart */}
          <Card className="bg-card/50 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Настроение и энергия
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={last14Days.filter(d => d.mood || d.energy)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDate}
                      tick={{ fontSize: 10, fill: '#9ca3af' }}
                    />
                    <YAxis domain={[1, 10]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="mood"
                      name="Настроение"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ fill: '#f59e0b', r: 3 }}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="energy"
                      name="Энергия"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ fill: '#10b981', r: 3 }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-xs text-muted-foreground">Настроение</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-xs text-muted-foreground">Энергия</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tasks per day */}
          <Card className="bg-card/50 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Выполненные дела
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={last7Days}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDate}
                      tick={{ fontSize: 10, fill: '#9ca3af' }}
                    />
                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="tasksCompleted" name="Дела" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Sleep chart if data available */}
          {last14Days.some(d => d.sleepHours) && (
            <Card className="bg-card/50 backdrop-blur">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Moon className="w-5 h-5" />
                  Сон (часы)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={last14Days.filter(d => d.sleepHours)}>
                      <defs>
                        <linearGradient id="colorSleep" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={formatDate}
                        tick={{ fontSize: 10, fill: '#9ca3af' }}
                      />
                      <YAxis domain={[0, 12]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="sleepHours"
                        name="Часы сна"
                        stroke="#6366f1"
                        fillOpacity={1}
                        fill="url(#colorSleep)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Weekly Summary */}
          {data.weeklySummary.length > 1 && (
            <Card className="bg-card/50 backdrop-blur">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  По неделям
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.weeklySummary}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="week" 
                        tick={{ fontSize: 9, fill: '#9ca3af' }}
                      />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="avgScore" name="Общий %" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Не удалось загрузить статистику</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Trophy icon component
function Trophy({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  )
}
