'use client'

import { useGymContext } from '@/features/gym/GymContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Dumbbell } from 'lucide-react'
import { MUSCLE_GROUPS } from '@/features/gym'

export function AddWorkoutDialog() {
  const {
    showAddWorkoutDialog, setShowAddWorkoutDialog,
    selectedDate, setSelectedDate,
    newWorkoutName, setNewWorkoutName,
    newWorkoutMuscles, setNewWorkoutMuscles,
    parsedDaySchedule,
    handleAddWorkoutToDate,
  } = useGymContext()

  return (
    <Dialog open={showAddWorkoutDialog} onOpenChange={(open) => {
      setShowAddWorkoutDialog(open)
      if (!open) {
        setSelectedDate(null)
        setNewWorkoutName('')
        setNewWorkoutMuscles([])
      }
    }}>
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
              <Label className="text-xs text-muted-foreground">Выбрать из текущего периода</Label>
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
                        setNewWorkoutName(day.name || `Тренировка ${day.workoutNum}`)
                        setNewWorkoutMuscles(day.muscleGroups || [])
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
              <span className="bg-background px-2 text-muted-foreground">или создать свою</span>
            </div>
          </div>

          {/* Custom workout */}
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Название</Label>
              <Input
                value={newWorkoutName}
                onChange={e => setNewWorkoutName(e.target.value)}
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
                      newWorkoutMuscles.includes(muscle.value)
                        ? muscle.color
                        : 'bg-muted text-muted-foreground hover:bg-muted/70'
                    }`}
                    onClick={() => {
                      setNewWorkoutMuscles(prev =>
                        prev.includes(muscle.value)
                          ? prev.filter(m => m !== muscle.value)
                          : [...prev, muscle.value]
                      )
                    }}
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
              onClick={() => setShowAddWorkoutDialog(false)}
            >
              Отмена
            </Button>
            <Button
              className="flex-1 bg-primary"
              onClick={handleAddWorkoutToDate}
              disabled={!newWorkoutName}
            >
              Добавить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
