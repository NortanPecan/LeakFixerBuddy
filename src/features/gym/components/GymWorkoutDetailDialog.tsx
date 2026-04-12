"use client";

import { useGymContext } from "@/features/gym/GymContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarClock,
  SkipForward,
  CheckCircle2,
  Plus,
  X,
  Trash2,
  Edit3,
  ArrowRight,
  Sparkles,
  Clock,
  Weight,
} from "lucide-react";
import { MUSCLE_GROUPS, EXERCISE_DATABASE, type AdditionalActivity } from "@/features/gym";

export function GymWorkoutDetailDialog() {
  const {
    activePeriod,
    selectedWorkout,
    setSelectedWorkout,
    showWorkoutDetail,
    setShowWorkoutDetail,
    newExerciseName,
    setNewExerciseName,
    newExerciseMuscle,
    setNewExerciseMuscle,
    showSkipDialog,
    setShowSkipDialog,
    showRescheduleDialog,
    setShowRescheduleDialog,
    rescheduleMode,
    setRescheduleMode,
    rescheduleDate,
    setRescheduleDate,
    newActivityType,
    setNewActivityType,
    newActivityValue,
    setNewActivityValue,
    handleSkipWorkout,
    handleRescheduleWorkout,
    handleCompleteWorkout,
    openQuickCompleteDialog,
    handleUndoComplete,
    handleAddExercise,
    handleAddSet,
    handleUpdateSet,
    handleDeleteSet,
    handleDeleteExercise,
    handleToggleIncludeInFutureCycles,
    handleSaveAdditionalActivities,
    personalRecords,
  } = useGymContext();

  return (
    <Dialog
      open={showWorkoutDetail}
      onOpenChange={(open) => {
        setShowWorkoutDetail(open);
        if (!open) {
          setShowRescheduleDialog(false);
          setShowSkipDialog(false);
          setRescheduleDate("");
          setRescheduleMode("single");
        }
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-sm overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {selectedWorkout?.name || `Тренировка ${selectedWorkout?.workoutNum}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Workout info with status */}
          <div className="flex items-center justify-between text-sm">
            <div>
              <span className="text-muted-foreground">
                {selectedWorkout?.date &&
                  new Date(selectedWorkout.date).toLocaleDateString("ru-RU", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
              </span>
              {activePeriod && (
                <div className="text-muted-foreground mt-0.5 text-xs">
                  {activePeriod.name} • Цикл {activePeriod.currentCycle}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge
                className={
                  selectedWorkout?.completed
                    ? "bg-emerald-500/20 text-emerald-400"
                    : selectedWorkout?.status === "skipped"
                      ? "bg-orange-500/20 text-orange-400"
                      : selectedWorkout?.status === "rescheduled"
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-muted text-muted-foreground"
                }
              >
                {selectedWorkout?.completed
                  ? "Выполнена"
                  : selectedWorkout?.status === "skipped"
                    ? "Пропущена"
                    : selectedWorkout?.status === "rescheduled"
                      ? "Перенесена"
                      : "Запланирована"}
              </Badge>
              {selectedWorkout?.duration && (
                <Badge variant="outline">
                  <Clock className="mr-1 h-3 w-3" />
                  {selectedWorkout.duration} мин
                </Badge>
              )}
            </div>
          </div>

          {/* Muscle groups */}
          {selectedWorkout?.muscleGroups &&
            Array.isArray(selectedWorkout.muscleGroups) &&
            selectedWorkout.muscleGroups.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedWorkout.muscleGroups.map((muscle) => {
                  const group = MUSCLE_GROUPS.find((g) => g.value === muscle);
                  return (
                    <Badge key={muscle} className={group?.color || "bg-muted"}>
                      {group?.label || muscle}
                    </Badge>
                  );
                })}
              </div>
            )}

          {/* Skip/Reschedule buttons */}
          {!showRescheduleDialog && !showSkipDialog && !selectedWorkout?.completed && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  setShowRescheduleDialog(true);
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  setRescheduleDate(tomorrow.toISOString().split("T")[0]);
                }}
              >
                <CalendarClock className="mr-1 h-4 w-4" />
                Перенести
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-orange-400 hover:text-orange-300"
                onClick={() => setShowSkipDialog(true)}
              >
                <SkipForward className="mr-1 h-4 w-4" />
                Пропустить
              </Button>
            </div>
          )}

          {/* Skip workout dialog */}
          {showSkipDialog && (
            <div className="space-y-3 rounded-xl border border-orange-500/20 bg-orange-500/10 p-4">
              <p className="text-sm font-medium">Как пропустить тренировку?</p>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="h-auto w-full justify-start py-3"
                  onClick={() => handleSkipWorkout(false)}
                >
                  <div className="text-left">
                    <div className="font-medium">Сегодня не тренируюсь</div>
                    <div className="text-muted-foreground text-xs">
                      Тренировка останется на этом дне, цикл не сдвигается
                    </div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto w-full justify-start py-3"
                  onClick={() => handleSkipWorkout(true)}
                >
                  <div className="text-left">
                    <div className="font-medium">Пропустить и сдвинуть</div>
                    <div className="text-muted-foreground text-xs">
                      Тренировка переносится в конец периода, остальные сдвигаются
                    </div>
                  </div>
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => setShowSkipDialog(false)}
              >
                Отмена
              </Button>
            </div>
          )}

          {/* Reschedule workout dialog */}
          {showRescheduleDialog && (
            <div className="bg-primary/5 border-primary/20 space-y-3 rounded-xl border p-4">
              <p className="text-sm font-medium">Куда перенести тренировку?</p>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    setRescheduleDate(tomorrow.toISOString().split("T")[0]);
                  }}
                >
                  Завтра
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const date = new Date();
                    date.setDate(date.getDate() + 2);
                    setRescheduleDate(date.toISOString().split("T")[0]);
                  }}
                >
                  Через 2 дня
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const date = new Date();
                    const daysUntilSat = (6 - date.getDay() + 7) % 7 || 7;
                    date.setDate(date.getDate() + daysUntilSat);
                    setRescheduleDate(date.toISOString().split("T")[0]);
                  }}
                >
                  Суббота
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const date = new Date();
                    const daysUntilSun = (7 - date.getDay()) % 7 || 7;
                    date.setDate(date.getDate() + daysUntilSun);
                    setRescheduleDate(date.toISOString().split("T")[0]);
                  }}
                >
                  Воскресенье
                </Button>
              </div>

              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Или выберите дату</Label>
                <Input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>

              <div className="space-y-2 pt-2">
                <Label className="text-muted-foreground text-xs">Как перенести?</Label>
                <div className="space-y-1">
                  <label className="hover:bg-muted/30 flex cursor-pointer items-start gap-2 rounded-lg p-2">
                    <input
                      type="radio"
                      name="rescheduleMode"
                      checked={rescheduleMode === "single"}
                      onChange={() => setRescheduleMode("single")}
                      className="accent-primary mt-1"
                    />
                    <div>
                      <div className="text-sm font-medium">Только эту тренировку</div>
                      <div className="text-muted-foreground text-xs">
                        Остальной цикл остаётся на месте
                      </div>
                    </div>
                  </label>
                  <label className="hover:bg-muted/30 flex cursor-pointer items-start gap-2 rounded-lg p-2">
                    <input
                      type="radio"
                      name="rescheduleMode"
                      checked={rescheduleMode === "shift"}
                      onChange={() => setRescheduleMode("shift")}
                      className="accent-primary mt-1"
                    />
                    <div>
                      <div className="text-sm font-medium">Сдвинуть весь цикл</div>
                      <div className="text-muted-foreground text-xs">
                        Все последующие тренировки сдвинутся
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setShowRescheduleDialog(false);
                    setRescheduleDate("");
                  }}
                >
                  Отмена
                </Button>
                <Button
                  size="sm"
                  className="bg-primary flex-1"
                  onClick={() => handleRescheduleWorkout(rescheduleMode)}
                  disabled={!rescheduleDate}
                >
                  Перенести
                </Button>
              </div>
            </div>
          )}

          {/* Exercises */}
          <div className="space-y-3">
            {selectedWorkout?.exercises?.map((exercise) => {
              const workingSets = exercise.sets?.filter((s) => !s.isWarmup) || [];
              const firstWorkingSet = workingSets[0];
              const weight =
                firstWorkingSet?.weight || exercise.template?.currentWeight || exercise.weight;
              const targetReps =
                firstWorkingSet?.reps || exercise.targetReps || exercise.template?.defaultReps;
              const targetSets =
                workingSets.length || exercise.targetSets || exercise.template?.defaultSets || 4;
              const nextWt = exercise.nextWeight || exercise.template?.nextWeight;
              const setsCount = exercise.sets?.length || 0;
              const completedSets = exercise.sets?.filter((s) => s.completed).length || 0;
              const canDeleteExercise =
                !exercise.workoutTemplateExerciseId && !selectedWorkout?.completed;
              // PR detection: current weight >= stored max weight for this template
              const prevRecord = exercise.templateId
                ? personalRecords[exercise.templateId]
                : undefined;
              const isPR = !!(weight && prevRecord && weight >= prevRecord);
              // 1RM estimate via Epley formula: weight * (1 + reps/30)
              const oneRM =
                weight && targetReps && targetReps > 1
                  ? Math.round(weight * (1 + targetReps / 30))
                  : null;

              return (
                <div key={exercise.id} className="bg-muted/30 space-y-2 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{exercise.name}</span>
                        {isPR && (
                          <Badge className="bg-yellow-500/20 px-1.5 py-0 text-[10px] text-yellow-400">
                            🏆 PR
                          </Badge>
                        )}
                        <span className="text-primary font-mono text-sm">
                          {weight &&
                            targetReps &&
                            targetSets &&
                            `${weight} × ${targetReps} × ${targetSets}`}
                        </span>
                        {nextWt && (
                          <span className="text-muted-foreground text-xs">
                            → {nextWt} в след. раз
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {exercise.muscleGroup && (
                          <span className="text-muted-foreground text-xs">
                            {MUSCLE_GROUPS.find((g) => g.value === exercise.muscleGroup)?.label}
                          </span>
                        )}
                        {oneRM && (
                          <span className="text-muted-foreground/50 text-[10px]">
                            ~1RM {oneRM} кг
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {setsCount > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {completedSets}/{setsCount}
                        </Badge>
                      )}
                      {canDeleteExercise && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-6 w-6 p-0"
                          onClick={() => handleDeleteExercise(exercise.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {!selectedWorkout?.completed && (
                    <div className="flex items-center gap-2">
                      <button
                        className={`rounded-full px-2 py-0.5 text-xs transition-colors ${
                          exercise.includeInFutureCycles !== false
                            ? "bg-primary/20 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                        onClick={() =>
                          handleToggleIncludeInFutureCycles(
                            exercise.id,
                            exercise.includeInFutureCycles !== false
                          )
                        }
                      >
                        {exercise.includeInFutureCycles !== false
                          ? "✓ В программе"
                          : "Только сегодня"}
                      </button>
                    </div>
                  )}

                  {/* Sets */}
                  <div className="space-y-1">
                    {exercise.sets?.map((set, setIdx) => {
                      const workingSetsBefore =
                        exercise.sets?.slice(0, setIdx).filter((s) => !s.isWarmup).length || 0;
                      const isWarmup = set.isWarmup;

                      return (
                        <div
                          key={set.id}
                          className={`flex items-center gap-2 text-sm ${isWarmup ? "opacity-75" : ""}`}
                        >
                          {isWarmup ? (
                            <Badge className="flex h-6 w-6 items-center justify-center bg-orange-500/20 p-0 text-xs text-orange-400">
                              Р
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground w-6 text-center">
                              {workingSetsBefore + 1}
                            </span>
                          )}
                          <Input
                            type="number"
                            placeholder="Вес"
                            className="h-8 w-20"
                            value={set.weight || ""}
                            onChange={(e) =>
                              handleUpdateSet(exercise.id, set.id, {
                                weight: parseFloat(e.target.value) || undefined,
                              })
                            }
                            disabled={selectedWorkout?.completed}
                          />
                          <span className="text-muted-foreground">кг ×</span>
                          <Input
                            type="number"
                            placeholder="Повт"
                            className="h-8 w-16"
                            value={set.reps || ""}
                            onChange={(e) =>
                              handleUpdateSet(exercise.id, set.id, {
                                reps: parseInt(e.target.value) || undefined,
                              })
                            }
                            disabled={selectedWorkout?.completed}
                          />
                          <button
                            className={`flex h-6 w-6 items-center justify-center rounded-full ${
                              set.completed ? "bg-emerald-500 text-white" : "bg-muted"
                            } ${selectedWorkout?.completed ? "cursor-not-allowed" : ""}`}
                            onClick={() =>
                              !selectedWorkout?.completed &&
                              handleUpdateSet(exercise.id, set.id, { completed: !set.completed })
                            }
                            disabled={selectedWorkout?.completed}
                          >
                            {set.completed && <CheckCircle2 className="h-4 w-4" />}
                          </button>
                          {!selectedWorkout?.completed && (
                            <button
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex h-6 w-6 items-center justify-center rounded transition-colors"
                              onClick={() => handleDeleteSet(exercise.id, set.id)}
                              title="Удалить подход"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Fill all button */}
                  {exercise.sets &&
                    exercise.sets.length > 0 &&
                    exercise.sets.every((s) => !s.weight) &&
                    weight && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary hover:text-primary w-full text-xs"
                        onClick={() => {
                          exercise.sets?.forEach((set) => {
                            if (!set.isWarmup) {
                              handleUpdateSet(
                                exercise.id,
                                set.id,
                                { weight, reps: targetReps },
                                true
                              );
                            }
                          });
                        }}
                      >
                        <Weight className="mr-1 h-3 w-3" />
                        Заполнить все: {weight} кг × {targetReps}
                      </Button>
                    )}

                  {/* Add set buttons */}
                  {!selectedWorkout?.completed && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => handleAddSet(exercise, false)}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Основной подход
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 text-xs text-orange-400 hover:bg-orange-500/10 hover:text-orange-300"
                        onClick={() => handleAddSet(exercise, true)}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Разминочный
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Additional Activities */}
          <div className="space-y-2">
            <Label className="text-muted-foreground flex items-center gap-2 text-xs">
              <Sparkles className="h-3 w-3" />
              Доп. активности
            </Label>

            {selectedWorkout?.additionalActivities &&
              selectedWorkout.additionalActivities.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedWorkout.additionalActivities.map((activity, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className={`text-xs ${!selectedWorkout.completed ? "hover:bg-destructive/20 cursor-pointer" : ""}`}
                      onClick={() => {
                        if (!selectedWorkout.completed && selectedWorkout.additionalActivities) {
                          const newActivities = selectedWorkout.additionalActivities.filter(
                            (_, i) => i !== idx
                          );
                          setSelectedWorkout((prev) =>
                            prev ? { ...prev, additionalActivities: newActivities } : null
                          );
                          handleSaveAdditionalActivities(newActivities);
                        }
                      }}
                    >
                      {activity.type === "walk" && `🚶 ${activity.value}`}
                      {activity.type === "abs" && `💪 Пресс ${activity.value}`}
                      {activity.type === "plank" && `⏱️ Планка ${activity.value}`}
                      {activity.type === "bike" && `🚴 ${activity.value}`}
                      {activity.type === "other" && activity.value}
                      {!selectedWorkout.completed && <X className="ml-1 h-3 w-3" />}
                    </Badge>
                  ))}
                </div>
              )}

            {!selectedWorkout?.completed && (
              <div className="flex gap-2">
                <Select
                  value={newActivityType}
                  onValueChange={(v) => setNewActivityType(v as AdditionalActivity["type"])}
                >
                  <SelectTrigger className="h-8 w-24 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walk">🚶 Ходьба</SelectItem>
                    <SelectItem value="abs">💪 Пресс</SelectItem>
                    <SelectItem value="plank">⏱️ Планка</SelectItem>
                    <SelectItem value="bike">🚴 Велосипед</SelectItem>
                    <SelectItem value="other">📝 Другое</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="10 км / 15×3 / 60 сек"
                  value={newActivityValue}
                  onChange={(e) => setNewActivityValue(e.target.value)}
                  className="h-8 flex-1 text-xs"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => {
                    if (newActivityValue && selectedWorkout) {
                      const newActivity: AdditionalActivity = {
                        type: newActivityType,
                        value: newActivityValue,
                      };
                      const newActivities = [
                        ...(selectedWorkout.additionalActivities || []),
                        newActivity,
                      ];
                      setSelectedWorkout((prev) =>
                        prev ? { ...prev, additionalActivities: newActivities } : null
                      );
                      setNewActivityValue("");
                      handleSaveAdditionalActivities(newActivities);
                    }
                  }}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {/* Add exercise */}
          {!selectedWorkout?.completed && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Название упражнения"
                  value={newExerciseName}
                  onChange={(e) => setNewExerciseName(e.target.value)}
                  className="flex-1"
                />
                <Button size="sm" onClick={handleAddExercise} disabled={!newExerciseName}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {selectedWorkout?.muscleGroups &&
                Array.isArray(selectedWorkout.muscleGroups) &&
                selectedWorkout.muscleGroups.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedWorkout.muscleGroups.flatMap((muscle) =>
                      (EXERCISE_DATABASE[muscle] || []).slice(0, 3).map((exercise) => (
                        <button
                          key={exercise}
                          className="bg-muted/50 hover:bg-muted rounded-full px-2 py-1 text-xs transition-colors"
                          onClick={() => setNewExerciseName(exercise)}
                        >
                          {exercise}
                        </button>
                      ))
                    )}
                  </div>
                )}
            </div>
          )}

          {/* Complete workout */}
          {!selectedWorkout?.completed && (
            <div className="space-y-2">
              <p className="text-muted-foreground text-center text-xs">Как прошла тренировка?</p>
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  onClick={openQuickCompleteDialog}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Всё по плану
                </Button>
                <Button
                  variant="outline"
                  className="border-primary/30 text-primary hover:bg-primary/10 flex-1"
                  onClick={() => {
                    if (selectedWorkout) {
                      handleCompleteWorkout(selectedWorkout.id);
                    }
                  }}
                >
                  <Edit3 className="mr-2 h-4 w-4" />
                  Заметки
                </Button>
              </div>
              <p className="text-muted-foreground/70 text-center text-[10px]">
                «Всё по плану» — быстро завершить. «Заметки» — оценить веса и добавить заметки.
              </p>
            </div>
          )}

          {selectedWorkout?.completed && (
            <div className="space-y-2">
              <div className="py-2 text-center text-emerald-400">
                <CheckCircle2 className="mx-auto mb-1 h-6 w-6" />
                Тренировка завершена!
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-orange-400 hover:bg-orange-500/10 hover:text-orange-300"
                onClick={handleUndoComplete}
              >
                <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
                Отменить завершение
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
