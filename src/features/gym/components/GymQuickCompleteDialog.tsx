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
import { CheckCircle2, Weight } from 'lucide-react'

export function GymQuickCompleteDialog() {
  const {
    selectedWorkout,
    showQuickCompleteDialog, setShowQuickCompleteDialog,
    quickCompleteNextWeights, setQuickCompleteNextWeights,
    workoutNote, setWorkoutNote,
    getUnfilledSetsInfo,
    handleAutoFillSets,
    handleConfirmQuickComplete,
  } = useGymContext()

  return (
    <Dialog open={showQuickCompleteDialog} onOpenChange={setShowQuickCompleteDialog}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            Завершить тренировку
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Unfilled sets warning */}
          {getUnfilledSetsInfo().length > 0 && (
            <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 space-y-2">
              <p className="text-sm font-medium text-orange-400">
                Незаполненные подходы ({getUnfilledSetsInfo().length}):
              </p>
              <div className="text-xs text-muted-foreground space-y-0.5">
                {getUnfilledSetsInfo().slice(0, 5).map((s, i) => (
                  <div key={i}>• {s.exerciseName}, подход {s.setNum}</div>
                ))}
                {getUnfilledSetsInfo().length > 5 && (
                  <div>... и ещё {getUnfilledSetsInfo().length - 5}</div>
                )}
              </div>
              <Button size="sm" variant="outline" className="w-full" onClick={handleAutoFillSets}>
                <Weight className="w-3 h-3 mr-1" />
                Заполнить автоматически
              </Button>
            </div>
          )}

          {/* Next weights configuration */}
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground">
              План на следующий раз
            </Label>
            {selectedWorkout?.exercises?.map(exercise => {
              const workingSets = exercise.sets?.filter(s => !s.isWarmup) || []
              const firstWorkingSet = workingSets[0]
              const currentWeight = firstWorkingSet?.weight || exercise.template?.currentWeight || exercise.weight || 0
              const currentReps = firstWorkingSet?.reps || exercise.targetReps || exercise.template?.defaultReps || 10
              const currentSets = workingSets.length || exercise.targetSets || exercise.template?.defaultSets || 4
              const nextConfig = quickCompleteNextWeights[exercise.id] || { weight: currentWeight, reps: currentReps, sets: currentSets }

              return (
                <div key={exercise.id} className="p-3 rounded-xl bg-muted/30 space-y-2">
                  <div className="font-medium text-sm">{exercise.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Сейчас: {currentWeight} кг × {currentReps} повт × {currentSets} подх
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">В след. раз:</span>
                    <Input
                      type="number"
                      className="w-16 h-8 text-sm"
                      value={nextConfig.weight || ''}
                      onChange={e => {
                        const newWeight = parseFloat(e.target.value) || currentWeight
                        setQuickCompleteNextWeights(prev => ({
                          ...prev,
                          [exercise.id]: { ...prev[exercise.id], weight: newWeight },
                        }))
                      }}
                    />
                    <span className="text-xs">кг ×</span>
                    <Input
                      type="number"
                      className="w-14 h-8 text-sm"
                      value={nextConfig.reps || ''}
                      onChange={e => {
                        const newReps = parseInt(e.target.value) || currentReps
                        setQuickCompleteNextWeights(prev => ({
                          ...prev,
                          [exercise.id]: { ...prev[exercise.id], reps: newReps },
                        }))
                      }}
                    />
                    <span className="text-xs">повт ×</span>
                    <Input
                      type="number"
                      className="w-14 h-8 text-sm"
                      value={nextConfig.sets || ''}
                      onChange={e => {
                        const newSets = parseInt(e.target.value) || currentSets
                        setQuickCompleteNextWeights(prev => ({
                          ...prev,
                          [exercise.id]: { ...prev[exercise.id], sets: newSets },
                        }))
                      }}
                    />
                    <span className="text-xs">подх</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Workout note */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Заметка на следующий цикл
            </Label>
            <textarea
              className="w-full p-2 rounded-md border border-input bg-background text-sm resize-none"
              rows={2}
              placeholder="Например: было тяжеловато, снизить вес"
              value={workoutNote}
              onChange={e => setWorkoutNote(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowQuickCompleteDialog(false)}
            >
              Отмена
            </Button>
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              onClick={handleConfirmQuickComplete}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Завершить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
