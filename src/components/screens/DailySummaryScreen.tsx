'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { DatePicker } from '@/components/DatePicker'
import {
  Droplets,
  Apple,
  CheckCircle2,
  Circle,
  Pill,
  Heart,
  Zap,
  AlertTriangle,
  Calendar,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react'

interface DailySummaryData {
  date: string
  water: {
    current: number
    target: number
    percentage: number
  }
  food: {
    calories: number
    protein: number
    fat: number
    carbs: number
    qualityBreakdown: {
      good: number
      neutral: number
      bad: number
    }
    entriesCount: number
  }
  rituals: {
    completed: number
    total: number
    percentage: number
  }
  state: {
    mood: number | null
    energy: number | null
  }
  supplements: {
    checked: number
    total: number
    percentage: number
  }
  flags: {
    isOvereating: boolean
    isLowEnergy: boolean
    isBadMood: boolean
    isRitualsFailed: boolean
    isDehydrated: boolean
    hasNoData: boolean
  }
}

export function DailySummaryScreen() {
  const { user, selectedDate, setScreen } = useAppStore()
  const [summary, setSummary] = useState<DailySummaryData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadSummary = async () => {
      if (!user?.id) return
      
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch(
          `/api/daily-summary?userId=${user.id}&date=${selectedDate}`
        )
        if (!response.ok) throw new Error('Failed to load summary')
        const data = await response.json()
        if (data.success) {
          setSummary(data.summary)
        }
      } catch (err) {
        console.error('Failed to load daily summary:', err)
        setError('Не удалось загрузить сводку')
      } finally {
        setIsLoading(false)
      }
    }
    
    loadSummary()
  }, [user?.id, selectedDate])

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 pb-20">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setScreen('home')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-bold">Дневная сводка</h1>
        </div>
        <DatePicker />
        {/* Loading skeleton */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-card/50 backdrop-blur animate-pulse">
              <CardContent className="pt-4">
                <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                <div className="h-6 bg-muted rounded w-2/3" />
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur animate-pulse">
              <CardContent className="pt-4">
                <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                <div className="h-6 bg-muted rounded w-2/3" />
              </CardContent>
            </Card>
          </div>
          {[1, 2, 3].map(i => (
            <Card key={i} className="bg-card/50 backdrop-blur animate-pulse">
              <CardContent className="pt-4">
                <div className="h-4 bg-muted rounded w-1/3 mb-3" />
                <div className="h-8 bg-muted rounded w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!summary || error) {
    return (
      <div className="flex flex-col gap-4 pb-20">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setScreen('home')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-bold">Дневная сводка</h1>
        </div>
        <DatePicker />
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-6 text-center">
            {error ? (
              <>
                <p className="text-red-400 mb-4">{error}</p>
                <Button onClick={() => window.location.reload()}>
                  Повторить
                </Button>
              </>
            ) : (
              <>
                <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">Нет данных за этот день</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  const hasFlags = Object.entries(summary.flags).some(
    ([key, value]) => key !== 'hasNoData' && value
  )

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Header with back button */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setScreen('home')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-xl font-bold">Дневная сводка</h1>
      </div>

      {/* Date Picker */}
      <DatePicker />

      {/* Warning flags */}
      {hasFlags && (
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium text-amber-400">Обрати внимание</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {summary.flags.isOvereating && (
                <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">
                  🍔 Переедание
                </Badge>
              )}
              {summary.flags.isLowEnergy && (
                <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/30">
                  🪫 Низкая энергия
                </Badge>
              )}
              {summary.flags.isBadMood && (
                <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30">
                  😔 Плохое настроение
                </Badge>
              )}
              {summary.flags.isRitualsFailed && (
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
                  ⚠️ Ритуалы не выполнены
                </Badge>
              )}
              {summary.flags.isDehydrated && (
                <Badge variant="outline" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
                  💧 Обезвоживание
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {summary.flags.hasNoData && (
        <Card className="bg-card/50 backdrop-blur border-dashed">
          <CardContent className="pt-6 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">Нет данных за этот день</p>
            <p className="text-xs text-muted-foreground mt-1">
              Начни записывать еду, воду и ритуалы
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Mood/Energy */}
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-4 h-4 text-pink-400" />
              <span className="text-xs text-muted-foreground">Настроение</span>
            </div>
            {summary.state.mood !== null ? (
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">{summary.state.mood}</span>
                <span className="text-xs text-muted-foreground">/10</span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-muted-foreground">Энергия</span>
            </div>
            {summary.state.energy !== null ? (
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">{summary.state.energy}</span>
                <span className="text-xs text-muted-foreground">/10</span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Water */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Droplets className="w-5 h-5 text-cyan-400" />
            Вода
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl font-bold">{summary.water.current}</span>
            <span className="text-sm text-muted-foreground">/ {summary.water.target} мл</span>
          </div>
          <Progress value={Math.min(summary.water.percentage, 100)} className="h-2 mb-1" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{summary.water.percentage}%</span>
            {summary.water.percentage >= 100 && (
              <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px]">Цель!</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Food */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Apple className="w-5 h-5 text-green-400" />
              Еда
            </CardTitle>
            {summary.food.entriesCount > 0 && (
              <Badge variant="outline" className="text-xs">
                {summary.food.entriesCount} записей
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {summary.food.entriesCount > 0 ? (
            <>
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-2xl font-bold">{summary.food.calories}</span>
                <span className="text-sm text-muted-foreground">ккал</span>
              </div>
              
              {/* Macros */}
              <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                <div className="text-center p-2 rounded-lg bg-muted/30">
                  <div className="text-muted-foreground">Белки</div>
                  <div className="font-medium">{summary.food.protein.toFixed(0)}г</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/30">
                  <div className="text-muted-foreground">Жиры</div>
                  <div className="font-medium">{summary.food.fat.toFixed(0)}г</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/30">
                  <div className="text-muted-foreground">Углеводы</div>
                  <div className="font-medium">{summary.food.carbs.toFixed(0)}г</div>
                </div>
              </div>

              {/* Quality breakdown */}
              {(summary.food.qualityBreakdown.good > 0 || 
                summary.food.qualityBreakdown.neutral > 0 || 
                summary.food.qualityBreakdown.bad > 0) && (
                <div className="flex gap-2 text-xs">
                  {summary.food.qualityBreakdown.good > 0 && (
                    <Badge className="bg-emerald-500/20 text-emerald-400">
                      ✓ {summary.food.qualityBreakdown.good} полезно
                    </Badge>
                  )}
                  {summary.food.qualityBreakdown.neutral > 0 && (
                    <Badge className="bg-yellow-500/20 text-yellow-400">
                      ~ {summary.food.qualityBreakdown.neutral} норм
                    </Badge>
                  )}
                  {summary.food.qualityBreakdown.bad > 0 && (
                    <Badge className="bg-red-500/20 text-red-400">
                      ✗ {summary.food.qualityBreakdown.bad} вредно
                    </Badge>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-2">
              <p className="text-sm text-muted-foreground">Нет записей о еде</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rituals */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-purple-400" />
            Ритуалы
          </CardTitle>
        </CardHeader>
        <CardContent>
          {summary.rituals.total > 0 ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-bold">
                  {summary.rituals.completed} / {summary.rituals.total}
                </span>
                <span className="text-sm text-muted-foreground">{summary.rituals.percentage}%</span>
              </div>
              <Progress value={summary.rituals.percentage} className="h-2" />
              {summary.rituals.percentage === 100 && (
                <div className="mt-2 text-center">
                  <Badge className="bg-emerald-500/20 text-emerald-400">
                    Все ритуалы выполнены! 🎉
                  </Badge>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-2">
              <p className="text-sm text-muted-foreground">Нет активных ритуалов на этот день</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Supplements */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Pill className="w-5 h-5 text-blue-400" />
            БАДы
          </CardTitle>
        </CardHeader>
        <CardContent>
          {summary.supplements.total > 0 ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-bold">
                  {summary.supplements.checked} / {summary.supplements.total}
                </span>
                <span className="text-sm text-muted-foreground">{summary.supplements.percentage}%</span>
              </div>
              <Progress value={summary.supplements.percentage} className="h-2" />
            </>
          ) : (
            <div className="text-center py-2">
              <p className="text-sm text-muted-foreground">Нет активных БАДов на этот день</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setScreen('health')}
        >
          <Apple className="w-4 h-4 mr-2" />
          Здоровье
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setScreen('rituals')}
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Ритуалы
        </Button>
      </div>
    </div>
  )
}
