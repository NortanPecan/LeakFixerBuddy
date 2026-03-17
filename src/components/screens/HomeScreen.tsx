'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore, Screen } from '@/lib/store'
import { showErrorToast, showSuccessToast } from '@/lib/network-utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
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
  Minus,
  Droplets,
  Apple,
  Pill,
  Heart,
  Zap,
  ChevronLeft,
  Scale,
  Target,
  BarChart3,
  List,
  ShieldCheck,
  ShieldOff
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import { DatePicker, DateBadge } from '@/components/DatePicker'
import { WellbeingWidget } from '@/components/wellbeing'
import { WeightHistoryModal } from '@/components/weight/WeightHistoryModal'
import { WeightRecordsModal } from '@/components/weight/WeightRecordsModal'
import { WeightGoalModal } from '@/components/weight/WeightGoalModal'

interface Lesson {
  id: string
  day: number
  title: string
  description: string | null
}

interface DailySummary {
  water: { current: number; target: number; percentage: number }
  food: { calories: number; entriesCount: number; qualityBreakdown: { good: number; neutral: number; bad: number }; firstMeal: string | null; lastMeal: string | null; eatingWindowHours: number | null }
  rituals: { completed: number; total: number; percentage: number }
  state: { mood: number | null; energy: number | null }
  supplements: { checked: number; total: number; percentage: number }
  flags: {
    isOvereating: boolean
    isLowEnergy: boolean
    isBadMood: boolean
    isRitualsFailed: boolean
    isDehydrated: boolean
    hasNoData: boolean
  }
}

