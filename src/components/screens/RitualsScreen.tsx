'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Sparkles,
  Plus,
  CheckCircle2,
  Circle,
  ChevronRight,
  Calendar,
  Zap,
  BookOpen,
  Heart,
  Brain,
  Dumbbell,
  Target,
  TrendingUp,
  Flame,
  Clock,
  X
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DatePicker, DateBadge } from '@/components/DatePicker'
import { CATEGORY_LABELS, TIME_WINDOW_LABELS, type Ritual, type RitualCategory, type AttributeKey } from '@/lib/rituals/data'

const CATEGORY_ICONS: Record<RitualCategory, React.ElementType> = {
  health: Heart,
  money: Target,
  learning: BookOpen,
  relationships: Heart,
  mind: Brain,
  productivity: Zap,
}

export function RitualsScreen() {
  const { user, setScreen, selectedDate, selectedDateObj } = useAppStore()
  const [rituals, setRituals] = useState<Ritual[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showPresetModal, setShowPresetModal] = useState(false)
  const [presetChecked, setPresetChecked] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [selectedRitual, setSelectedRitual] = useState<Ritual | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  // Stats from API
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    percentage: 0
  })

  // Load rituals
  useEffect(() => {
    const loadRituals = async () => {
      if (!user?.id) return
      setIsLoading(true)
      try {
        const response = await fetch(`/api/rituals?userId=${user.id}&date=${selectedDate}`)
        const data = await response.json()
        
        // Use data from API directly
        setRituals(data.todayRituals || [])
        setStats(data.stats || { total: 0, completed: 0, percentage: 0 })

        // Check if preset was offered before
        const presetOffered = localStorage.getItem('ritual_preset_offered')
        if (!presetOffered && (data.rituals || []).length === 0) {
          setShowPresetModal(true)
        }
        setPresetChecked(true)
      } catch (error) {
        console.error('Failed to load rituals:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadRituals()
  }, [user?.id, selectedDate])

  // Toggle ritual completion
  const handleToggleComplete = async (ritual: Ritual, completed: boolean) => {
    try {
      await fetch('/api/rituals/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ritualId: ritual.id,
          userId: user?.id,
          date: selectedDate,
          completed
        })
      })

      // Update local state
      setRituals(prev => prev.map(r => 
        r.id === ritual.id ? { ...r, completedToday: completed } : r
      ))

      // Update stats
      setStats(prev => ({
        ...prev,
        completed: completed 
          ? prev.completed + 1 
          : Math.max(0, prev.completed - 1),
        percentage: prev.total > 0 
          ? Math.round(((completed ? prev.completed + 1 : prev.completed - 1) / prev.total) * 100)
          : 0
      }))
    } catch (error) {
      console.error('Failed to toggle ritual:', error)
    }
  }

  // Apply preset
  const handleApplyPreset = async () => {
    if (!user?.id) return
    setIsApplying(true)
    try {
      const response = await fetch('/api/rituals/preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, presetId: 'swamp_escape' })
      })
      const data = await response.json()
      
      if (data.success) {
        // Reload rituals
        const ritualsResponse = await fetch(`/api/rituals?userId=${user.id}&date=${selectedDate}`)
        const ritualsData = await ritualsResponse.json()
        setRituals(ritualsData.rituals || [])
      }
    } catch (error) {
      console.error('Failed to apply preset:', error)
    } finally {
      setIsApplying(false)
      setShowPresetModal(false)
      localStorage.setItem('ritual_preset_offered', 'true')
    }
  }

  // Skip preset
  const handleSkipPreset = () => {
    setShowPresetModal(false)
    localStorage.setItem('ritual_preset_offered', 'true')
  }

  // Group by time window
  const groupedRituals = {
    morning: rituals.filter(r => r.timeWindow === 'morning'),
    day: rituals.filter(r => r.timeWindow === 'day'),
    evening: rituals.filter(r => r.timeWindow === 'evening'),
    any: rituals.filter(r => r.timeWindow === 'any')
  }

  // Calculate progress from stats
  const progressPercent = stats.percentage

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ритуалы</h1>
          <p className="text-muted-foreground text-sm">
            {isLoading ? 'Загрузка...' : `${rituals.length} активных`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateBadge />
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90"
            onClick={() => setScreen('create-ritual')}
          >
            <Plus className="w-4 h-4 mr-1" />
            Создать
          </Button>
        </div>
      </div>

      {/* Date Picker */}
      <DatePicker variant="compact" />

      {/* Progress for selected day */}
      {!isLoading && stats.total > 0 && (
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm text-muted-foreground">Прогресс</p>
                <p className="text-2xl font-bold">
                  {stats.completed} / {stats.total}
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-primary">{progressPercent}%</p>
                {stats.completed === stats.total && stats.total > 0 && (
                  <Badge className="bg-emerald-500/20 text-emerald-300">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Все выполнено!
                  </Badge>
                )}
              </div>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && rituals.length === 0 && presetChecked && (
        <Card className="bg-card/50 backdrop-blur border-dashed">
          <CardContent className="pt-6 text-center">
            <Sparkles className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-4">Нет активных ритуалов</p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => setShowPresetModal(true)}>
                <Sparkles className="w-4 h-4 mr-2" />
                Подключить базовый пакет
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setScreen('create-ritual')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Создать свой ритуал
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rituals by time window */}
      {!isLoading && rituals.length > 0 && (
        <>
          {(['morning', 'day', 'evening', 'any'] as const).map(timeWindow => {
            const ritualsInWindow = groupedRituals[timeWindow]
            if (ritualsInWindow.length === 0) return null

            return (
              <div key={timeWindow} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    {TIME_WINDOW_LABELS[timeWindow as keyof typeof TIME_WINDOW_LABELS]}
                  </span>
                </div>
                <div className="space-y-2">
                  {ritualsInWindow.map(ritual => {
                    const category = CATEGORY_LABELS[ritual.category as RitualCategory]
                    const Icon = category ? CATEGORY_ICONS[ritual.category as RitualCategory] : Target
                    
                    return (
                      <Card 
                        key={ritual.id} 
                        className={`bg-card/50 backdrop-blur cursor-pointer transition-all hover:bg-card/70 ${
                          (ritual as Ritual & { completedToday?: boolean }).completedToday 
                            ? 'border-emerald-500/30' 
                            : ''
                        }`}
                        onClick={() => {
                          setSelectedRitual(ritual)
                          setShowDetail(true)
                        }}
                      >
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-3">
                            {/* Complete button */}
                            <button
                              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                                (ritual as Ritual & { completedToday?: boolean }).completedToday
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-muted hover:bg-muted/70'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleToggleComplete(ritual, !(ritual as Ritual & { completedToday?: boolean }).completedToday)
                              }}
                            >
                              {(ritual as Ritual & { completedToday?: boolean }).completedToday ? (
                                <CheckCircle2 className="w-5 h-5" />
                              ) : (
                                <Circle className="w-5 h-5 text-muted-foreground" />
                              )}
                            </button>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className={`font-medium truncate ${
                                  (ritual as Ritual & { completedToday?: boolean }).completedToday 
                                    ? 'text-emerald-400' 
                                    : ''
                                }`}>
                                  {ritual.title}
                                </p>
                                {category && (
                                  <span className="text-sm">{category.icon}</span>
                                )}
                              </div>
                              {ritual.goalShort && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {ritual.goalShort}
                                </p>
                              )}
                              {/* Attributes */}
                              {ritual.attributes && (
                                <div className="flex gap-1 mt-1">
                                  {(() => {
                                    try {
                                      const attrs = JSON.parse(ritual.attributes as string) as AttributeKey[]
                                      return attrs.map(attr => (
                                        <Badge 
                                          key={attr} 
                                          variant="outline" 
                                          className="text-[10px] px-1.5 py-0"
                                        >
                                          {attr === 'health' ? '❤️' : attr === 'mind' ? '🧠' : '💪'}
                                        </Badge>
                                      ))
                                    } catch { return null }
                                  })()}
                                </div>
                              )}
                            </div>

                            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </>
      )}

      {/* All rituals button */}
      {!isLoading && rituals.length > 0 && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setScreen('all-rituals')}
        >
          <Calendar className="w-4 h-4 mr-2" />
          Все ритуалы ({rituals.length})
        </Button>
      )}

      {/* Catalog button */}
      {!isLoading && (
        <Button
          variant="ghost"
          className="w-full text-muted-foreground"
          onClick={() => setScreen('catalog')}
        >
          <BookOpen className="w-4 h-4 mr-2" />
          Каталог ритуалов
        </Button>
      )}

      {/* Preset Modal */}
      <Dialog open={showPresetModal} onOpenChange={setShowPresetModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Базовый пакет
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Хочешь начать с готового пакета &quot;Базовый пакет для выхода из болота&quot;? 
              В него входят 12 проверенных ритуалов для старта.
            </p>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-muted/30">💧 Вода утром</div>
              <div className="p-2 rounded-lg bg-muted/30">🏋️ Зарядка</div>
              <div className="p-2 rounded-lg bg-muted/30">🚿 Контрастный душ</div>
              <div className="p-2 rounded-lg bg-muted/30">🌬️ Дыхание</div>
              <div className="p-2 rounded-lg bg-muted/30">🎯 Цели</div>
              <div className="p-2 rounded-lg bg-muted/30">📅 План дня</div>
              <div className="p-2 rounded-lg bg-muted/30">🚶 Прогулка</div>
              <div className="p-2 rounded-lg bg-muted/30">💪 Тренировка</div>
              <div className="p-2 rounded-lg bg-muted/30">🧘 Медитация</div>
              <div className="p-2 rounded-lg bg-muted/30">📖 Обучение</div>
              <div className="p-2 rounded-lg bg-muted/30">📚 Чтение</div>
              <div className="p-2 rounded-lg bg-muted/30">📝 Итоги дня</div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleSkipPreset}
              >
                Пропустить
              </Button>
              <Button
                className="flex-1 bg-primary"
                onClick={handleApplyPreset}
                disabled={isApplying}
              >
                {isApplying ? 'Подключение...' : 'Подключить'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ritual Detail Modal */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedRitual?.title}</DialogTitle>
          </DialogHeader>
          {selectedRitual && (
            <RitualDetailContent 
              ritual={selectedRitual} 
              onComplete={(completed) => {
                handleToggleComplete(selectedRitual, completed)
                setSelectedRitual(prev => prev ? { ...prev, completedToday: completed } : null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Ritual Detail Content Component
function RitualDetailContent({ 
  ritual, 
  onComplete 
}: { 
  ritual: Ritual; 
  onComplete: (completed: boolean) => void 
}) {
  const [completions, setCompletions] = useState<Array<{ date: Date; completed: boolean; note?: string }>>([])
  const [stats, setStats] = useState({ streak: 0, completionRate: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [note, setNote] = useState('')

  useEffect(() => {
    const loadCompletions = async () => {
      try {
        const response = await fetch(`/api/rituals/complete?ritualId=${ritual.id}`)
        const data = await response.json()
        setCompletions(data.completions || [])
        setStats(data.stats || { streak: 0, completionRate: 0 })
      } catch (error) {
        console.error('Failed to load completions:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadCompletions()
  }, [ritual.id])

  // Generate heatmap for last 30 days
  const generateHeatmap = useCallback(() => {
    const days = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      
      const completion = completions.find(c => {
        const cDate = new Date(c.date)
        cDate.setHours(0, 0, 0, 0)
        return cDate.getTime() === date.getTime()
      })

      days.push({
        date,
        completed: completion?.completed || false,
        note: completion?.note
      })
    }
    return days
  }, [completions])

  const heatmap = generateHeatmap()
  const category = CATEGORY_LABELS[ritual.category as RitualCategory]

  return (
    <div className="space-y-4 pt-4">
      {/* Category and time */}
      <div className="flex flex-wrap gap-2">
        {category && (
          <Badge className={category.color}>
            {category.icon} {category.label}
          </Badge>
        )}
        <Badge variant="outline">
          <Clock className="w-3 h-3 mr-1" />
          {TIME_WINDOW_LABELS[ritual.timeWindow as keyof typeof TIME_WINDOW_LABELS]}
        </Badge>
      </div>

      {/* Goal */}
      {ritual.goalShort && (
        <div className="p-3 rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground mb-1">Цель</p>
          <p className="text-sm font-medium">{ritual.goalShort}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-muted/30 text-center">
          <Flame className="w-5 h-5 mx-auto text-orange-400 mb-1" />
          <p className="text-xl font-bold">{stats.streak}</p>
          <p className="text-xs text-muted-foreground">дней подряд</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/30 text-center">
          <TrendingUp className="w-5 h-5 mx-auto text-emerald-400 mb-1" />
          <p className="text-xl font-bold">{stats.completionRate}%</p>
          <p className="text-xs text-muted-foreground">за 30 дней</p>
        </div>
      </div>

      {/* Heatmap */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Последние 30 дней</p>
        <div className="grid grid-cols-10 gap-1">
          {heatmap.map((day, i) => (
            <div
              key={i}
              className={`aspect-square rounded-sm ${
                day.completed 
                  ? 'bg-emerald-500' 
                  : 'bg-muted'
              }`}
              title={`${day.date.toLocaleDateString('ru-RU')} - ${day.completed ? 'Выполнено' : 'Не выполнено'}`}
            />
          ))}
        </div>
        <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-emerald-500" />
            <span>Выполнено</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-muted" />
            <span>Не выполнено</span>
          </div>
        </div>
      </div>

      {/* Complete button */}
      <Button
        className={`w-full ${(ritual as Ritual & { completedToday?: boolean }).completedToday ? 'bg-muted text-muted-foreground' : 'bg-primary'}`}
        onClick={() => onComplete(!(ritual as Ritual & { completedToday?: boolean }).completedToday)}
      >
        {(ritual as Ritual & { completedToday?: boolean }).completedToday ? (
          <>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Выполнено сегодня
          </>
        ) : (
          <>
            <Circle className="w-4 h-4 mr-2" />
            Отметить выполненным
          </>
        )}
      </Button>
    </div>
  )
}
