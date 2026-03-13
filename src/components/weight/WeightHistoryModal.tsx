'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { showErrorToast } from '@/lib/network-utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts'
import {
  Scale,
  Target,
  TrendingDown,
  TrendingUp,
  Calendar,
  Minus,
  BarChart3,
  LineChartIcon,
  List,
  Edit
} from 'lucide-react'

interface WeightHistoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenRecords: () => void
  onOpenGoal: () => void
}

interface HistoryPoint {
  date: string
  avg: number
  count: number
  min: number
  max: number
}

interface Stats {
  min: number | null
  max: number | null
  avg: number | null
  count: number
  daysTracked: number
}

interface Progress {
  startWeight: number
  currentWeight: number
  targetWeight: number
  lost: number
  toLose: number
  totalToLose: number
  percent: number
}

interface Forecast {
  ratePerWeek: number
  direction: 'losing' | 'gaining' | 'stable'
  predictedDate: string | null
  daysToGoal: number | null
  deadlineStatus: {
    willMakeIt: boolean
    daysDifference: number
    message: string
  } | null
}

export function WeightHistoryModal({ open, onOpenChange, onOpenRecords, onOpenGoal }: WeightHistoryModalProps) {
  const { user } = useAppStore()
  const [period, setPeriod] = useState<'7' | '30' | '90' | 'all'>('30')
  const [chartType, setChartType] = useState<'area' | 'line'>('area')
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [forecast, setForecast] = useState<Forecast | null>(null)
  const [targetWeight, setTargetWeight] = useState<number | null>(null)
  const [weightStart, setWeightStart] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open && user?.id) {
      loadData()
    }
  }, [open, user?.id, period])

  const loadData = async () => {
    if (!user?.id) return
    setIsLoading(true)
    try {
      const periodParam = period === 'all' ? '365' : period
      const res = await fetch(`/api/weight/history?userId=${user.id}&period=${periodParam}`)
      const data = await res.json()
      
      setHistory(data.history || [])
      setStats(data.stats || null)
      setProgress(data.progress || null)
      setForecast(data.forecast || null)
      setTargetWeight(data.targetWeight || null)
      setWeightStart(data.weightStart || null)
    } catch (error) {
      showErrorToast(error, 'load weight history')
    } finally {
      setIsLoading(false)
    }
  }

  // Format date for chart
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  }

  // Prepare chart data
  const chartData = history.map(h => ({
    date: formatDate(h.date),
    weight: Math.round(h.avg * 10) / 10,
    fullDate: h.date
  }))

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur border border-border rounded-lg p-2 shadow-lg">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-bold">{payload[0].value} кг</p>
        </div>
      )
    }
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5" />
            История веса
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Period selector */}
          <div className="flex gap-1 flex-wrap">
            {(['7', '30', '90', 'all'] as const).map((p) => (
              <Button
                key={p}
                variant={period === p ? 'default' : 'outline'}
                size="sm"
                className={period === p ? 'bg-primary' : ''}
                onClick={() => setPeriod(p)}
              >
                {p === 'all' ? 'Все' : `${p} дн`}
              </Button>
            ))}
          </div>

          {/* Chart type toggle */}
          <div className="flex gap-1">
            <Button
              variant={chartType === 'area' ? 'default' : 'outline'}
              size="sm"
              className={chartType === 'area' ? 'bg-primary' : ''}
              onClick={() => setChartType('area')}
            >
              <BarChart3 className="w-4 h-4 mr-1" />
              Площадь
            </Button>
            <Button
              variant={chartType === 'line' ? 'default' : 'outline'}
              size="sm"
              className={chartType === 'line' ? 'bg-primary' : ''}
              onClick={() => setChartType('line')}
            >
              <LineChartIcon className="w-4 h-4 mr-1" />
              Линия
            </Button>
          </div>

          {/* Chart */}
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : chartData.length > 0 ? (
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'area' ? (
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      domain={['dataMin - 1', 'dataMax + 1']}
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${v}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    {targetWeight && (
                      <ReferenceLine 
                        y={targetWeight} 
                        stroke="hsl(142, 76%, 36%)" 
                        strokeDasharray="5 5"
                        label={{ value: 'Цель', fontSize: 10, fill: 'hsl(142, 76%, 36%)' }}
                      />
                    )}
                    <Area
                      type="monotone"
                      dataKey="weight"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#weightGradient)"
                    />
                  </AreaChart>
                ) : (
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      domain={['dataMin - 1', 'dataMax + 1']}
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    {targetWeight && (
                      <ReferenceLine 
                        y={targetWeight} 
                        stroke="hsl(142, 76%, 36%)" 
                        strokeDasharray="5 5"
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))', r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              <p className="text-sm">Нет данных за выбранный период</p>
            </div>
          )}

          {/* Progress section */}
          {progress && (
            <div className="space-y-3 p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Target className="w-4 h-4" />
                Прогресс
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Старт</p>
                  <p className="font-bold">{progress.startWeight.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Текущий</p>
                  <p className="font-bold text-primary">{progress.currentWeight.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Цель</p>
                  <p className="font-bold text-emerald-400">{progress.targetWeight.toFixed(1)}</p>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Прогресс</span>
                  <span>{Math.round(progress.percent)}%</span>
                </div>
                <Progress value={progress.percent} className="h-2" />
              </div>

              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Потеряно: {progress.lost > 0 ? '-' : '+'}{Math.abs(progress.lost).toFixed(1)} кг</span>
                <span>Осталось: {progress.toLose > 0 ? '-' : '+'}{Math.abs(progress.toLose).toFixed(1)} кг</span>
              </div>
            </div>
          )}

          {/* Forecast section */}
          {forecast && (
            <div className="space-y-2 p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 text-sm font-medium">
                <TrendingDown className="w-4 h-4" />
                Прогноз
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Темп:</span>
                  <span className={forecast.direction === 'losing' ? 'text-emerald-400' : forecast.direction === 'gaining' ? 'text-red-400' : ''}>
                    {forecast.ratePerWeek > 0 ? '-' : '+'}{Math.abs(forecast.ratePerWeek)} кг/неделю
                  </span>
                </div>
                
                {forecast.predictedDate && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Прогноз цели:</span>
                    <span>
                      {new Date(forecast.predictedDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                )}

                {forecast.deadlineStatus && (
                  <p className={`text-xs ${forecast.deadlineStatus.willMakeIt ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {forecast.deadlineStatus.message}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Stats */}
          {stats && stats.min && (
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground">Мин</p>
                <p className="font-bold text-sm">{stats.min.toFixed(1)} кг</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground">Макс</p>
                <p className="font-bold text-sm">{stats.max?.toFixed(1)} кг</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground">Средн</p>
                <p className="font-bold text-sm">{stats.avg?.toFixed(1)} кг</p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onOpenRecords}>
              <List className="w-4 h-4 mr-1" />
              Все записи
            </Button>
            <Button variant="outline" className="flex-1" onClick={onOpenGoal}>
              <Edit className="w-4 h-4 mr-1" />
              Цель
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