export function HomeScreen() {
  const { user, globalState, updateGlobalState, updateProgress, isDemoMode, selectedDate, setScreen } = useAppStore()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [upcomingLessons, setUpcomingLessons] = useState<Lesson[]>([])
  const [lessonCompleted, setLessonCompleted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showMoodDialog, setShowMoodDialog] = useState(false)
  const [moodValue, setMoodValue] = useState(globalState?.mood || 5)
  const [energyValue, setEnergyValue] = useState(globalState?.energy || 5)
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)

  // Check-in status for today
  const [checkinStatus, setCheckinStatus] = useState<{
    morningDone: boolean
    eveningDone: boolean
    morningEnergy?: number
    morningFocus?: string
    eveningRating?: number
    eveningWin?: string
  }>({ morningDone: false, eveningDone: false })

  // Weight tracking state
  const [weightValue, setWeightValue] = useState('')
  const [weightLoading, setWeightLoading] = useState(false)
  const [weightSaving, setWeightSaving] = useState(false)
  const [weightData, setWeightData] = useState<{
    todayAvg: number | null
    changeWeek: number | null
    currentWeight: number | null
    targetWeight: number | null
    toGoal: number | null
  } | null>(null)
  const [showWeightHistory, setShowWeightHistory] = useState(false)
  const [showWeightRecords, setShowWeightRecords] = useState(false)
  const [showWeightGoal, setShowWeightGoal] = useState(false)
  const [weeklyLeaksCount, setWeeklyLeaksCount] = useState<number | null>(null)
  const [topWeeklyLeak, setTopWeeklyLeak] = useState<{ message: string; emoji: string; severity: string } | null>(null)

  const currentDay = user?.day || 1
  const progress = ((currentDay - 1) / 30) * 100

  // Days with app (since account creation — approximated by streak + day)
  const daysWithApp = user?.day || 1

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

  // Load today's check-in status
  useEffect(() => {
    const loadCheckin = async () => {
      if (!user?.id) return
      try {
        const today = selectedDate
        const res = await fetch(`/api/checkin?userId=${user.id}&date=${today}`)
        const data = await res.json()
        if (data.success) {
          setCheckinStatus({
            morningDone: !!data.morning,
            eveningDone: !!data.evening,
            morningEnergy: data.morning?.energy,
            morningFocus: data.morning?.focusWord,
            eveningRating: data.evening?.dayRating,
            eveningWin: data.evening?.win,
          })
        }
      } catch {
        // Silent fail
      }
    }
    loadCheckin()
  }, [user?.id, selectedDate])

  // Load daily summary
  useEffect(() => {
    const loadSummary = async () => {
      if (!user?.id) return
      setSummaryLoading(true)
      try {
        const response = await fetch(`/api/daily-summary?userId=${user.id}&date=${selectedDate}`)
        const data = await response.json()
        if (data.success) {
          setDailySummary(data.summary)
        }
      } catch (error) {
        console.error('Failed to load daily summary:', error)
      } finally {
        setSummaryLoading(false)
      }
    }
    loadSummary()
  }, [user?.id, selectedDate])

  // Load weekly leaks count (background fetch)
  useEffect(() => {
    const loadLeaksCount = async () => {
      if (!user?.id) return
      try {
        // Get Monday of current week
        const d = new Date()
        const day = d.getDay()
        const diff = day === 0 ? -6 : 1 - day
        d.setDate(d.getDate() + diff)
        d.setHours(0, 0, 0, 0)
        const weekStart = d.toISOString().split('T')[0]
        const res = await fetch(`/api/weekly-report?userId=${user.id}&weekStart=${weekStart}`)
        const data = await res.json()
        if (data.success && data.leakHints) {
          setWeeklyLeaksCount(data.leakHints.length)
          // Store top leak for focus widget (critical first, then warning)
          const sorted = [...data.leakHints].sort((a: { severity: string }, b: { severity: string }) => {
            const order: Record<string, number> = { critical: 0, warning: 1, info: 2 }
            return (order[a.severity] ?? 3) - (order[b.severity] ?? 3)
          })
          if (sorted.length > 0) setTopWeeklyLeak(sorted[0])
        }
      } catch {
        // silent — not critical
      }
    }
    loadLeaksCount()
  }, [user?.id])

  // Load weight data
  useEffect(() => {
    const loadWeight = async () => {
      if (!user?.id) return
      setWeightLoading(true)
      try {
        const response = await fetch(`/api/weight?userId=${user.id}`)
        const data = await response.json()
        setWeightData({
          todayAvg: data.todayAvg,
          changeWeek: data.changeWeek,
          currentWeight: data.currentWeight,
          targetWeight: data.targetWeight,
          toGoal: data.toGoal
        })
        if (data.todayAvg) {
          setWeightValue(data.todayAvg.toFixed(1))
        }
      } catch (error) {
        console.error('Failed to load weight:', error)
      } finally {
        setWeightLoading(false)
      }
    }
    loadWeight()
  }, [user?.id])

  // Save weight
  const handleSaveWeight = async () => {
    if (!user?.id || !weightValue) return
    setWeightSaving(true)
    try {
      await fetch('/api/weight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          value: parseFloat(weightValue)
        })
      })
      showSuccessToast('Вес записан')
      // Reload weight data
      const response = await fetch(`/api/weight?userId=${user.id}`)
      const data = await response.json()
      setWeightData({
        todayAvg: data.todayAvg,
        changeWeek: data.changeWeek,
        currentWeight: data.currentWeight,
        targetWeight: data.targetWeight,
        toGoal: data.toGoal
      })
    } catch (error) {
      showErrorToast(error, 'save weight')
    } finally {
      setWeightSaving(false)
    }
  }

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

  const hour = new Date().getHours()
  const isMorningTime = hour >= 5 && hour < 13
  const isEveningTime = hour >= 18

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Header with streak */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isMorningTime ? 'Доброе утро 🌅' : isEveningTime ? 'Добрый вечер 🌙' : 'Привет 👋'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {user?.firstName || 'Друг'} · {daysWithApp} {pluralDays(daysWithApp)} с приложением
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Flame className="w-4 h-4 text-orange-500" />
            {user?.streak || 0}
          </Badge>
          {(() => {
            const usedAt = user?.streakShieldUsedAt ? new Date(user.streakShieldUsedAt) : null
            const shieldReady = !usedAt || Date.now() - usedAt.getTime() > 7 * 86400000
            return (user?.streak ?? 0) > 0 ? (
              <Badge
                variant="outline"
                className={`flex items-center gap-1 text-xs ${shieldReady ? 'border-emerald-500/40 text-emerald-400' : 'border-white/10 text-muted-foreground'}`}
                title={shieldReady ? 'Щит готов — защитит стрик при пропуске дня' : `Щит перезаряжается до ${new Date((usedAt!.getTime() + 7 * 86400000)).toLocaleDateString('ru')}`}
              >
                {shieldReady
                  ? <ShieldCheck className="w-3.5 h-3.5" />
                  : <ShieldOff className="w-3.5 h-3.5" />
                }
              </Badge>
            ) : null
          })()}
          <Badge variant="secondary" className="flex items-center gap-1">
            <Trophy className="w-4 h-4 text-yellow-500" />
            {user?.points || 0}
          </Badge>
        </div>
      </div>

      {/* Morning / Evening Check-in block */}
      <CheckinStatusBlock
        morningDone={checkinStatus.morningDone}
        eveningDone={checkinStatus.eveningDone}
        morningEnergy={checkinStatus.morningEnergy}
        morningFocus={checkinStatus.morningFocus}
        eveningRating={checkinStatus.eveningRating}
        eveningWin={checkinStatus.eveningWin}
        isMorningTime={isMorningTime}
        isEveningTime={isEveningTime}
        onOpenDailySummary={() => setScreen('daily-summary')}
      />

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Прогресс курса</span>
          <div className="flex items-center gap-2">
            <span className="font-medium text-primary">{Math.round(progress)}%</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs bg-primary/10 hover:bg-primary/20"
              onClick={() => setScreen('journey')}
            >
              🗺️ Journey
            </Button>
          </div>
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

      {/* Wellbeing Widget */}
      <WellbeingWidget 
        mood={globalState?.mood}
        energy={globalState?.energy}
      />

      {/* Weight Tracking Card */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Scale className="w-5 h-5" />
              Вес сегодня
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {weightLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-4 w-24" />
            </div>
          ) : (
            <div className="space-y-3">
              {/* Input */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="72.5"
                    value={weightValue}
                    onChange={(e) => setWeightValue(e.target.value)}
                    className="text-center text-2xl font-bold h-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    кг
                  </span>
                </div>
                <Button
                  className="h-12 px-4 bg-primary"
                  onClick={handleSaveWeight}
                  disabled={!weightValue || weightSaving}
                >
                  {weightSaving ? '...' : 'Записать'}
                </Button>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  {weightData?.changeWeek !== null && weightData?.changeWeek !== undefined ? (
                    <>
                      {weightData.changeWeek < 0 ? (
                        <TrendingDown className="w-3 h-3 text-emerald-400" />
                      ) : weightData.changeWeek > 0 ? (
                        <TrendingUp className="w-3 h-3 text-red-400" />
                      ) : (
                        <Minus className="w-3 h-3" />
                      )}
                      <span className={weightData.changeWeek < 0 ? 'text-emerald-400' : weightData.changeWeek > 0 ? 'text-red-400' : ''}>
                        За неделю: {weightData.changeWeek > 0 ? '+' : ''}{weightData.changeWeek.toFixed(1)} кг
                      </span>
                    </>
                  ) : (
                    <span>За неделю: —</span>
                  )}
                </div>

                {weightData?.targetWeight && weightData?.toGoal !== null && (
                  <div className="flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    <span>
                      До цели ({weightData.targetWeight.toFixed(0)} кг): {weightData.toGoal > 0 ? '-' : '+'}{Math.abs(weightData.toGoal).toFixed(1)} кг
                    </span>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => setShowWeightHistory(true)}
                >
                  <BarChart3 className="w-3 h-3 mr-1" />
                  График
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => setShowWeightRecords(true)}
                >
                  <List className="w-3 h-3 mr-1" />
                  История
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Summary Block */}
      {!summaryLoading && dailySummary && !dailySummary.flags.hasNoData && (
        <Card className="bg-card/50 backdrop-blur cursor-pointer hover:bg-card/70 transition-colors" onClick={() => setScreen('daily-summary')}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Сводка за день</CardTitle>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2">
              {/* Water */}
              <div className="text-center p-2 rounded-lg bg-muted/30">
                <Droplets className="w-4 h-4 mx-auto mb-1 text-cyan-400" />
                <div className="text-xs text-muted-foreground">Вода</div>
                <div className="text-sm font-bold">{dailySummary.water.percentage}%</div>
              </div>
              
              {/* Food */}
              <div className="text-center p-2 rounded-lg bg-muted/30">
                <Apple className="w-4 h-4 mx-auto mb-1 text-green-400" />
                <div className="text-xs text-muted-foreground">Еда</div>
                <div className="text-sm font-bold">{dailySummary.food.calories}</div>
                {dailySummary.food.eatingWindowHours !== null && (
                  <div className="text-[9px] text-muted-foreground/70 mt-0.5">
                    ⏱ {dailySummary.food.eatingWindowHours}ч
                  </div>
                )}
              </div>
              
              {/* Rituals */}
              <div className="text-center p-2 rounded-lg bg-muted/30">
                <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-purple-400" />
                <div className="text-xs text-muted-foreground">Ритуалы</div>
                <div className="text-sm font-bold">{dailySummary.rituals.completed}/{dailySummary.rituals.total}</div>
              </div>
              
              {/* Supplements */}
              <div className="text-center p-2 rounded-lg bg-muted/30">
                <Pill className="w-4 h-4 mx-auto mb-1 text-blue-400" />
                <div className="text-xs text-muted-foreground">БАДы</div>
                <div className="text-sm font-bold">{dailySummary.supplements.checked}/{dailySummary.supplements.total}</div>
              </div>
            </div>

            {/* Warning flags */}
            {(dailySummary.flags.isOvereating || dailySummary.flags.isLowEnergy || dailySummary.flags.isBadMood || dailySummary.flags.isRitualsFailed || dailySummary.flags.isDehydrated) && (
              <div className="mt-3 flex flex-wrap gap-1">
                {dailySummary.flags.isDehydrated && (
                  <Badge variant="outline" className="text-[10px] bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
                    💧 Обезвоживание
                  </Badge>
                )}
                {dailySummary.flags.isOvereating && (
                  <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-400 border-red-500/30">
                    🍔 Переедание
                  </Badge>
                )}
                {dailySummary.flags.isLowEnergy && (
                  <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-400 border-orange-500/30">
                    🪫 Низкая энергия
                  </Badge>
                )}
                {dailySummary.flags.isRitualsFailed && (
                  <Badge variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
                    ⚠️ Ритуалы
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Today's Focus — top weekly leak as actionable hint */}
      {topWeeklyLeak && (
        <Card
          className="cursor-pointer"
          style={{
            background: topWeeklyLeak.severity === 'critical'
              ? 'rgba(239,68,68,0.08)'
              : topWeeklyLeak.severity === 'warning'
              ? 'rgba(245,158,11,0.08)'
              : 'rgba(99,102,241,0.08)',
            border: `1px solid ${
              topWeeklyLeak.severity === 'critical' ? 'rgba(239,68,68,0.2)'
              : topWeeklyLeak.severity === 'warning' ? 'rgba(245,158,11,0.2)'
              : 'rgba(99,102,241,0.2)'
            }`,
          }}
          onClick={() => setScreen('weekly-report' as Screen)}
        >
          <CardContent className="pt-3 pb-3">
            <div className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0">{topWeeklyLeak.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider font-medium mb-0.5"
                  style={{ color: topWeeklyLeak.severity === 'critical' ? '#ef4444' : topWeeklyLeak.severity === 'warning' ? '#f59e0b' : '#818cf8' }}
                >
                  Фокус недели
                </div>
                <p className="text-sm text-white/80 leading-snug">{topWeeklyLeak.message}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-white/30 flex-shrink-0 mt-1" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly report shortcut */}
      <Card
        className="bg-card/50 backdrop-blur cursor-pointer hover:bg-card/70 transition-colors"
        onClick={() => setScreen('weekly-report' as Screen)}
      >
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔍</span>
              <div>
                <div className="text-sm font-medium text-white flex items-center gap-2">
                  Лики недели
                  {weeklyLeaksCount !== null && weeklyLeaksCount > 0 && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{
                        background: weeklyLeaksCount >= 3 ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                        color: weeklyLeaksCount >= 3 ? '#ef4444' : '#f59e0b',
                      }}
                    >
                      {weeklyLeaksCount}
                    </span>
                  )}
                </div>
                <div className="text-xs text-white/40">Паттерны и корреляции</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      {/* Monthly report shortcut */}
      <Card
        className="bg-card/50 backdrop-blur cursor-pointer hover:bg-card/70 transition-colors"
        onClick={() => setScreen('monthly-report')}
      >
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">📈</span>
              <div>
                <div className="text-sm font-medium text-white">Месячный анализ</div>
                <div className="text-xs text-white/40">Тренды, глубокие лики, советы</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
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

      {/* Weight History Modal */}
      <WeightHistoryModal
        open={showWeightHistory}
        onOpenChange={setShowWeightHistory}
        onOpenRecords={() => {
          setShowWeightHistory(false)
          setShowWeightRecords(true)
        }}
        onOpenGoal={() => {
          setShowWeightHistory(false)
          setShowWeightGoal(true)
        }}
      />

      {/* Weight Records Modal */}
      <WeightRecordsModal
        open={showWeightRecords}
        onOpenChange={setShowWeightRecords}
      />

      {/* Weight Goal Modal */}
      <WeightGoalModal
        open={showWeightGoal}
        onOpenChange={setShowWeightGoal}
        currentWeight={weightData?.currentWeight}
        onUpdate={() => {
          // Reload weight data
          if (user?.id) {
            fetch(`/api/weight?userId=${user.id}`)
              .then(res => res.json())
              .then(data => {
                setWeightData({
                  todayAvg: data.todayAvg,
                  changeWeek: data.changeWeek,
                  currentWeight: data.currentWeight,
                  targetWeight: data.targetWeight,
                  toGoal: data.toGoal
                })
              })
          }
        }}
      />
    </div>
  )
}

// ─── Helper: plural days ─────────────────────────────────────────────────────

function pluralDays(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'день'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'дня'
  return 'дней'
}

// ─── Energy bar helper ───────────────────────────────────────────────────────

function EnergyBar({ value, label, emoji }: { value: number; label: string; emoji: string }) {
  const pct = (value / 10) * 100
  const color = value >= 8 ? '#22c55e' : value >= 6 ? '#f59e0b' : value >= 4 ? '#f97316' : '#ef4444'
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/50">{emoji} {label}</span>
        <span className="font-bold" style={{ color }}>{value}/10</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

// ─── Check-in status block ───────────────────────────────────────────────────

function CheckinStatusBlock({
  morningDone,
  eveningDone,
  morningEnergy,
  morningFocus,
  eveningRating,
  eveningWin,
  isMorningTime,
  isEveningTime,
  onOpenDailySummary,
}: {
  morningDone: boolean
  eveningDone: boolean
  morningEnergy?: number
  morningFocus?: string
  eveningRating?: number
  eveningWin?: string
  isMorningTime: boolean
  isEveningTime: boolean
  onOpenDailySummary?: () => void
}) {
  // Always-visible two-badge status row
  const badgeRow = (
    <div className="flex gap-2 mb-3">
      <button
        onClick={onOpenDailySummary}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
          morningDone
            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
            : 'bg-white/5 text-white/40 border border-white/10'
        }`}
      >
        <span>☀️</span>
        <span>Утро</span>
        <span>{morningDone ? '✅' : '⏳'}</span>
      </button>
      <button
        onClick={onOpenDailySummary}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
          eveningDone
            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            : 'bg-white/5 text-white/40 border border-white/10'
        }`}
      >
        <span>🌙</span>
        <span>Вечер</span>
        <span>{eveningDone ? '✅' : '⏳'}</span>
      </button>
    </div>
  )

  // If both done — show combined summary with bars
  if (morningDone && eveningDone) {
    return (
      <div
        className="rounded-2xl p-4"
        style={{
          background: 'linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(16,185,129,0.08) 100%)',
          border: '1px solid rgba(34,197,94,0.2)',
        }}
      >
        {badgeRow}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-green-400 text-sm font-semibold">✓ Оба чекапа выполнены</span>
          {morningFocus && (
            <span className="text-xs text-white/40 ml-auto">слово: {morningFocus}</span>
          )}
        </div>
        <div className="space-y-2">
          {morningEnergy && <EnergyBar value={morningEnergy} label="Утренняя энергия" emoji="⚡" />}
          {eveningRating && <EnergyBar value={eveningRating} label="Оценка дня" emoji="🌙" />}
        </div>
        {eveningWin && (
          <div className="mt-2 text-xs text-white/60 italic border-t border-white/10 pt-2">🏆 {eveningWin}</div>
        )}
      </div>
    )
  }

  // Morning pending in morning time
  if (!morningDone && isMorningTime) {
    return (
      <div
        className="rounded-2xl p-4 cursor-default"
        style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.10) 100%)',
          border: '1px solid rgba(99,102,241,0.25)',
        }}
      >
        {badgeRow}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-white">Утренний чекап</div>
            <div className="text-xs text-white/40 mt-0.5">Появится автоматически · займёт 1 мин</div>
          </div>
          <div className="text-2xl">🌅</div>
        </div>
      </div>
    )
  }

  // Evening pending in evening time, morning done
  if (!eveningDone && isEveningTime && morningDone) {
    return (
      <div
        className="rounded-2xl p-4"
        style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(234,88,12,0.10) 100%)',
          border: '1px solid rgba(245,158,11,0.25)',
        }}
      >
        {badgeRow}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-white">Вечерний чекап</div>
            <div className="text-xs text-white/40 mt-0.5">Появится автоматически · закрой день</div>
          </div>
          <div className="text-2xl">🌙</div>
        </div>
        {morningEnergy && (
          <div className="mt-2 text-xs text-white/40">
            Утро: ⚡{morningEnergy}/10{morningFocus ? ` · ${morningFocus}` : ''}
          </div>
        )}
      </div>
    )
  }

  // Morning done, not evening time yet
  if (morningDone && !isEveningTime) {
    return (
      <div
        className="rounded-2xl p-3"
        style={{
          background: 'rgba(34,197,94,0.08)',
          border: '1px solid rgba(34,197,94,0.15)',
        }}
      >
        {badgeRow}
        <div className="flex items-center gap-2">
          <span className="text-green-400 text-xs">✓ Утро выполнено</span>
          {morningFocus && <span className="text-xs text-white/30">· {morningFocus}</span>}
          <span className="ml-auto text-white/25 text-[10px]">вечер после 18:00</span>
        </div>
        {morningEnergy && <EnergyBar value={morningEnergy} label="Утренняя энергия" emoji="⚡" />}
      </div>
    )
  }

  // Default: show just the badge row (e.g. middle of the day, no checkins yet)
  return <div className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>{badgeRow}</div>
}
