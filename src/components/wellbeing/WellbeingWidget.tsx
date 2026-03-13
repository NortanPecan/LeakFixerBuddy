'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Target, 
  ClipboardList, 
  Settings, 
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  Calendar,
  RotateCcw,
  Trash2,
  AlertCircle,
  Check
} from 'lucide-react'
import { PresetLevel, PRESET_INFO } from '@/lib/wellbeing-config'
import { PresetSelectionDialog } from './PresetSelectionDialog'
import { WellbeingCheckinDialog } from './WellbeingCheckinDialog'
import { WeeklyWellbeingDialog } from './WeeklyWellbeingDialog'
import { formatDateKey } from '@/lib/date-utils'
import { getISOWeek } from '@/lib/wellbeing-utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface WellbeingWidgetProps {
  mood?: number | null
  energy?: number | null
  onMoodUpdate?: () => void
}

interface WellbeingData {
  preset: PresetLevel
  recordPreset: PresetLevel | null
  scores: {
    overall: number
    as10Scale: number
    byCategory: Record<string, { score: number; count: number }>
  } | null
  progress: {
    answered: number
    total: number
    percentage: number
    isComplete: boolean
  }
  answers: Record<string, number>
}

interface WeeklyData {
  year: number
  week: number
  preset: PresetLevel
  answers: Record<string, number>
}

interface WeeklyCheck {
  hasIncomplete: boolean
  incompleteWeek: { year: number; week: number } | null
}

