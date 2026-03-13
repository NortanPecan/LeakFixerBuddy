'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dumbbell } from 'lucide-react'
import { MUSCLE_GROUPS, DayScheduleItem } from '../constants'

interface AddWorkoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate: Date | null
  parsedDaySchedule: DayScheduleItem[]
  onAddWorkout: (name: string, muscles: string[]) => Promise<void>
}

export function AddWorkoutDialog({
  open,
  onOpenChange,
  selectedDate,
  parsedDaySchedule,
  onAddWorkout,
}: AddWorkoutDialogProps) {
  const [workoutName, setWorkoutName] = useState('')
  const [workoutMuscles, setWorkoutMuscles] = useState<string[]>([])
  const [isAdding, setIsAdding] = useState(false)

  const handleClose = (open: boolean) => {
    if (!open) {
      setWorkoutName('')
      setWorkoutMuscles([])
    }
    onOpenChange(open)
  }

  const handleAdd = async () => {
    if (!workoutName) return
    
    setIsAdding(true)
    try {
      await onAddWorkout(workoutName, workoutMuscles)
      handleClose(false)
    } finally {
      setIsAdding(false)
    }
  }

  const toggleMuscle = (muscleValue: string) => {
    setWorkoutMuscles(prev =>
      prev.includes(muscleValue)
        ? prev.filter(m => m !== muscleValue)
        : [...prev, muscleValue]
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Добавить тренировку</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="text-sm text-muted-foreground">
            {selectedDate?.toLocaleDateString('ru-RU', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </div>

          {/* Select from existing workout types */}
          {parsedDaySchedule.filter(d => d.type === 'workout').length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Выбрать из текущего периода
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {parsedDaySchedule
                  .filter(d => d.type === 'workout')
                  .map((day, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      className="justify-start"
                      onClick={() => {
                        setWorkoutName(day.name || `Тренировка ${day.workoutNum}`)
                        setWorkoutMuscles(day.muscleGroups || [])
                      }}
                    >
                      <Dumbbell className="w-3 h-3 mr-2" />
                      {day.name || `Тренировка ${day.workoutNum}`}
                    </Button>
                  ))}
              </div>
            </div>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                или создать свою
              </span>
            </div>
          </div>

          {/* Custom workout */}
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Название</Label>
              <Input
                value={workoutName}
                onChange={e => setWorkoutName(e.target.value)}
                placeholder="Например: Грудь + Трицепс"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Группы мышц</Label>
              <div className="flex flex-wrap gap-1">
                {MUSCLE_GROUPS.map(muscle => (
                  <button
                    key={muscle.value}
                    className={`px-2 py-1 rounded-full text-xs transition-colors ${
                      workoutMuscles.includes(muscle.value)
                        ? muscle.color
                        : 'bg-muted text-muted-foreground hover:bg-muted/70'
                    }`}
                    onClick={() => toggleMuscle(muscle.value)}
                  >
                    {muscle.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => handleClose(false)}
              disabled={isAdding}
            >
              Отмена
            </Button>
            <Button
              className="flex-1 bg-primary"
              onClick={handleAdd}
              disabled={!workoutName || isAdding}
            >
              {isAdding ? 'Добавление...' : 'Добавить'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
