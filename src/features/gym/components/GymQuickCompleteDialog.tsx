"use client";

import { useGymContext } from "@/features/gym/GymContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, Weight } from "lucide-react";

export function GymQuickCompleteDialog() {
  const {
    selectedWorkout,
    showQuickCompleteDialog,
    setShowQuickCompleteDialog,
    quickCompleteNextWeights,
    setQuickCompleteNextWeights,
    workoutNote,
    setWorkoutNote,
    getUnfilledSetsInfo,
    handleAutoFillSets,
    handleConfirmQuickComplete,
  } = useGymContext();

  return (
    <Dialog open={showQuickCompleteDialog} onOpenChange={setShowQuickCompleteDialog}>
      <DialogContent className="max-h-[90vh] max-w-sm overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            Завершить тренировку
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Unfilled sets warning */}
          {getUnfilledSetsInfo().length > 0 && (
            <div className="space-y-2 rounded-xl border border-orange-500/20 bg-orange-500/10 p-3">
              <p className="text-sm font-medium text-orange-400">
                Незаполненные подходы ({getUnfilledSetsInfo().length}):
              </p>
              <div className="text-muted-foreground space-y-0.5 text-xs">
                {getUnfilledSetsInfo()
                  .slice(0, 5)
                  .map((s, i) => (
                    <div key={i}>
                      • {s.exerciseName}, подход {s.setNum}
                    </div>
                  ))}
                {getUnfilledSetsInfo().length > 5 && (
                  <div>... и ещё {getUnfilledSetsInfo().length - 5}</div>
                )}
              </div>
              <Button size="sm" variant="outline" className="w-full" onClick={handleAutoFillSets}>
                <Weight className="mr-1 h-3 w-3" />
                Заполнить автоматически
              </Button>
            </div>
          )}

          {/* Next weights configuration */}
          <div className="space-y-3">
            <Label className="text-muted-foreground text-xs">План на следующий раз</Label>
            {selectedWorkout?.exercises?.map((exercise) => {
              const workingSets = exercise.sets?.filter((s) => !s.isWarmup) || [];
              const firstWorkingSet = workingSets[0];
              const currentWeight =
                firstWorkingSet?.weight || exercise.template?.currentWeight || exercise.weight || 0;
              const currentReps =
                firstWorkingSet?.reps ||
                exercise.targetReps ||
                exercise.template?.defaultReps ||
                10;
              const currentSets =
                workingSets.length || exercise.targetSets || exercise.template?.defaultSets || 4;
              const nextConfig = quickCompleteNextWeights[exercise.id] || {
                weight: currentWeight,
                reps: currentReps,
                sets: currentSets,
              };

              return (
                <div key={exercise.id} className="bg-muted/30 space-y-2 rounded-xl p-3">
                  <div className="text-sm font-medium">{exercise.name}</div>
                  <div className="text-muted-foreground text-xs">
                    Сейчас: {currentWeight} кг × {currentReps} повт × {currentSets} подх
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground text-xs">В след. раз:</span>
                    <Input
                      type="number"
                      className="h-8 w-16 text-sm"
                      value={nextConfig.weight || ""}
                      onChange={(e) => {
                        const newWeight = parseFloat(e.target.value) || currentWeight;
                        setQuickCompleteNextWeights((prev) => ({
                          ...prev,
                          [exercise.id]: { ...prev[exercise.id], weight: newWeight },
                        }));
                      }}
                    />
                    <span className="text-xs">кг ×</span>
                    <Input
                      type="number"
                      className="h-8 w-14 text-sm"
                      value={nextConfig.reps || ""}
                      onChange={(e) => {
                        const newReps = parseInt(e.target.value) || currentReps;
                        setQuickCompleteNextWeights((prev) => ({
                          ...prev,
                          [exercise.id]: { ...prev[exercise.id], reps: newReps },
                        }));
                      }}
                    />
                    <span className="text-xs">повт ×</span>
                    <Input
                      type="number"
                      className="h-8 w-14 text-sm"
                      value={nextConfig.sets || ""}
                      onChange={(e) => {
                        const newSets = parseInt(e.target.value) || currentSets;
                        setQuickCompleteNextWeights((prev) => ({
                          ...prev,
                          [exercise.id]: { ...prev[exercise.id], sets: newSets },
                        }));
                      }}
                    />
                    <span className="text-xs">подх</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Workout note */}
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">Заметка на следующий цикл</Label>
            <textarea
              className="border-input bg-background w-full resize-none rounded-md border p-2 text-sm"
              rows={2}
              placeholder="Например: было тяжеловато, снизить вес"
              value={workoutNote}
              onChange={(e) => setWorkoutNote(e.target.value)}
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
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Завершить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
