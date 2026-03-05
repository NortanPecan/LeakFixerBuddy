'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dumbbell,
  Flame,
  Droplets,
  Apple,
  Scale,
  Pill,
  Plus,
  ChevronRight,
  Target,
  Zap,
  Minus
} from 'lucide-react'
import {
  getCaloriesSummary,
  getWaterProgress,
  getHydrationStatus,
  type FoodEntry,
  type ActivityEntry,
  type FitnessDayData,
} from '@/lib/fitness'
import { formatDateKey } from '@/lib/fitness'

interface FitnessState {
  activities: ActivityEntry[]
  foods: FoodEntry[]
  water: { currentMl: number; targetMl: number }
  supplements: { id: string; time: string; dose: number; checked: boolean }[]
  mood?: number
  energy?: number
}

// Quick action buttons for fitness
const QUICK_ACTIONS = [
  { icon: Dumbbell, label: 'Тренировка', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
  { icon: Apple, label: 'Питание', color: 'text-green-400', bgColor: 'bg-green-500/10' },
  { icon: Droplets, label: 'Вода', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10' },
  { icon: Pill, label: 'Добавки', color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  { icon: Scale, label: 'Вес', color: 'text-orange-400', bgColor: 'bg-orange-500/10' },
]

export function FitnessScreen() {
  const { user, profile } = useAppStore()
  const [fitnessData, setFitnessData] = useState<FitnessState>({
    activities: [],
    foods: [],
    water: { currentMl: 0, targetMl: profile?.waterBaseline || 2000 },
    supplements: []
  })
  const [isLoading, setIsLoading] = useState(true)

  // Load fitness data for today
  useEffect(() => {
    const loadFitnessData = async () => {
      if (!user?.id) return

      setIsLoading(true)
      try {
        const today = formatDateKey(new Date())
        const response = await fetch(`/api/fitness?userId=${user.id}&date=${today}`)
        const data = await response.json()

        if (data.data) {
          setFitnessData({
            activities: data.data.activities || [],
            foods: data.data.foods || [],
            water: data.data.water || { currentMl: 0, targetMl: profile?.waterBaseline || 2000 },
            supplements: data.data.supplements || [],
            mood: data.data.mood,
            energy: data.data.energy
          })
        }
      } catch (error) {
        console.error('Failed to load fitness data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadFitnessData()
  }, [user?.id, profile?.waterBaseline])

  // Calculate real metrics
  const calories = getCaloriesSummary(fitnessData.foods, fitnessData.activities, profile?.weight || 75)
  const waterProgress = getWaterProgress(fitnessData.water)
  const hydration = getHydrationStatus(fitnessData.water.currentMl, fitnessData.water.targetMl)

  // Handle water add
  const handleWaterAdd = async (ml: number) => {
    if (!user?.id) return

    const newWater = {
      currentMl: fitnessData.water.currentMl + ml,
      targetMl: fitnessData.water.targetMl
    }

    setFitnessData(prev => ({ ...prev, water: newWater }))

    try {
      const today = formatDateKey(new Date())
      await fetch('/api/fitness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          date: today,
          data: { water: newWater }
        })
      })
    } catch (error) {
      console.error('Failed to save water:', error)
    }
  }

  // Handle water remove
  const handleWaterRemove = async (ml: number) => {
    if (!user?.id) return

    const newWater = {
      currentMl: Math.max(0, fitnessData.water.currentMl - ml),
      targetMl: fitnessData.water.targetMl
    }

    setFitnessData(prev => ({ ...prev, water: newWater }))

    try {
      const today = formatDateKey(new Date())
      await fetch('/api/fitness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          date: today,
          data: { water: newWater }
        })
      })
    } catch (error) {
      console.error('Failed to save water:', error)
    }
  }

  // Calculate steps from activities
  const stepsEntry = fitnessData.activities.find(a => a.kind === 'steps')
  const stepsData = {
    current: (stepsEntry as { steps: number })?.steps || 0,
    target: 10000
  }
  const stepsProgress = (stepsData.current / stepsData.target) * 100

  // Calculate calories burned from activities
  const totalBurned = fitnessData.activities.reduce((sum, activity) => {
    if ('calories' in activity && activity.calories) return sum + activity.calories
    return sum
  }, 0)

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Фитнес</h1>
          <p className="text-muted-foreground text-sm">
            Сегодня, {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'short' })}
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Target className="w-4 h-4" />
          День {user?.day || 1}
        </Badge>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-5 gap-2">
        {QUICK_ACTIONS.map((action) => (
          <Button
            key={action.label}
            variant="ghost"
            className="flex flex-col items-center gap-1 h-auto py-3 px-1 hover:bg-muted/50"
          >
            <div className={`w-10 h-10 rounded-xl ${action.bgColor} flex items-center justify-center`}>
              <action.icon className={`w-5 h-5 ${action.color}`} />
            </div>
            <span className="text-xs text-muted-foreground">{action.label}</span>
          </Button>
        ))}
      </div>

      {/* Calories card */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-400" />
              Калории
            </CardTitle>
            <Badge
              variant="outline"
              className={calories.balanceColor === 'green'
                ? 'border-emerald-500 text-emerald-400'
                : calories.balanceColor === 'red'
                  ? 'border-red-500 text-red-400'
                  : 'border-yellow-500 text-yellow-400'
              }
            >
              {calories.balance} ккал
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-green-400">
                {calories.eaten}
              </p>
              <p className="text-xs text-muted-foreground">Съедено</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-400">
                {calories.burned}
              </p>
              <p className="text-xs text-muted-foreground">Сожжено</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-muted-foreground">
                {profile?.workProfile === 'sedentary' ? 2000 :
                 profile?.workProfile === 'moderate' ? 2200 :
                 profile?.workProfile === 'active' ? 2500 : 2800}
              </p>
              <p className="text-xs text-muted-foreground">Норма</p>
            </div>
          </div>
          <Progress value={(calories.eaten / 2200) * 100} className="h-2" />
        </CardContent>
      </Card>

      {/* Water & Steps row */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Droplets className="w-5 h-5 text-cyan-400" />
              <span className="font-medium">Вода</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{fitnessData.water.currentMl}</span>
              <span className="text-sm text-muted-foreground">/ {fitnessData.water.targetMl} мл</span>
            </div>
            <Progress value={waterProgress} className="h-2 mt-2" />
            <p className="text-xs mt-2" style={{ color: hydration.color }}>
              {hydration.status === 'excellent' ? '💯 Отлично!' :
               hydration.status === 'good' ? '👍 Хорошо' :
               hydration.status === 'normal' ? '→ Норма' :
               hydration.status === 'low' ? '⚠️ Маловато' : '🚨 Пей воду!'}
            </p>
            {/* Quick water buttons */}
            <div className="flex gap-1 mt-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-7 text-xs"
                onClick={() => handleWaterAdd(250)}
              >
                +250
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-7 text-xs"
                onClick={() => handleWaterAdd(500)}
              >
                +500
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => handleWaterRemove(250)}
              >
                <Minus className="w-3 h-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span className="font-medium">Шаги</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{stepsData.current.toLocaleString()}</span>
              <span className="text-sm text-muted-foreground">/ {stepsData.target.toLocaleString()}</span>
            </div>
            <Progress value={stepsProgress} className="h-2 mt-2" />
            <p className="text-xs mt-2 text-muted-foreground">
              {stepsData.current > 0 ? `${Math.round(stepsProgress)}% от цели` : 'Нет данных'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Today's activities */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Сегодня</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs text-primary">
              <Plus className="w-4 h-4 mr-1" />
              Добавить
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {fitnessData.activities.length > 0 || fitnessData.foods.length > 0 ? (
            <>
              {/* Activities */}
              {fitnessData.activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <Dumbbell className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {activity.kind === 'gym' ? 'Тренировка' :
                         activity.kind === 'cardio' ? 'Кардио' :
                         activity.kind === 'steps' ? 'Шаги' :
                         activity.kind === 'home' ? 'Домашние упражнения' : 'Активность'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {'durationMinutes' in activity ? `${activity.durationMinutes} мин` : ''}
                        {'steps' in activity ? `${activity.steps} шагов` : ''}
                        {'calories' in activity && activity.calories ? ` • ~${activity.calories} ккал` : ''}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              ))}

              {/* Foods */}
              {fitnessData.foods.map((food) => (
                <div
                  key={food.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                      <Apple className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium">{food.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {food.calories || 0} ккал
                        {food.protein ? ` • Б: ${food.protein}` : ''}
                        {food.fat ? ` Ж: ${food.fat}` : ''}
                        {food.carbs ? ` У: ${food.carbs}` : ''}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              ))}
            </>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Apple className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Нет данных за сегодня</p>
              <p className="text-xs mt-1">Добавьте питание или тренировку</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gym progress */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Тренировочный цикл</CardTitle>
            <Badge variant="outline" className="text-primary border-primary/30">Неделя 1 из 8</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Прогресс цикла</span>
            <span className="text-sm font-medium text-primary">12%</span>
          </div>
          <Progress value={12} className="h-2" />
          <div className="flex gap-2 mt-3">
            <Button variant="outline" size="sm" className="flex-1">
              История
            </Button>
            <Button size="sm" className="flex-1 bg-primary hover:bg-primary/90">
              Начать тренировку
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
