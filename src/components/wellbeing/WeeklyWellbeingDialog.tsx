"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Calendar, AlertCircle } from "lucide-react";
import { WellbeingQuestion, PresetLevel, getQuestionsForPreset } from "@/lib/wellbeing-config";
import {
  getISOWeekDates,
  countAnsweredQuestions,
  getWeeklyQuestionsCount,
} from "@/lib/wellbeing-utils";

interface QuestionWithAnswer extends WellbeingQuestion {
  currentValue: number;
}

interface WeeklyWellbeingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preset: PresetLevel;
  year: number;
  week: number;
  existingAnswers?: Record<string, number>;
  onComplete?: () => void;
}

export function WeeklyWellbeingDialog({
  open,
  onOpenChange,
  preset,
  year,
  week,
  existingAnswers = {},
  onComplete,
}: WeeklyWellbeingDialogProps) {
  const { user } = useAppStore();
  const [questions, setQuestions] = useState<QuestionWithAnswer[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>(existingAnswers);
  const [initialAnswers, setInitialAnswers] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showCloseWarning, setShowCloseWarning] = useState(false);

  const weekDates = getISOWeekDates(year, week);

  // Load questions when dialog opens
  useEffect(() => {
    if (open && preset !== "core") {
      const weeklyQuestions = getQuestionsForPreset(preset, "weekly");
      const initial = existingAnswers || {};
      setQuestions(
        weeklyQuestions.map((q) => ({
          ...q,
          currentValue: initial[q.id] ?? 3,
        }))
      );
      setAnswers(initial);
      setInitialAnswers(JSON.parse(JSON.stringify(initial))); // Deep copy for comparison
      setShowCloseWarning(false);
    }
  }, [open, preset, existingAnswers]);

  const handleAnswerChange = (questionId: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, currentValue: value } : q))
    );
  };

  const handleSave = async () => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/wellbeing/weekly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          year,
          week,
          preset,
          answers,
        }),
      });

      if (!response.ok) throw new Error("Failed to save");

      onComplete?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save weekly wellbeing:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Check if there are unsaved changes
  const hasChanges = useCallback(() => {
    const currentKeys = Object.keys(answers);
    const initialKeys = Object.keys(initialAnswers);

    if (currentKeys.length !== initialKeys.length) return true;

    for (const key of currentKeys) {
      if (answers[key] !== initialAnswers[key]) return true;
    }

    return false;
  }, [answers, initialAnswers]);

  // Handle dialog close with warning
  const handleOpenChange = (open: boolean) => {
    if (!open && hasChanges()) {
      setShowCloseWarning(true);
    } else {
      onOpenChange(false);
    }
  };

  // Confirm close without saving
  const confirmClose = () => {
    setShowCloseWarning(false);
    onOpenChange(false);
  };

  // Save and close
  const saveAndClose = async () => {
    setShowCloseWarning(false);
    await handleSave();
  };

  const answeredCount = countAnsweredQuestions(answers, preset, "weekly");
  const totalQuestions = getWeeklyQuestionsCount(preset);
  const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  // BUG-2 FIX: Allow partial save - only disable if no answers at all
  const canSave = answeredCount > 0;

  if (preset === "core" || questions.length === 0) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-purple-400" />
              Еженедельные вопросы
            </DialogTitle>
            <DialogDescription>
              Неделя {week} (
              {weekDates.start.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} —{" "}
              {weekDates.end.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })})
            </DialogDescription>
          </DialogHeader>

          {/* Progress */}
          <div className="space-y-1">
            <Progress value={progress} className="h-1.5" />
            <div className="text-muted-foreground text-right text-xs">
              {answeredCount}/{totalQuestions}
              {answeredCount < totalQuestions && answeredCount > 0 && (
                <span className="ml-2 text-amber-500">(частично)</span>
              )}
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-4 py-4">
            {questions.map((q) => (
              <div key={q.id} className="bg-muted/30 space-y-2 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {q.category}
                  </Badge>
                </div>
                <p className="text-sm font-medium">{q.question}</p>

                <div className="flex justify-center gap-2 pt-2">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <Button
                      key={val}
                      variant={q.currentValue === val ? "default" : "outline"}
                      size="sm"
                      className={`h-10 w-10 rounded-full ${
                        q.currentValue === val ? "bg-purple-500 text-white hover:bg-purple-600" : ""
                      }`}
                      onClick={() => handleAnswerChange(q.id, val)}
                    >
                      {val}
                    </Button>
                  ))}
                </div>
                <div className="text-muted-foreground flex justify-between px-2 text-xs">
                  <span>{q.labels.low}</span>
                  <span>{q.labels.high}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Save button */}
          <Button className="w-full" onClick={handleSave} disabled={isSaving || !canSave}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                {answeredCount < totalQuestions ? "Сохранить частично" : "Сохранить"}
              </>
            )}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Close Warning Dialog */}
      <Dialog open={showCloseWarning} onOpenChange={setShowCloseWarning}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-500">
              <AlertCircle className="h-5 w-5" />
              Несохранённые ответы
            </DialogTitle>
            <DialogDescription>
              У вас есть незаполненные или несохранённые ответы. Что вы хотите сделать?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-4">
            <Button onClick={saveAndClose} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
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
  );
}