export function WellbeingWidget({ mood, energy, onMoodUpdate }: WellbeingWidgetProps) {
  const { user, selectedDate, selectedDateObj } = useAppStore()
  const [wellbeingData, setWellbeingData] = useState<WellbeingData | null>(null)
  const [weeklyData, setWeeklyData] = useState<WeeklyData | null>(null)
  const [weeklyCheck, setWeeklyCheck] = useState<WeeklyCheck | null>(null)
  const [currentSettingsPreset, setCurrentSettingsPreset] = useState<PresetLevel>('core')
  const [isLoading, setIsLoading] = useState(true)
  
  // Dialog states
  const [showPresetDialog, setShowPresetDialog] = useState(false)
  const [showCheckinDialog, setShowCheckinDialog] = useState(false)
  const [showWeeklyDialog, setShowWeeklyDialog] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)

  // Load wellbeing data
  const loadWellbeingData = useCallback(async () => {
    if (!user?.id) return

    setIsLoading(true)
    try {
      const isoWeek = getISOWeek(selectedDateObj)
      
      const [dailyRes, settingsRes, weeklyCheckRes, weeklyDataRes] = await Promise.all([
        fetch(`/api/wellbeing/daily?userId=${user.id}&date=${selectedDate}`),
        fetch(`/api/wellbeing/settings?userId=${user.id}`),
        fetch(`/api/wellbeing/weekly?userId=${user.id}&checkIncomplete=true`, { method: 'PUT' }),
        fetch(`/api/wellbeing/weekly?userId=${user.id}&year=${isoWeek.year}&week=${isoWeek.week}`)
      ])

      const dailyData = await dailyRes.json()
      const settingsData = await settingsRes.json()
      const weeklyCheckData = await weeklyCheckRes.json()
      const weeklyDataJson = await weeklyDataRes.json()

      if (settingsData.success) {
        setCurrentSettingsPreset(settingsData.settings.preset)
      }

      if (dailyData.success) {
        const recordPreset = dailyData.data.recordPreset || null
        const settingsPreset = settingsData.success ? settingsData.settings.preset : 'core'
        
        setWellbeingData({
          preset: recordPreset || settingsPreset,
          recordPreset,
          scores: dailyData.data.scores,
          progress: dailyData.data.progress,
          answers: dailyData.data.answers
        })
      } else {
        const settingsPreset = settingsData.success ? settingsData.settings.preset : 'core'
        setWellbeingData({
          preset: settingsPreset,
          recordPreset: null,
          scores: null,
          progress: { answered: 0, total: 7, percentage: 0, isComplete: false },
          answers: {}
        })
      }

      if (weeklyCheckData.success) {
        setWeeklyCheck({
          hasIncomplete: weeklyCheckData.hasIncomplete,
          incompleteWeek: weeklyCheckData.incompleteWeek
        })
      }

      if (weeklyDataJson.success && weeklyDataJson.data) {
        setWeeklyData({
          year: weeklyDataJson.data.year,
          week: weeklyDataJson.data.week,
          preset: weeklyDataJson.data.preset,
          answers: weeklyDataJson.data.answers
        })
      }
    } catch (error) {
      console.error('Failed to load wellbeing data:', error)
      setWellbeingData({
        preset: 'core',
        recordPreset: null,
        scores: null,
        progress: { answered: 0, total: 7, percentage: 0, isComplete: false },
        answers: {}
      })
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, selectedDate, selectedDateObj])

  useEffect(() => {
    loadWellbeingData()
  }, [loadWellbeingData])

  // Handle preset change
  const handlePresetChange = (newPreset: PresetLevel) => {
    setCurrentSettingsPreset(newPreset)
    setWellbeingData(prev => {
      if (!prev) return null
      if (prev.recordPreset) return prev
      return { ...prev, preset: newPreset }
    })
    loadWellbeingData()
  }

  // Handle checkin complete
  const handleCheckinComplete = (answers: Record<string, number>, scores: { as10Scale: number }) => {
    setWellbeingData(prev => {
      if (!prev) return null
      return {
        ...prev,
        scores: {
          overall: scores.as10Scale / 10,
          as10Scale: scores.as10Scale,
          byCategory: prev.scores?.byCategory || {}
        },
        progress: {
          ...prev.progress,
          answered: Object.keys(answers).length,
          isComplete: true,
          percentage: 100
        },
        answers
      }
    })
  }

  // Handle weekly complete
  const handleWeeklyComplete = () => {
    setWeeklyCheck({ hasIncomplete: false, incompleteWeek: null })
    loadWellbeingData()
  }

  // Reset today's wellbeing record
  const handleReset = async () => {
    if (!user?.id) return
    
    setIsResetting(true)
    try {
      const response = await fetch('/api/wellbeing/daily', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          date: formatDateKey(selectedDateObj)
        })
      })

      if (!response.ok) throw new Error('Failed to reset')

      // Show success notification
      setResetSuccess(true)
      setTimeout(() => setResetSuccess(false), 2000)

      // Reload data
      loadWellbeingData()
      setShowResetConfirm(false)
    } catch (error) {
      console.error('Failed to reset wellbeing:', error)
    } finally {
      setIsResetting(false)
    }
  }

  const wellbeingScore = wellbeingData?.scores?.as10Scale ?? null
  const deltaFromMood = (mood && wellbeingScore) ? wellbeingScore - mood : null

  const displayPreset = wellbeingData?.recordPreset || wellbeingData?.preset || currentSettingsPreset
  const presetInfo = PRESET_INFO[displayPreset]
  const isHistoricalRecord = wellbeingData?.recordPreset && wellbeingData.recordPreset !== currentSettingsPreset

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 border-white/10 backdrop-blur-xl">
        <CardContent className="p-4">
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!wellbeingData) {
    return (
      <>
        <Card className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 border-white/10 backdrop-blur-xl cursor-pointer hover:border-purple-500/30 transition-colors"
              onClick={() => setShowPresetDialog(true)}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Target className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">Wellbeing Tracker</div>
                <div className="text-xs text-muted-foreground">Нажмите для настройки</div>
              </div>
              <Settings className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <PresetSelectionDialog
          open={showPresetDialog}
          onOpenChange={setShowPresetDialog}
          onSelect={handlePresetChange}
        />
      </>
    )
  }

  return (
    <>
      <Card className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 border-white/10 backdrop-blur-xl">
        <CardContent className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-400" />
              <span className="text-sm font-medium">Wellbeing</span>
              <Badge variant="outline" className="text-xs">
                {presetInfo?.nameRu}
              </Badge>
              {isHistoricalRecord && (
                <Badge variant="secondary" className="text-xs text-muted-foreground">
                  (записано)
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setShowPresetDialog(true)}
            >
              <Settings className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </div>

          {/* Score display */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg bg-muted/30">
              <div className="text-xs text-muted-foreground">Настроение</div>
              <div className="text-xl font-bold">{mood ?? '—'}</div>
              <div className="text-xs text-muted-foreground">/10</div>
            </div>
            
            <div className="p-2 rounded-lg bg-muted/30">
              <div className="text-xs text-muted-foreground">Энергия</div>
              <div className="text-xl font-bold">{energy ?? '—'}</div>
              <div className="text-xs text-muted-foreground">/10</div>
            </div>
            
            <div className="p-2 rounded-lg bg-purple-500/10">
              <div className="text-xs text-purple-400">Wellbeing</div>
              <div className="text-xl font-bold text-purple-300">
                {wellbeingScore ?? '—'}
              </div>
              <div className="text-xs text-muted-foreground">/10</div>
            </div>
          </div>

          {/* Delta insight */}
          {deltaFromMood !== null && (
            <div className="flex items-center justify-center gap-1 text-xs">
              <span className="text-muted-foreground">Δ от настроения:</span>
              <span className={`flex items-center ${
                deltaFromMood > 0 ? 'text-emerald-400' :
                deltaFromMood < 0 ? 'text-red-400' : 'text-muted-foreground'
              }`}>
                {deltaFromMood > 0 ? <TrendingUp className="w-3 h-3" /> :
                 deltaFromMood < 0 ? <TrendingDown className="w-3 h-3" /> :
                 <Minus className="w-3 h-3" />}
                {deltaFromMood > 0 ? '+' : ''}{deltaFromMood.toFixed(1)}
              </span>
            </div>
          )}

          {/* Progress */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Прогресс чекина</span>
              <span>{wellbeingData.progress.answered}/{wellbeingData.progress.total}</span>
            </div>
            <Progress value={wellbeingData.progress.percentage} className="h-1.5" />
          </div>

          {/* Weekly check reminder */}
          {weeklyCheck?.hasIncomplete && (
            <div 
              className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 cursor-pointer hover:bg-amber-500/20 transition-colors"
              onClick={() => setShowWeeklyDialog(true)}
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-amber-400">Еженедельные вопросы не заполнены</span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => setShowCheckinDialog(true)}
            >
              <ClipboardList className="w-3.5 h-3.5 mr-1" />
              {wellbeingData.progress.isComplete ? 'Обновить' : 'Чекин'}
            </Button>
            
            {/* Reset button - only show if there's data */}
            {wellbeingData.progress.isComplete && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs text-red-400 border-red-500/30 hover:bg-red-500/10"
                onClick={() => setShowResetConfirm(true)}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            )}
            
            {weeklyCheck?.hasIncomplete && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20"
                onClick={() => setShowWeeklyDialog(true)}
              >
                <Calendar className="w-3.5 h-3.5 mr-1" />
                За неделю
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <PresetSelectionDialog
        open={showPresetDialog}
        onOpenChange={setShowPresetDialog}
        currentPreset={currentSettingsPreset}
        onSelect={handlePresetChange}
      />

      <WellbeingCheckinDialog
        open={showCheckinDialog}
        onOpenChange={setShowCheckinDialog}
        preset={displayPreset}
        date={selectedDateObj}
        existingAnswers={wellbeingData.answers}
        onComplete={handleCheckinComplete}
      />

      <WeeklyWellbeingDialog
        open={showWeeklyDialog}
        onOpenChange={setShowWeeklyDialog}
        preset={currentSettingsPreset}
        year={weeklyData?.year || getISOWeek(new Date()).year}
        week={weeklyData?.week || getISOWeek(new Date()).week}
        existingAnswers={weeklyData?.answers || {}}
        onComplete={handleWeeklyComplete}
      />

      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5" />
              Сбросить запись?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Это удалит все ответы за {formatDateKey(selectedDateObj)}. Вы сможете пройти чекин заново.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Button 
              onClick={handleReset} 
              disabled={isResetting}
              variant="destructive"
            >
              {isResetting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Сбросить
            </Button>
            <Button variant="outline" onClick={() => setShowResetConfirm(false)}>
              Отмена
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success notification */}
      {resetSuccess && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200]">
          <div className="bg-emerald-500/90 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">Запись сброшена</span>
          </div>
        </div>
      )}
    </>
  )
}
