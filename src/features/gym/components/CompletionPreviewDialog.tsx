"use client";

import { useGymContext } from "@/features/gym/GymContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2 } from "lucide-react";

export function CompletionPreviewDialog() {
  const { showCompletionPreview, setShowCompletionPreview, completionData } = useGymContext();

  return (
    <Dialog open={showCompletionPreview} onOpenChange={setShowCompletionPreview}>
      <DialogContent className="max-h-[90vh] max-w-sm overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
            Тренировка завершена!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Exercises summary */}
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">Итоги тренировки:</Label>
            <div className="space-y-1">
              {completionData.exercises.map((ex, idx) => (
                <div
                  key={idx}
                  className="border-border/30 flex items-center justify-between border-b py-1 text-sm last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-5">{idx + 1}.</span>
                    <span className="font-medium">{ex.name}</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-primary">
                      {ex.weight && ex.reps && ex.sets && `${ex.weight}×${ex.reps}×${ex.sets}`}
                    </span>
                    {ex.nextWeight && ex.nextWeight !== ex.weight && (
                      <span className="text-muted-foreground ml-1 text-xs">
                        → {ex.nextWeight} след.
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Note for next cycle */}
          {completionData.note && (
            <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3">
              <p className="mb-1 text-xs text-yellow-600 dark:text-yellow-400">
                📝 Заметка на следующий цикл:
              </p>
              <p className="text-sm">{completionData.note}</p>
            </div>
          )}

          <Button className="bg-primary w-full" onClick={() => setShowCompletionPreview(false)}>
            Закрыть
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
