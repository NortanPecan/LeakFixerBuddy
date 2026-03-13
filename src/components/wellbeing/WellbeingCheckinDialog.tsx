'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Loader2, 
  Clock,
  AlertCircle
} from 'lucide-react'
import { 
  WellbeingQuestion, 
  PresetLevel, 
  getQuestionsForPreset 
} from '@/lib/wellbeing-config'
import { formatDateKey } from '@/lib/date-utils'

interface WellbeingCheckinDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  preset: PresetLevel
  date: Date
  existingAnswers?: Record<string, number>
  onComplete?: (answers: Record<string, number>, scores: { as10Scale: number }) => void
}

export function WellbeingCheckinDialog({
  open,
  onOpenChange,
  preset,
  date,
  existingAnswers = {},
  onComplete
}: WellbeingCheckinDialogProps) {
  const { user } = useAppStore()
  const [questions, setQuestions] = useState<WellbeingQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [showCloseWarning, setShowCloseWarning] = useState(false)

  // Load questions when dialog opens
  useEffect(() => {
    if (open) {
      const dailyQuestions = getQuestionsForPreset(preset, 'daily')
      setQuestions(dailyQuestions)
      setCurrentIndex(0)
      // Start with empty answers - user must explicitly select
      setAnswers({})
      setShowCloseWarning(false)
    }
  }, [open, preset])

  const currentQuestion = questions[currentIndex]
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0
  const answeredCount = Object.keys(answers).filter(k => questions.some(q => q.id === k)).length
  const hasAnsweredCurrent = currentAnswer !== undefined

  const handleAnswerChange = useCallback((value: number) => {
    if (currentQuestion) {
      setAnswers(prev => ({
        ...prev,
        [currentQuestion.id]: value
      }))
    }
  }, [currentQuestion])

  // Navigate to next question (auto-saves current answer if selected)
  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1)
    }
  }, [currentIndex, questions.length])

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
    }
  }, [currentIndex])

  const handleSave = useCallback(async () => {
    if (!user?.id) {
      console.error('[Wellbeing] No user ID available')
      return
    }

    // Check if all questions answered
    const allAnswered = questions.every(q => answers[q.id] !== undefined)
    if (!allAnswered) {
      alert('Пожалуйста, ответьте на все вопросы')
      return
    }

    console.log('[Wellbeing] Saving with userId:', user.id, 'date:', formatDateKey(date), 'preset:', preset)
    setIsSaving(true)
    try {
      const response = await fetch('/api/wellbeing/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          date: formatDateKey(date),
          preset,
          answers
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('[Wellbeing] Save failed:', response.status, errorData)
        
        if (response.status === 401 || errorData.error?.includes('User not found')) {
          localStorage.removeItem('leakfixer-storage')
          localStorage.removeItem('leakfixer-auth-mode')
          window.location.reload()
          return
        }
        
        throw new Error(errorData.error || 'Failed to save')
      }

      const data = await response.json()
      console.log('[Wellbeing] Save success:', data)
      onComplete?.(answers, data.data.scores)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save wellbeing:', error)
      alert('Ошибка при сохранении. Попробуйте ещё раз.')
    } finally {
      setIsSaving(false)
    }
  }, [user?.id, date, preset, answers, questions, onComplete, onOpenChange])

  // Handle dialog close
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && answeredCount > 0) {
      setShowCloseWarning(true)
    } else {
      onOpenChange(false)
    }
  }

  const confirmClose = () => {
    setShowCloseWarning(false)
    onOpenChange(false)
  }

  const saveAndClose = async () => {
    setShowCloseWarning(false)
    await handleSave()
  }

  // Render slider based on question type
  const renderSlider = () => {
    if (!currentQuestion) return null

    // NO DEFAULT VALUE - user must explicitly select
    const currentValue = currentAnswer

    if (currentQuestion.scale === 'hours') {
      return (
        <div className="space-y-4">
          <div className="text-center">
            {currentValue !== undefined ? (
              <>
                <span className="text-5xl font-bold">{currentValue}</span>
                <span className="text-xl text-muted-foreground ml-2">часов</span>
              </>
            ) : (
              <span className="text-xl text-muted-foreground">Выберите значение</span>
            )}
          </div>
          
          {/* Quick select buttons */}
          <div className="flex justify-center gap-2">
            {[6, 7, 8, 9].map((val) => (
              <Button
                key={val}
                variant={currentValue === val ? 'default' : 'outline'}
                size="sm"
                className={`w-12 h-10 ${currentValue === val ? 'bg-primary text-primary-foreground' : ''}`}
                onClick={() => handleAnswerChange(val)}
              >
                {val}ч
              </Button>
            ))}
          </div>
          
          <div className="px-4">
            <input
              type="range"
              value={currentValue ?? 7}
              onChange={(e) => handleAnswerChange(parseFloat(e.target.value))}
              min={0}
              max={12}
              step={0.5}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground px-4">
            <span>0ч</span>
            <span>12ч+</span>
          </div>
        </div>
      )
    }

    // 1-5 scale with emojis
    return (
      <div className="space-y-6">
        <div className="text-center">
          {currentValue !== undefined ? (
            <div className="flex justify-center items-end gap-2 mb-2">
              {currentValue === 1 && <span className="text-4xl">😞</span>}
              {currentValue === 2 && <span className="text-4xl">😕</span>}
              {currentValue === 3 && <span className="text-4xl">😐</span>}
              {currentValue === 4 && <span className="text-4xl">🙂</span>}
              {currentValue === 5 && <span className="text-4xl">😊</span>}
              <span className="text-5xl font-bold">{currentValue}</span>
            </div>
          ) : (
            <div className="py-4 text-muted-foreground">
              <span className="text-lg">Нажмите на цифру для выбора ответа</span>
            </div>
          )}
        </div>

        <div className="flex justify-center gap-3">
          {[1, 2, 3, 4, 5].map((val) => (
            <Button
              key={val}
              variant={currentValue === val ? 'default' : 'outline'}
              size="lg"
              className={`w-14 h-14 rounded-full text-lg font-bold transition-all ${
                currentValue === val 
                  ? 'bg-primary text-primary-foreground scale-110 shadow-lg' 
                  : 'hover:bg-muted hover:scale-105'
              }`}
              onClick={() => handleAnswerChange(val)}
            >
              {val}
            </Button>
          ))}
        </div>

        <div className="flex justify-between text-sm text-muted-foreground px-4">
          <span>{currentQuestion.labels.low}</span>
          <span>{currentQuestion.labels.high}</span>
        </div>
      </div>
    )
  }

  if (!currentQuestion) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg">Wellbeing-чекин</DialogTitle>
              <Badge variant="outline" className="text-xs">
                {answeredCount}/{questions.length}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{formatDateKey(date)}</span>
            </div>
          </DialogHeader>

          {/* Progress bar */}
          <div className="space-y-1">
            <Progress value={progress} className="h-1.5" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Вопрос {currentIndex + 1} из {questions.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>

          {/* Question content */}
          <div className="py-4">
            <div className="mb-2">
              <Badge variant="secondary" className="text-xs">
                {currentQuestion.category}
              </Badge>
            </div>
            <h3 className="text-lg font-medium mb-6">
              {currentQuestion.question}
            </h3>
            {renderSlider()}
          </div>

          {/* Navigation */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrev}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            {currentIndex < questions.length - 1 ? (
              <>
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={handleNext}
                  disabled={!hasAnsweredCurrent}
                >
                  Далее
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </>
            ) : (
              <Button
                className="flex-1"
                onClick={handleSave}
                disabled={isSaving || !hasAnsweredCurrent}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Сохранить
              </Button>
            )}
            
            {currentIndex < questions.length - 1 && !hasAnsweredCurrent && (
              <Button
                variant="ghost"
                className="flex-1 text-muted-foreground"
                disabled
              >
                Выберите ответ
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Close Warning Dialog */}
      <Dialog open={showCloseWarning} onOpenChange={setShowCloseWarning}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-500">
              <AlertCircle className="w-5 h-5" />
              Несохранённые ответы
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            У вас {answeredCount} из {questions.length} ответов. Сохранить?
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={saveAndClose} disabled={isSaving || answeredCount < questions.length}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Сохранить
            </Button>
            <Button variant="destructive" onClick={confirmClose}>
              Закрыть без сохранения
            </Button>
            <Button variant="outline" onClick={() => setShowCloseWarning(false)}>
              Отмена
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
