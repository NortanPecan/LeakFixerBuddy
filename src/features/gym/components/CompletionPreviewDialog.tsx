'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { CheckCircle2 } from 'lucide-react'

export interface CompletionData {
  exercises: Array<{
    name: string
    weight?: number
    reps?: number
    sets?: number
    nextWeight?: number
  }>
  note?: string
}

interface CompletionPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  completionData: CompletionData
}

export function CompletionPreviewDialog({
  open,
  onOpenChange,
  completionData,
}: CompletionPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
            Тренировка завершена!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Exercises summary - compact format */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Итоги тренировки:</Label>
            <div className="space-y-1">
              {completionData.exercises.map((ex, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-sm py-1 border-b border-border/30 last:border-0"
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
                      <span className="text-xs text-muted-foreground ml-1">
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
            <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mb-1">
                📝 Заметка на следующий цикл:
              </p>
              <p className="text-sm">{completionData.note}</p>
            </div>
          )}

          {/* Close button */}
          <Button className="w-full bg-primary" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
