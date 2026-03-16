'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { showErrorToast, showSuccessToast } from '@/lib/network-utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Target, Calendar, Info } from 'lucide-react'

interface WeightGoalModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentWeight?: number | null
  onUpdate: () => void
}

export function WeightGoalModal({ open, onOpenChange, currentWeight, onUpdate }: WeightGoalModalProps) {
  const { user } = useAppStore()
  const [weightStart, setWeightStart] = useState('')
  const [targetWeight, setTargetWeight] = useState('')
  const [weightDeadline, setWeightDeadline] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (open && user?.id) {
      loadData()
    }
  }, [open, user?.id])

  const loadData = async () => {
    if (!user?.id) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/weight/goal?userId=${user.id}`)
      const data = await res.json()
      
      if (data.goal) {
        setWeightStart(data.goal.weightStart?.toString() || '')
        setTargetWeight(data.goal.targetWeight?.toString() || '')
        setWeightDeadline(data.goal.weightDeadline ? data.goal.weightDeadline.split('T')[0] : '')
      }
    } catch (error) {
      showErrorToast(error, 'load goal')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user?.id) return
    setIsSaving(true)
    try {
      const body: Record<string, unknown> = { userId: user.id }
      
      if (weightStart) body.weightStart = parseFloat(weightStart)
      if (targetWeight) body.targetWeight = parseFloat(targetWeight)
      if (weightDeadline) body.weightDeadline = weightDeadline
      if (!weightStart && !targetWeight) {
        showErrorToast(new Error('Укажите хотя бы старт или цель'), 'save goal')
        setIsSaving(false)
        return
      }

      await fetch('/api/weight/goal', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      
      showSuccessToast('Цель сохранена')
      onUpdate()
      onOpenChange(false)
    } catch (error) {
      showErrorToast(error, 'save goal')
    } finally {
      setIsSaving(false)
    }
  }

  // Calculate forecast
  const calculateForecast = () => {
    const start = parseFloat(weightStart)
    const target = parseFloat(targetWeight)
    const current = currentWeight
    
    if (!start || !target) return null

    const totalToLose = start - target
    const currentLost = current ? start - current : 0
    const remainingToLose = current ? current - target : totalToLose
    const progress = current ? (currentLost / totalToLose) * 100 : 0

    // If deadline set, calculate required rate
    let requiredRate: number | null = null
    if (weightDeadline && current) {
      const deadline = new Date(weightDeadline)
      const today = new Date()
      const daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      if (daysLeft > 0 && remainingToLose > 0) {
        requiredRate = remainingToLose / (daysLeft / 7) // kg per week
      }
    }

    return {
      totalToLose,
      currentLost,
      remainingToLose,
      progress,
      requiredRate
    }
  }

  const forecast = calculateForecast()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Целевой вес
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 pt-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <div className="space-y-4 pt-4">
            {/* Start weight */}
            <div className="space-y-2">
              <Label htmlFor="weightStart">Стартовый вес (кг)</Label>
              <Input
                id="weightStart"
                type="number"
                step="0.1"
                placeholder="75.0"
                value={weightStart}
                onChange={(e) => setWeightStart(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Вес, с которого вы начали отслеживание
              </p>
            </div>

            {/* Target weight */}
            <div className="space-y-2">
              <Label htmlFor="targetWeight">Целевой вес (кг)</Label>
              <Input
                id="targetWeight"
                type="number"
                step="0.1"
                placeholder="70.0"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
              />
            </div>

            {/* Deadline */}
            <div className="space-y-2">
              <Label htmlFor="weightDeadline" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Дедлайн (опционально)
              </Label>
              <Input
                id="weightDeadline"
                type="date"
                value={weightDeadline}
                onChange={(e) => setWeightDeadline(e.target.value)}
              />
            </div>

            {/* Forecast info */}
            {forecast && currentWeight && (
              <div className="p-3 rounded-lg bg-muted/30 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Info className="w-4 h-4" />
                  Информация
                </div>
                
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Всего похудеть:</span>
                    <span>{forecast.totalToLose.toFixed(1)} кг</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Уже потеряно:</span>
                    <span className="text-emerald-400">{forecast.currentLost.toFixed(1)} кг</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Осталось:</span>
                    <span>{forecast.remainingToLose.toFixed(1)} кг</span>
                  </div>
                  
                  {forecast.requiredRate && (
                    <div className="pt-2 mt-2 border-t border-border/50">
                      <p className="text-muted-foreground">
                        Для достижения цели к дедлайну нужно терять{' '}
                        <span className="text-primary font-medium">
                          {forecast.requiredRate.toFixed(2)} кг/неделю
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                Отмена
              </Button>
              <Button
                className="flex-1 bg-primary"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
