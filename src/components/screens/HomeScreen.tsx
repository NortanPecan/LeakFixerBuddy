'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Play,
  BookOpen,
  Flame,
  Trophy,
  CalendarDays,
  ChevronRight,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'

interface Lesson {
  id: string
  day: number
  title: string
  description: string | null
}

export function HomeScreen() {
  const { user, globalState, updateGlobalState, updateProgress, isDemoMode } = useAppStore()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [upcomingLessons, setUpcomingLessons] = useState<Lesson[]>([])
  const [lessonCompleted, setLessonCompleted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showMoodDialog, setShowMoodDialog] = useState(false)
  const [moodValue, setMoodValue] = useState(globalState?.mood || 5)
  const [energyValue, setEnergyValue] = useState(globalState?.energy || 5)

  const currentDay = user?.day || 1
  const progress = ((currentDay - 1) / 30) * 100

  // Load lesson
  useEffect(() => {
    const loadLesson = async () => {
      if (!user?.id) return
      setIsLoading(true)
      try {
        const response = await fetch(`/api/lessons?day=${currentDay}`)
        const data = await response.json()
        setLesson(data.lesson)
        setUpcomingLessons(data.upcomingLessons || [])
      } catch (error) {
        console.error('Failed to load lesson:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadLesson()
  }, [user?.id, currentDay])

  const handleCompleteLesson = async () => {
    if (!user?.id) return
    await updateProgress(currentDay + 1, (user.streak || 0) + 1, (user.points || 0) + 10)
    setLessonCompleted(true)
  }

  const handleSaveMood = async () => {
    await updateGlobalState(moodValue, energyValue)
    setShowMoodDialog(false)
  }

  // Get mood color for scale
  const getMoodColor = useCallback((level: number) => {
    const colors = [
      'bg-red-500',     // 1
      'bg-red-400',     // 2
      'bg-orange-500',  // 3
      'bg-orange-400',  // 4
      'bg-yellow-400',  // 5
      'bg-lime-400',    // 6
      'bg-lime-500',    // 7
      'bg-green-400',   // 8
      'bg-green-500',   // 9
      'bg-emerald-400', // 10
    ]
    return colors[level - 1] || 'bg-gray-500'
  }, [])

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Header with streak */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">День {currentDay}</h1>
          <p className="text-muted-foreground text-sm">
            {isLoading ? 'Загрузка...' : lesson?.title || 'Урок не найден'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Flame className="w-4 h-4 text-orange-500" />
            {user?.streak || 0}
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Trophy className="w-4 h-4 text-yellow-500" />
            {user?.points || 0}
          </Badge>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Прогресс курса</span>
          <span className="font-medium text-primary">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Global State Widget (Mood/Energy Scale) */}
      <Card className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 border-white/10 backdrop-blur-xl">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Left: Vertical Scale */}
            <div className="flex flex-col items-center">
              <div className="text-[10px] text-orange-400 font-medium tracking-wide mb-1">
                ПИК 🔥
              </div>
              <div className="relative w-10 h-36 bg-slate-900/60 rounded-xl border border-white/20 p-1 flex flex-col justify-between overflow-hidden">
                {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((level) => (
                  <div
                    key={level}
                    className={`h-2.5 mx-0.5 rounded transition-colors ${
                      globalState && level <= globalState.mood
                        ? getMoodColor(globalState.mood)
                        : 'bg-slate-800'
                    }`}
                  />
                ))}
              </div>
              <div className="text-[10px] text-red-400 font-medium tracking-wide mt-1">
                КРИЗИС 💀
              </div>
            </div>

            {/* Right: Text and controls */}
            <div className="flex-1 flex flex-col justify-between h-36">
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                  Глобальное состояние
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black bg-gradient-to-r from-emerald-300 to-emerald-500 bg-clip-text text-transparent">
                    {globalState?.mood?.toFixed(1) || '—'}
                  </span>
                  <span className="text-sm text-muted-foreground">/ 10</span>
                </div>
                <div className="text-xs font-medium text-emerald-400 mt-1">
                  {globalState?.status || 'Нажмите обновить'}
                </div>
              </div>

              <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                <span>Вчера: {(globalState?.mood || 5) - (globalState?.trend || 0)}</span>
                {globalState?.trend !== undefined && (
                  <span className={`flex items-center gap-0.5 ${
                    globalState.trend > 0 ? 'text-emerald-400' :
                    globalState.trend < 0 ? 'text-red-400' : 'text-muted-foreground'
                  }`}>
                    {globalState.trend > 0 ? <TrendingUp className="w-3 h-3" /> :
                     globalState.trend < 0 ? <TrendingDown className="w-3 h-3" /> :
                     <Minus className="w-3 h-3" />}
                    {globalState.trend > 0 ? '+' : ''}{globalState.trend.toFixed(1)}
                  </span>
                )}
              </div>

              <Button
                size="sm"
                variant="outline"
                className="self-start text-xs bg-sky-500/90 hover:bg-sky-400 border-0 text-white"
                onClick={() => {
                  setMoodValue(globalState?.mood || 5)
                  setEnergyValue(globalState?.energy || 5)
                  setShowMoodDialog(true)
                }}
              >
                ✏️ Обновить настроение
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Дней подряд</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-primary">{user?.streak || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Очки</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-primary">{user?.points || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Current lesson card */}
      <Card className="border-primary/20 bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {lesson?.title || `Урок ${currentDay}`}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                День {currentDay} из 30
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {lesson?.description || 'Описание урока загружается...'}
          </p>
          {lessonCompleted ? (
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700" size="lg" disabled>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Урок завершён!
            </Button>
          ) : (
            <Button
              className="w-full bg-primary hover:bg-primary/90"
              size="lg"
              onClick={handleCompleteLesson}
              disabled={isLoading}
            >
              <Play className="w-4 h-4 mr-2" />
              Завершить урок
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Upcoming lessons */}
      {upcomingLessons.length > 0 && (
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Следующие уроки</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {upcomingLessons.slice(0, 3).map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm font-medium">
                    {l.day}
                  </div>
                  <span className="text-sm">{l.title}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Demo mode notice */}
      {isDemoMode && (
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="pt-4">
            <p className="text-sm text-amber-400">
              🎮 Демо-режим: данные сохраняются локально.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Mood Dialog */}
      <Dialog open={showMoodDialog} onOpenChange={setShowMoodDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Как ты себя чувствуешь?</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Настроение</span>
                <span className="font-bold text-2xl">{moodValue}</span>
              </div>
              <Slider
                value={[moodValue]}
                onValueChange={([v]) => setMoodValue(v)}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>💀 Кризис</span>
                <span>🔥 Пик</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Энергия</span>
                <span className="font-bold text-2xl">{energyValue}</span>
              </div>
              <Slider
                value={[energyValue]}
                onValueChange={([v]) => setEnergyValue(v)}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>🪫 Ноль</span>
                <span>⚡ Полный</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowMoodDialog(false)}
              >
                Отмена
              </Button>
              <Button className="flex-1 bg-primary" onClick={handleSaveMood}>
                Сохранить
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
