"use client";

import { useGymContext } from "@/features/gym/GymContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit3, CheckCircle2 } from "lucide-react";

export function GymPostWorkoutDialog() {
  const {
    selectedWorkout,
    showPostWorkoutDialog,
    setShowPostWorkoutDialog,
    exerciseRatings,
    setExerciseRatings,
    editingActivities,
    workoutNote,
    setWorkoutNote,
    stretchingDone,
    setStretchingDone,
    finalizeWorkout,
  } = useGymContext();

  return (
    <Dialog
      open={showPostWorkoutDialog}
      onOpenChange={(open) => {
        setShowPostWorkoutDialog(open);
        if (!open) {
          setExerciseRatings({});
        }
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-sm overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="text-primary h-5 w-5" />
            Заметки по тренировке
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Workout note */}
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">
              Заметка по тренировке (покажется в следующем цикле)
            </Label>
            <textarea
              className="border-input bg-background w-full resize-none rounded-md border p-2 text-sm"
              rows={2}
              placeholder="Например: было тяжеловато, снизить вес"
              value={workoutNote}
              onChange={(e) => setWorkoutNote(e.target.value)}
            />
          </div>

          {/* Exercise ratings */}
          <div className="space-y-3">
            <Label className="text-muted-foreground text-xs">
              Оцени сложность каждого упражнения
            </Label>
            {selectedWorkout?.exercises?.map((exercise) => {
              const currentWeight = exercise.sets?.[0]?.weight || exercise.template?.currentWeight;
              const step = exercise.template?.progressionStep || 2.5;
              const rating = exerciseRatings[exercise.id] || "normal";
              let nextWeightPreview = currentWeight;
              if (currentWeight) {
                if (rating === "easy") nextWeightPreview = currentWeight + step;
                else if (rating === "hard") nextWeightPreview = Math.max(0, currentWeight - step);
                else nextWeightPreview = currentWeight;
              }

              return (
                <div key={exercise.id} className="bg-muted/30 space-y-2 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{exercise.name}</span>
                    {currentWeight && (
                      <span className="text-muted-foreground text-xs">{currentWeight} кг</span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={rating === "easy" ? "default" : "outline"}
                      className={`flex-1 text-xs ${rating === "easy" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                      onClick={() =>
                        setExerciseRatings((prev) => ({ ...prev, [exercise.id]: "easy" }))
                      }
                    >
                      😊 Легко
                    </Button>
                    <Button
                      size="sm"
                      variant={rating === "normal" ? "default" : "outline"}
                      className={`flex-1 text-xs ${rating === "normal" ? "bg-yellow-600 hover:bg-yellow-700" : ""}`}
                      onClick={() =>
                        setExerciseRatings((prev) => ({ ...prev, [exercise.id]: "normal" }))
                      }
                    >
                      😐 Норм
                    </Button>
                    <Button
                      size="sm"
                      variant={rating === "hard" ? "default" : "outline"}
                      className={`flex-1 text-xs ${rating === "hard" ? "bg-red-600 hover:bg-red-700" : ""}`}
                      onClick={() =>
                        setExerciseRatings((prev) => ({ ...prev, [exercise.id]: "hard" }))
                      }
                    >
                      😫 Тяжело
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stretching checkbox */}
          <button
            onClick={() => setStretchingDone((prev) => !prev)}
            className={`flex w-full items-center gap-3 rounded-xl border p-3 transition-all ${
              stretchingDone
                ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-400"
                : "border-border bg-muted/20 text-muted-foreground"
            }`}
          >
            <span className="text-xl">{stretchingDone ? "✅" : "🧘"}</span>
            <span className="text-sm font-medium">Растяжка выполнена</span>
            {stretchingDone && (
              <span className="ml-auto text-xs text-emerald-500">+восстановление</span>
            )}
          </button>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowPostWorkoutDialog(false)}
            >
              Отмена
            </Button>
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              onClick={() => {
                if (selectedWorkout) {
                  finalizeWorkout(
                    selectedWorkout.id,
                    exerciseRatings,
                    editingActivities,
                    workoutNote,
                    stretchingDone
                  );
                }
              }}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Сохранить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
