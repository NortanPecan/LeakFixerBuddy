"use client";

import { GymProvider, useGymContext } from "@/features/gym/GymContext";
import { GymWizardDialogs } from "@/features/gym/components/GymWizardDialogs";
import { GymExerciseLibraryDialog } from "@/features/gym/components/GymExerciseLibraryDialog";
import { GymWorkoutDetailDialog } from "@/features/gym/components/GymWorkoutDetailDialog";
import { GymPostWorkoutDialog } from "@/features/gym/components/GymPostWorkoutDialog";
import { GymQuickCompleteDialog } from "@/features/gym/components/GymQuickCompleteDialog";
import { AddWorkoutDialog } from "@/features/gym/components/AddWorkoutDialog";
import { CompletionPreviewDialog } from "@/features/gym/components/CompletionPreviewDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dumbbell,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Play,
  CheckCircle2,
  Target,
  Trophy,
  Clock,
  X,
  Trash2,
  Edit3,
  GripVertical,
  Coffee,
  CalendarDays,
  Save,
  Repeat,
  Shuffle,
} from "lucide-react";
import {
  MUSCLE_GROUPS,
  WEEKDAYS,
  type DayScheduleItem,
  type GymWorkout,
  type GymPeriod,
} from "@/features/gym";

function GymScreenContent() {
  const {
    user,
    periods,
    setPeriods,
    activePeriod,
    setActivePeriod,
    workouts,
    setWorkouts,
    currentMonth,
    setCurrentMonth,
    isLoading,
    showPeriodList,
    setShowPeriodList,
    todayData,
    isLoadingToday,
    showWizard,
    setShowWizard,
    wizardStep,
    setWizardStep,
    wizardConfig,
    setWizardConfig,
    workoutDays,
    setWorkoutDays,
    daySchedule,
    setDaySchedule,
    selectedTemplate,
    draggedIndex,
    dragOverIndex,
    wizardExercises,
    setWizardExercises,
    showWizardExercisePicker,
    setShowWizardExercisePicker,
    selectedWorkoutNumForExercise,
    setSelectedWorkoutNumForExercise,
    showExerciseLibraryDialog,
    setShowExerciseLibraryDialog,
    editingTemplate,
    setEditingTemplate,
    libraryMuscleFilter,
    setLibraryMuscleFilter,
    parsedDaySchedule,
    setParsedDaySchedule,
    selectedWorkout,
    setSelectedWorkout,
    showWorkoutDetail,
    setShowWorkoutDetail,
    editingExercise,
    setEditingExercise,
    showExerciseEditor,
    setShowExerciseEditor,
    newExerciseName,
    setNewExerciseName,
    newExerciseMuscle,
    setNewExerciseMuscle,
    scheduleEdited,
    showSkipDialog,
    setShowSkipDialog,
    showRescheduleDialog,
    setShowRescheduleDialog,
    rescheduleMode,
    setRescheduleMode,
    rescheduleDate,
    setRescheduleDate,
    showReschedule,
    setShowReschedule,
    showAddWorkoutDialog,
    setShowAddWorkoutDialog,
    selectedDate,
    setSelectedDate,
    newWorkoutName,
    setNewWorkoutName,
    newWorkoutMuscles,
    setNewWorkoutMuscles,
    showPostWorkoutDialog,
    setShowPostWorkoutDialog,
    exerciseRatings,
    setExerciseRatings,
    editingActivities,
    setEditingActivities,
    showExerciseCardDialog,
    setShowExerciseCardDialog,
    selectedExerciseCard,
    exerciseHistory,
    isLoadingHistory,
    newActivityType,
    setNewActivityType,
    newActivityValue,
    setNewActivityValue,
    savingSets,
    showTemplateSelectDialog,
    setShowTemplateSelectDialog,
    templates,
    isLoadingTemplates,
    showQuickCompleteDialog,
    setShowQuickCompleteDialog,
    quickCompleteNextWeights,
    setQuickCompleteNextWeights,
    workoutNote,
    setWorkoutNote,
    showCompletionPreview,
    setShowCompletionPreview,
    completionData,
    scheduleDraggedIdx,
    scheduleDragOverIdx,
    calendarDays,
    periodProgress,
    nextWorkout,
    completedWorkouts,
    calendarPreview,
    loadPeriods,
    loadTodayData,
    applyTemplate,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleScheduleDragStart,
    handleScheduleDragOver,
    handleScheduleDragEnd,
    handleSaveSchedule,
    handleSkipWorkout,
    handleRescheduleWorkout,
    handleAddWorkoutToDate,
    handleCreatePeriod,
    resetWizard,
    handleCompleteWorkout,
    openQuickCompleteDialog,
    getUnfilledSetsInfo,
    handleAutoFillSets,
    handleConfirmQuickComplete,
    handleUndoComplete,
    finalizeWorkout,
    loadWorkoutDetails,
    loadExerciseHistory,
    loadTemplates,
    openExerciseCard,
    handleAddFromTemplate,
    handleAddExercise,
    handleAddSet,
    handleUpdateSet,
    handleDeleteSet,
    handleSaveAdditionalActivities,
    handleDeleteExercise,
    handleToggleIncludeInFutureCycles,
    toggleDayType,
  } = useGymContext();
  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold">GYM</h1>
          <p className="text-muted-foreground text-sm">
            {activePeriod ? activePeriod.name : "Нет активного периода"}
          </p>
        </div>
        {activePeriod && !showPeriodList ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setShowPeriodList(true);
            }}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />К периодам
          </Button>
        ) : (
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90"
            onClick={() => {
              resetWizard();
              setShowWizard(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            Новый период
          </Button>
        )}
      </div>

      {isLoading ? (
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="text-muted-foreground pt-6 text-center">Загрузка...</CardContent>
        </Card>
      ) : showPeriodList ? (
        // Show period list
        <Card className="bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg">Периоды</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {periods.map((period) => (
              <div
                key={period.id}
                className={`flex cursor-pointer items-center justify-between rounded-lg p-3 transition-colors ${
                  period.isActive
                    ? "bg-primary/10 border-primary/30 border"
                    : "bg-muted/30 hover:bg-muted/50"
                }`}
              >
                <div
                  className="flex flex-1 items-center gap-3"
                  onClick={() => {
                    setActivePeriod(period);
                    setShowPeriodList(false);
                  }}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      period.isActive
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Dumbbell className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">{period.name}</p>
                    <p className="text-muted-foreground text-sm">
                      Цикл {period.currentCycle} из {period.totalCycles} • {period.type}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {period.isActive && (
                    <Badge className="bg-primary text-primary-foreground text-xs">Активен</Badge>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (confirm(`Удалить период "${period.name}"? Все данные будут потеряны.`)) {
                        try {
                          const response = await fetch(`/api/gym?periodId=${period.id}`, {
                            method: "DELETE",
                          });
                          if (response.ok) {
                            setPeriods((prev) => prev.filter((p) => p.id !== period.id));
                            if (activePeriod?.id === period.id) {
                              setActivePeriod(periods.find((p) => p.id !== period.id) || null);
                            }
                          }
                        } catch (error) {
                          console.error("Failed to delete period:", error);
                        }
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {periods.length === 0 && (
              <p className="text-muted-foreground py-4 text-center">Нет периодов</p>
            )}
            <Button
              className="mt-2 w-full"
              variant="outline"
              onClick={() => {
                resetWizard();
                setShowWizard(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Новый период
            </Button>
          </CardContent>
        </Card>
      ) : !activePeriod ? (
        <Card className="bg-card/50 border-dashed backdrop-blur">
          <CardContent className="pt-6 text-center">
            <Dumbbell className="text-muted-foreground/50 mx-auto mb-3 h-12 w-12" />
            <p className="text-muted-foreground mb-4">Нет тренировочных периодов</p>
            <Button
              onClick={() => {
                resetWizard();
                setShowWizard(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Создать период
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* GYM Today Block (v1.3 UX-polish) */}
          {todayData?.hasActivePeriod && (
            <Card className="from-primary/10 to-primary/5 border-primary/20 bg-gradient-to-r">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Dumbbell className="text-primary h-5 w-5" />
                    GYM сегодня
                  </CardTitle>
                  {todayData.period && (
                    <Badge className="bg-primary/20 text-primary">
                      Цикл {todayData.period.currentCycle}/{todayData.period.totalCycles}
                    </Badge>
                  )}
                </div>
                {/* v1.3 UX: Date and period context */}
                <div className="mt-1">
                  <p className="text-sm font-medium">
                    {new Date().toLocaleDateString("ru-RU", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                    {" — "}
                    Период «{todayData.period?.name || "Тренировки"}»
                  </p>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {todayData.todayWorkout ? (
                  <>
                    {/* v1.3 UX: Day subtitle + v1.4 status */}
                    <div className="border-border/30 mb-3 border-b pb-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">
                          День {todayData.todayWorkout.workoutNum || 1}:{" "}
                          {todayData.todayWorkout.template?.name ||
                            todayData.todayWorkout.name ||
                            "Тренировка"}
                        </p>
                        {/* v1.4: Status badge */}
                        <Badge
                          className={
                            todayData.todayWorkout.status === "completed"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : todayData.todayWorkout.status === "in_progress"
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-muted text-muted-foreground"
                          }
                        >
                          {todayData.todayWorkout.status === "completed"
                            ? "Завершена"
                            : todayData.todayWorkout.status === "in_progress"
                              ? "В процессе"
                              : "Запланирована"}
                        </Badge>
                      </div>
                      {(todayData.todayWorkout.template?.muscleGroups?.length ||
                        todayData.todayWorkout.muscleGroups?.length ||
                        0) > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {(
                            todayData.todayWorkout.template?.muscleGroups ||
                            todayData.todayWorkout.muscleGroups ||
                            []
                          ).map((m: string) => {
                            const group = MUSCLE_GROUPS.find((g) => g.value === m);
                            return (
                              <Badge
                                key={m}
                                className={`px-1.5 py-0 text-[10px] ${group?.color || "bg-muted"}`}
                              >
                                {group?.label || m}
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      {(() => {
                        // v1.7: Define workout completion status for use in exercises map
                        const isWorkoutCompleted = todayData.todayWorkout?.status === "completed";

                        return todayData.todayWorkout.exercises
                          ?.sort((a, b) => a.order - b.order)
                          .map((ex, idx) => {
                            // v1.7: Dynamic weight/reps/sets from first working set
                            const workingSets =
                              ex.sets?.filter((s: { isWarmup?: boolean }) => !s.isWarmup) || [];
                            const firstWorkingSet = workingSets[0];
                            const weight =
                              firstWorkingSet?.weight || ex.weight || ex.template?.currentWeight;
                            const targetReps =
                              firstWorkingSet?.reps || ex.targetReps || ex.template?.defaultReps;
                            const targetSets =
                              workingSets.length || ex.targetSets || ex.template?.defaultSets || 4;
                            const nextWt = ex.nextWeight || ex.template?.nextWeight;

                            // v1.6: Technique notes split by comma, each on new line
                            const techNote = ex.techniqueNotes || ex.template?.techniqueNotes;
                            const techNoteLines = techNote
                              ? techNote
                                  .split(",")
                                  .map((s) => s.trim())
                                  .filter(Boolean)
                              : [];
                            const cycleNote = ex.cycleNote || ex.lastCycleNote;
                            const cycleNoteLines = cycleNote
                              ? cycleNote
                                  .split(",")
                                  .map((s) => s.trim())
                                  .filter(Boolean)
                              : [];

                            return (
                              <div
                                key={ex.id}
                                className="border-border/30 border-b py-2 last:border-0"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex flex-1 items-center gap-2">
                                    <span className="text-muted-foreground w-5 text-xs">
                                      {idx + 1}.
                                    </span>
                                    <span className="text-sm font-medium">{ex.name}</span>
                                  </div>
                                  <div className="text-right font-mono text-sm">
                                    {/* v1.7: Compact format: weight × reps × sets */}
                                    {weight && targetReps && targetSets && (
                                      <span className="text-primary">
                                        {weight}×{targetReps}×{targetSets}
                                      </span>
                                    )}
                                    {/* v1.7: Show next weight only after workout is completed */}
                                    {nextWt && isWorkoutCompleted && (
                                      <span
                                        className="text-muted-foreground hover:text-primary ml-1 cursor-pointer text-xs transition-colors"
                                        onClick={() => {
                                          const newWeight = prompt(
                                            "Новый вес на след. раз:",
                                            String(nextWt)
                                          );
                                          if (newWeight && !isNaN(parseFloat(newWeight))) {
                                            fetch("/api/gym/today", {
                                              method: "PATCH",
                                              headers: { "Content-Type": "application/json" },
                                              body: JSON.stringify({
                                                exerciseId: ex.id,
                                                nextWeight: parseFloat(newWeight),
                                              }),
                                            }).then(() => loadTodayData());
                                          }
                                        }}
                                        title="Клик чтобы изменить"
                                      >
                                        → {nextWt} в след. раз
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* v1.7: Show technique notes only for non-completed workouts */}
                                {!isWorkoutCompleted && techNoteLines.length > 0 && (
                                  <div className="mt-1 ml-7 space-y-0.5">
                                    {techNoteLines.map((line, lineIdx) => (
                                      <div key={lineIdx} className="flex items-start gap-1.5">
                                        <span className="text-xs">💡</span>
                                        <span className="text-muted-foreground text-xs">
                                          {line}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* v1.7: Show cycle notes only for non-completed workouts (old notes from previous cycle) */}
                                {!isWorkoutCompleted && cycleNoteLines.length > 0 && (
                                  <div className="mt-0.5 ml-7 space-y-0.5">
                                    {cycleNoteLines.map((line, lineIdx) => (
                                      <div key={lineIdx} className="flex items-start gap-1.5">
                                        <span className="text-xs">📝</span>
                                        <span className="text-xs text-yellow-600 dark:text-yellow-400">
                                          {line}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          });
                      })()}
                    </div>

                    {/* v1.7: Show workout notes for completed workouts */}
                    {todayData.todayWorkout?.status === "completed" &&
                      todayData.todayWorkout.exercises?.[0]?.cycleNote && (
                        <div className="border-border/30 mt-3 border-t pt-3">
                          <p className="text-muted-foreground mb-1 text-xs">
                            📝 Заметки на следующий цикл:
                          </p>
                          <p className="text-sm">{todayData.todayWorkout.exercises[0].cycleNote}</p>
                        </div>
                      )}

                    {/* v1.7: Format legend for non-completed only */}
                    {todayData.todayWorkout?.status !== "completed" && (
                      <div className="border-border/30 mt-3 border-t pt-2">
                        <p className="text-muted-foreground text-xs">
                          Формат: вес × повторы × подходы → вес в след. раз
                        </p>
                      </div>
                    )}

                    {/* v1.4: Quick actions */}
                    <div className="mt-3 flex gap-2">
                      {/* Quick complete - only for planned workouts */}
                      {todayData.todayWorkout.status === "planned" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                          onClick={() => {
                            if (todayData.todayWorkout) {
                              // Open workout detail - user can click "Всё по плану" there
                              loadWorkoutDetails({
                                id: todayData.todayWorkout.id,
                                date: new Date().toISOString(),
                                dayOfWeek: new Date().getDay() || 7,
                                workoutNum: todayData.todayWorkout.workoutNum || 1,
                                name: todayData.todayWorkout.name,
                                muscleGroups: todayData.todayWorkout.muscleGroups,
                                duration: null,
                                completed: todayData.todayWorkout.completed,
                                status: todayData.todayWorkout.status,
                                exercises: [],
                              } as GymWorkout);
                            }
                          }}
                        >
                          <CheckCircle2 className="mr-1 h-4 w-4" />
                          Всё по плану
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary/90 flex-1"
                        onClick={() => {
                          if (todayData.todayWorkout) {
                            loadWorkoutDetails({
                              id: todayData.todayWorkout.id,
                              date: new Date().toISOString(),
                              dayOfWeek: new Date().getDay() || 7,
                              workoutNum: todayData.todayWorkout.workoutNum || 1,
                              name: todayData.todayWorkout.name,
                              muscleGroups: todayData.todayWorkout.muscleGroups,
                              duration: null,
                              completed: todayData.todayWorkout.completed,
                              status: todayData.todayWorkout.status,
                              exercises: [], // Will be loaded from API
                            } as GymWorkout);
                          }
                        }}
                      >
                        <Play className="mr-1 h-4 w-4" />
                        {todayData.todayWorkout.status === "in_progress" ? "Продолжить" : "Открыть"}
                      </Button>
                    </div>
                  </>
                ) : (
                  /* v1.3 UX: Empty state when no workout today */
                  <div className="py-6 text-center">
                    <Coffee className="text-muted-foreground/50 mx-auto mb-2 h-10 w-10" />
                    <p className="text-muted-foreground">Сегодня тренировки не запланировано</p>
                    <p className="text-muted-foreground/70 mt-1 text-xs">
                      Можно отдохнуть или добавить активность вручную
                    </p>
                    {todayData.nextWorkout && (
                      <div className="border-border/30 mt-3 border-t pt-3">
                        <p className="text-muted-foreground mb-1 text-xs">Следующая тренировка:</p>
                        <p className="text-sm font-medium">
                          {todayData.nextWorkout.name ||
                            `Тренировка ${todayData.nextWorkout.workoutNum}`}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {new Date(todayData.nextWorkout.date).toLocaleDateString("ru-RU", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Period stats */}
          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="pt-4">
              {/* Period dates */}
              <div className="mb-3 flex items-center justify-between">
                <div className="text-muted-foreground text-xs">
                  <span>
                    Начало:{" "}
                    {new Date(activePeriod.startDate).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <span className="mx-2">•</span>
                  <span>
                    Циклов: {Math.min(activePeriod.currentCycle - 1, activePeriod.totalCycles)} из{" "}
                    {activePeriod.totalCycles}
                  </span>
                </div>
                <Badge variant="outline" className="text-primary border-primary/30 text-xs">
                  {activePeriod.type}
                </Badge>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <Target className="mx-auto mb-1 h-5 w-5 text-emerald-400" />
                  <p className="text-primary text-xl font-bold">{activePeriod.currentCycle}</p>
                  <p className="text-muted-foreground text-xs">Тек. цикл</p>
                </div>
                <div className="text-center">
                  <CheckCircle2 className="mx-auto mb-1 h-5 w-5 text-green-400" />
                  <p className="text-primary text-xl font-bold">{completedWorkouts}</p>
                  <p className="text-muted-foreground text-xs">Тренировок</p>
                </div>
                <div className="text-center">
                  <Trophy className="mx-auto mb-1 h-5 w-5 text-yellow-400" />
                  <p className="text-primary text-xl font-bold">{Math.round(periodProgress)}%</p>
                  <p className="text-muted-foreground text-xs">Прогресс</p>
                </div>
              </div>

              {/* Key workout days */}
              {parsedDaySchedule.filter((d) => d.type === "workout").length > 0 && (
                <div className="border-border/50 mt-3 border-t pt-3">
                  <p className="text-muted-foreground mb-2 text-xs">Ключевые дни:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {parsedDaySchedule
                      .filter((d) => d.type === "workout")
                      .slice(0, 4)
                      .map((day, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {day.name || `День ${day.workoutNum}`}
                          {day.muscleGroups && day.muscleGroups.length > 0 && (
                            <span className="text-muted-foreground ml-1">
                              (
                              {day.muscleGroups
                                .map((m) => MUSCLE_GROUPS.find((g) => g.value === m)?.label)
                                .join("+")}
                              )
                            </span>
                          )}
                        </Badge>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Period progress */}
          <Card className="bg-card/50 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Прогресс периода</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={periodProgress} className="h-2" />
              <div className="text-muted-foreground mt-2 flex justify-between text-xs">
                <span>{completedWorkouts} выполнено</span>
                <span>
                  {activePeriod.totalCycles * activePeriod.workoutsPerCycle - completedWorkouts}{" "}
                  осталось
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Day Schedule - Days and Muscles */}
          {parsedDaySchedule.length > 0 && (
            <Card className="bg-card/50 backdrop-blur">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarDays className="h-5 w-5" />
                  Дни и мышцы
                </CardTitle>
                <p className="text-muted-foreground mt-1 text-xs">Перетащи для изменения порядка</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {parsedDaySchedule.map((day, idx) => {
                    const isWorkout = day.type === "workout";
                    const isToday = activePeriod.currentDay === idx + 1;

                    return (
                      <div
                        key={idx}
                        draggable
                        onDragStart={() => handleScheduleDragStart(idx)}
                        onDragOver={(e) => handleScheduleDragOver(e, idx)}
                        onDragEnd={handleScheduleDragEnd}
                        className={`flex cursor-grab items-center gap-3 rounded-xl p-3 transition-all active:cursor-grabbing ${
                          isToday
                            ? "bg-primary/10 border-primary/30 border"
                            : isWorkout
                              ? "bg-muted/30 hover:bg-muted/50"
                              : "bg-muted/10 hover:bg-muted/20"
                        } ${
                          scheduleDragOverIdx === idx && scheduleDraggedIdx !== idx
                            ? "ring-primary/50 ring-2"
                            : ""
                        }`}
                      >
                        <GripVertical className="text-muted-foreground/50 h-4 w-4" />

                        <div className="flex flex-1 items-center gap-3">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium ${
                              isWorkout
                                ? "bg-primary/20 text-primary"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {idx + 1}
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {isWorkout ? (
                                <>
                                  <Dumbbell className="text-primary h-4 w-4" />
                                  <span className="font-medium">
                                    {day.name || `Тренировка ${day.workoutNum}`}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Coffee className="text-muted-foreground h-4 w-4" />
                                  <span className="text-muted-foreground">Отдых</span>
                                </>
                              )}
                              {isToday && (
                                <Badge className="bg-primary text-primary-foreground text-[10px]">
                                  Сегодня
                                </Badge>
                              )}
                            </div>

                            {isWorkout &&
                              day.muscleGroups &&
                              Array.isArray(day.muscleGroups) &&
                              day.muscleGroups.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {day.muscleGroups.map((muscle) => {
                                    const group = MUSCLE_GROUPS.find((g) => g.value === muscle);
                                    return (
                                      <Badge
                                        key={muscle}
                                        className={`px-1.5 py-0 text-[10px] ${group?.color || "bg-muted"}`}
                                      >
                                        {group?.label || muscle}
                                      </Badge>
                                    );
                                  })}
                                </div>
                              )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {scheduleEdited && (
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-primary mt-3 w-full"
                    onClick={handleSaveSchedule}
                  >
                    <Save className="mr-1 h-3 w-3" />
                    Сохранить изменения
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Next workout */}
          {nextWorkout && (
            <Card className="from-primary/10 to-primary/5 border-primary/20 bg-gradient-to-r">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/20 flex h-12 w-12 items-center justify-center rounded-xl">
                      <Dumbbell className="text-primary h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {nextWorkout.name || `Тренировка ${nextWorkout.workoutNum}`}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {new Date(nextWorkout.date).toLocaleDateString("ru-RU", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                      {nextWorkout.muscleGroups &&
                        Array.isArray(nextWorkout.muscleGroups) &&
                        nextWorkout.muscleGroups.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {nextWorkout.muscleGroups.map((muscle) => {
                              const group = MUSCLE_GROUPS.find((g) => g.value === muscle);
                              return (
                                <Badge
                                  key={muscle}
                                  className={`px-1.5 py-0 text-[10px] ${group?.color || "bg-muted"}`}
                                >
                                  {group?.label || muscle}
                                </Badge>
                              );
                            })}
                          </div>
                        )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90"
                    onClick={() => loadWorkoutDetails(nextWorkout)}
                  >
                    <Play className="mr-1 h-4 w-4" />
                    Открыть
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Calendar */}
          <Card className="bg-card/50 backdrop-blur">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-5 w-5" />
                  Календарь
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))
                    }
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[100px] text-center text-sm font-medium">
                    {currentMonth.toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))
                    }
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-1 grid grid-cols-7 gap-1">
                {WEEKDAYS.map((day) => (
                  <div
                    key={day}
                    className="text-muted-foreground py-1 text-center text-xs font-medium"
                  >
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, i) => (
                  <div
                    key={i}
                    className={`relative flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg text-sm transition-colors ${
                      day === null
                        ? ""
                        : day.workout?.completed
                          ? "bg-emerald-500/20 text-emerald-400"
                          : day.workout
                            ? "bg-primary/10 text-primary hover:bg-primary/20"
                            : new Date().toDateString() === day.date.toDateString()
                              ? "bg-muted border-primary/30 border"
                              : "hover:bg-muted/50"
                    }`}
                    onClick={() => {
                      if (day?.workout) {
                        loadWorkoutDetails(day.workout);
                      } else if (day) {
                        // Open add workout dialog for empty day
                        setSelectedDate(day.date);
                        setNewWorkoutName(`Тренировка ${workouts.length + 1}`);
                        setNewWorkoutMuscles([]);
                        setShowAddWorkoutDialog(true);
                      }
                    }}
                  >
                    {day && (
                      <>
                        <span>{day.dayNum}</span>
                        {day.workout && (
                          <div
                            className={`mt-0.5 h-1.5 w-1.5 rounded-full ${
                              day.workout.completed ? "bg-emerald-400" : "bg-primary"
                            }`}
                          />
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div className="text-muted-foreground mt-3 flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="bg-primary h-2 w-2 rounded-full" />
                  <span>Запланировано</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span>Выполнено</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent workouts */}
          <Card className="bg-card/50 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Последние тренировки</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {workouts
                .filter((w) => w.completed)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 5)
                .map((workout) => (
                  <div
                    key={workout.id}
                    className="bg-muted/30 hover:bg-muted/50 flex cursor-pointer items-center justify-between rounded-lg p-3 transition-colors"
                    onClick={() => loadWorkoutDetails(workout)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {workout.name || `Тренировка ${workout.workoutNum}`}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          {new Date(workout.date).toLocaleDateString("ru-RU", {
                            weekday: "short",
                            day: "numeric",
                          })}
                          {workout.duration && ` • ${workout.duration} мин`}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="text-muted-foreground h-4 w-4" />
                  </div>
                ))}
              {workouts.filter((w) => w.completed).length === 0 && (
                <p className="text-muted-foreground py-4 text-center">Нет выполненных тренировок</p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Wizard + Exercise Picker Dialogs */}
      <GymWizardDialogs />

      {/* Exercise Library Dialog */}
      <GymExerciseLibraryDialog />

      {/* Workout Detail Dialog */}
      <GymWorkoutDetailDialog />

      {/* Post-Workout Dialog */}
      <GymPostWorkoutDialog />

      {/* Quick Complete Dialog */}
      <GymQuickCompleteDialog />

      {/* Add Workout Dialog */}
      <AddWorkoutDialog />

      {/* Completion Preview Dialog */}
      <CompletionPreviewDialog />
    </div>
  );
}

export function GymScreen() {
  return (
    <GymProvider>
      <GymScreenContent />
    </GymProvider>
  );
}
