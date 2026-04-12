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
  Dumbbell,
  Calendar,
  ChevronLeft,
  Plus,
  X,
  ArrowRight,
  GripVertical,
  Coffee,
  Zap,
} from "lucide-react";
import {
  TRAINING_TYPES,
  SPLIT_TYPES,
  MUSCLE_GROUPS,
  WEEKDAYS,
  WORKOUT_TEMPLATES,
} from "@/features/gym";

export function GymWizardDialogs() {
  const {
    showWizard,
    setShowWizard,
    wizardStep,
    setWizardStep,
    wizardConfig,
    setWizardConfig,
    workoutDays,
    setWorkoutDays,
    daySchedule,
    selectedTemplate,
    setSelectedTemplate,
    draggedIndex,
    dragOverIndex,
    wizardExercises,
    setWizardExercises,
    showWizardExercisePicker,
    setShowWizardExercisePicker,
    selectedWorkoutNumForExercise,
    setSelectedWorkoutNumForExercise,
    calendarPreview,
    templates,
    isLoadingTemplates,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleCreatePeriod,
    resetWizard,
    applyTemplate,
    loadTemplates,
    setShowExerciseLibraryDialog,
    toggleDayType,
  } = useGymContext();

  return (
    <>
      {/* Wizard Dialog */}
      <Dialog
        open={showWizard}
        onOpenChange={(open) => {
          setShowWizard(open);
          if (!open) resetWizard();
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-sm overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {wizardStep === 1
                ? "Новый период"
                : wizardStep === 2
                  ? "Настройка тренировок"
                  : wizardStep === 3
                    ? "Порядок дней"
                    : "Упражнения"}
            </DialogTitle>
          </DialogHeader>

          {wizardStep === 1 ? (
            <div className="space-y-4 pt-4">
              {/* Templates */}
              <div className="space-y-2">
                <Label className="text-muted-foreground flex items-center gap-2 text-xs">
                  <Zap className="h-3 w-3" />
                  Быстрый старт (шаблоны)
                </Label>
                <div className="space-y-2">
                  {WORKOUT_TEMPLATES.map((template) => (
                    <label
                      key={template.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-colors ${
                        selectedTemplate === template.id
                          ? "bg-primary/20 border-primary/30 border"
                          : "bg-muted/30"
                      }`}
                    >
                      <input
                        type="radio"
                        name="template"
                        value={template.id}
                        checked={selectedTemplate === template.id}
                        onChange={() => applyTemplate(template.id)}
                        className="accent-primary"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{template.name}</div>
                        <div className="text-muted-foreground text-xs">{template.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background text-muted-foreground px-2">
                    или настрой вручную
                  </span>
                </div>
              </div>

              {/* Training type */}
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Тип периода</Label>
                <div className="space-y-2">
                  {TRAINING_TYPES.map((type) => (
                    <label
                      key={type.value}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-colors ${
                        wizardConfig.type === type.value && !selectedTemplate
                          ? "bg-primary/20 border-primary/30 border"
                          : "bg-muted/30"
                      }`}
                    >
                      <input
                        type="radio"
                        name="periodType"
                        value={type.value}
                        checked={wizardConfig.type === type.value && !selectedTemplate}
                        onChange={() => {
                          setSelectedTemplate(null);
                          setWizardConfig((prev) => ({ ...prev, type: type.value }));
                        }}
                        className="accent-primary"
                      />
                      <div>
                        <div className="text-sm font-medium">{type.label}</div>
                        <div className="text-muted-foreground text-xs">{type.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {wizardConfig.type === "custom" && !selectedTemplate && (
                <Input
                  placeholder="Название периода"
                  value={wizardConfig.customName}
                  onChange={(e) =>
                    setWizardConfig((prev) => ({ ...prev, customName: e.target.value }))
                  }
                />
              )}

              {!selectedTemplate && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Длина цикла (дней)</Label>
                  <Input
                    type="number"
                    min={3}
                    max={14}
                    value={wizardConfig.cycleLength}
                    onChange={(e) =>
                      setWizardConfig((prev) => ({
                        ...prev,
                        cycleLength: parseInt(e.target.value) || 7,
                      }))
                    }
                  />
                </div>
              )}

              {!selectedTemplate && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Тренировок в цикле</Label>
                  <Input
                    type="number"
                    min={1}
                    max={7}
                    value={wizardConfig.workoutsPerCycle}
                    onChange={(e) =>
                      setWizardConfig((prev) => ({
                        ...prev,
                        workoutsPerCycle: parseInt(e.target.value) || 3,
                      }))
                    }
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Всего циклов</Label>
                <Input
                  type="number"
                  min={1}
                  max={24}
                  value={wizardConfig.totalCycles}
                  onChange={(e) =>
                    setWizardConfig((prev) => ({
                      ...prev,
                      totalCycles: parseInt(e.target.value) || 8,
                    }))
                  }
                />
              </div>

              {!selectedTemplate && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Формат тренировок</Label>
                  <Select
                    value={wizardConfig.splitType}
                    onValueChange={(value) =>
                      setWizardConfig((prev) => ({ ...prev, splitType: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SPLIT_TYPES.map((split) => (
                        <SelectItem key={split.value} value={split.value}>
                          {split.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowWizard(false)}>
                  Отмена
                </Button>
                <Button
                  className="bg-primary flex-1"
                  onClick={() => setWizardStep(2)}
                  disabled={wizardConfig.type === "custom" && !wizardConfig.customName}
                >
                  Далее
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : wizardStep === 2 ? (
            <div className="space-y-4 pt-4">
              <p className="text-muted-foreground text-sm">
                Настрой названия и группы мышц для каждой тренировки.
              </p>

              <div className="space-y-3">
                {workoutDays.map((day, idx) => (
                  <div key={idx} className="bg-muted/30 space-y-2 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Тренировка {day.dayNum}</span>
                      <Input
                        className="h-8 w-40 text-sm"
                        placeholder="Название"
                        value={day.name}
                        onChange={(e) => {
                          const newDays = [...workoutDays];
                          newDays[idx].name = e.target.value;
                          setWorkoutDays(newDays);
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {MUSCLE_GROUPS.map((muscle) => (
                        <button
                          key={muscle.value}
                          className={`rounded-full px-2 py-1 text-xs transition-colors ${
                            day.muscles.includes(muscle.value)
                              ? muscle.color
                              : "bg-muted text-muted-foreground hover:bg-muted/70"
                          }`}
                          onClick={() => {
                            const newDays = [...workoutDays];
                            if (day.muscles.includes(muscle.value)) {
                              newDays[idx].muscles = day.muscles.filter((m) => m !== muscle.value);
                            } else {
                              newDays[idx].muscles = [...day.muscles, muscle.value];
                            }
                            setWorkoutDays(newDays);
                          }}
                        >
                          {muscle.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setWizardStep(1)}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Назад
                </Button>
                <Button className="bg-primary flex-1" onClick={() => setWizardStep(3)}>
                  Далее
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : wizardStep === 3 ? (
            <div className="space-y-4 pt-4">
              <p className="text-muted-foreground text-sm">
                Перетащи дни, чтобы изменить порядок. Нажми на день, чтобы сменить тип
                (тренировка/отдых).
              </p>

              <div className="space-y-1.5">
                {daySchedule.map((item, idx) => {
                  const isWorkout = item.type === "workout";
                  const dayConfig = isWorkout
                    ? workoutDays.find((d) => d.dayNum === item.workoutNum)
                    : null;

                  return (
                    <div
                      key={idx}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragEnd={handleDragEnd}
                      onClick={() => toggleDayType(idx)}
                      className={`flex cursor-grab items-center gap-3 rounded-xl p-3 transition-all active:cursor-grabbing ${
                        isWorkout
                          ? "bg-primary/10 hover:bg-primary/20"
                          : "bg-muted/20 hover:bg-muted/30"
                      } ${
                        dragOverIndex === idx && draggedIndex !== idx
                          ? "ring-primary/50 ring-2"
                          : ""
                      }`}
                    >
                      <GripVertical className="text-muted-foreground/50 h-4 w-4" />
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
                                {dayConfig?.name || item.name || `Тренировка ${item.workoutNum}`}
                              </span>
                            </>
                          ) : (
                            <>
                              <Coffee className="text-muted-foreground h-4 w-4" />
                              <span className="text-muted-foreground">Отдых</span>
                            </>
                          )}
                        </div>
                        {isWorkout &&
                          ((dayConfig?.muscles || item.muscleGroups || []) as string[]).length >
                            0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {(dayConfig?.muscles || item.muscleGroups || []).map((muscle) => {
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
                  );
                })}
              </div>

              {/* Calendar preview */}
              <div className="space-y-2">
                <Label className="text-muted-foreground flex items-center gap-2 text-xs">
                  <Calendar className="h-3 w-3" />
                  Превью календаря (2 недели)
                </Label>
                <div className="grid grid-cols-7 gap-1">
                  {WEEKDAYS.map((day) => (
                    <div
                      key={day}
                      className="text-muted-foreground py-1 text-center text-[10px] font-medium"
                    >
                      {day}
                    </div>
                  ))}
                  {calendarPreview.map((day, i) => (
                    <div
                      key={i}
                      className={`flex aspect-square items-center justify-center rounded text-xs ${
                        day.isToday ? "ring-primary ring-1" : ""
                      } ${
                        day.item.type === "workout"
                          ? "bg-primary/20 text-primary"
                          : "bg-muted/20 text-muted-foreground"
                      }`}
                    >
                      {day.date.getDate()}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setWizardStep(2)}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Назад
                </Button>
                <Button className="bg-primary flex-1" onClick={() => setWizardStep(4)}>
                  Далее
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : wizardStep === 4 ? (
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-sm">
                  Добавь упражнения для каждого типа тренировки.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    loadTemplates();
                    setShowExerciseLibraryDialog(true);
                  }}
                >
                  <Dumbbell className="mr-1 h-3 w-3" />
                  Мои упражнения
                </Button>
              </div>

              <div className="space-y-4">
                {workoutDays.map((day, idx) => {
                  const exercises = wizardExercises[day.dayNum] || [];
                  return (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">{day.name}</div>
                          <div className="text-muted-foreground text-xs">
                            {day.muscles
                              .map((m) => MUSCLE_GROUPS.find((g) => g.value === m)?.label)
                              .join(", ")}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedWorkoutNumForExercise(day.dayNum);
                            setShowWizardExercisePicker(true);
                            loadTemplates();
                          }}
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          Добавить
                        </Button>
                      </div>

                      <div className="space-y-1 pl-2">
                        {exercises.length === 0 ? (
                          <div className="text-muted-foreground py-2 text-xs">Нет упражнений</div>
                        ) : (
                          exercises.map((ex, exIdx) => (
                            <div
                              key={exIdx}
                              className="bg-muted/30 flex items-center justify-between rounded p-2 text-sm"
                            >
                              <span>
                                {exIdx + 1}. {ex.name}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => {
                                  const newExercises = { ...wizardExercises };
                                  newExercises[day.dayNum] = exercises.filter(
                                    (_, i) => i !== exIdx
                                  );
                                  setWizardExercises(newExercises);
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setWizardStep(3)}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Назад
                </Button>
                <Button className="bg-primary flex-1" onClick={handleCreatePeriod}>
                  Создать период
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Wizard Exercise Picker Dialog */}
      <Dialog open={showWizardExercisePicker} onOpenChange={setShowWizardExercisePicker}>
        <DialogContent className="max-h-[80vh] max-w-sm overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Добавить упражнение</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-4">
            {isLoadingTemplates ? (
              <div className="text-muted-foreground py-4 text-center">Загрузка...</div>
            ) : templates.length === 0 ? (
              <div className="text-muted-foreground py-4 text-center">
                Нет шаблонов. Сначала создайте упражнения в библиотеке.
              </div>
            ) : (
              <div className="space-y-2">
                {templates
                  .filter((t) => {
                    const day = workoutDays.find((d) => d.dayNum === selectedWorkoutNumForExercise);
                    return !day?.muscles?.length || day.muscles.includes(t.muscleGroup || "");
                  })
                  .map((template) => (
                    <div
                      key={template.id}
                      className="bg-muted/30 hover:bg-muted/50 flex cursor-pointer items-center justify-between rounded-lg p-3 transition-colors"
                      onClick={() => {
                        const day = workoutDays.find(
                          (d) => d.dayNum === selectedWorkoutNumForExercise
                        );
                        if (!day) return;

                        const currentExercises = wizardExercises[day.dayNum] || [];
                        setWizardExercises({
                          ...wizardExercises,
                          [day.dayNum]: [
                            ...currentExercises,
                            {
                              templateId: template.id,
                              name: template.name,
                              muscleGroup: template.muscleGroup,
                              order: currentExercises.length + 1,
                            },
                          ],
                        });
                        setShowWizardExercisePicker(false);
                      }}
                    >
                      <div>
                        <div className="text-sm font-medium">{template.name}</div>
                        {template.muscleGroup && (
                          <div className="text-muted-foreground text-xs">
                            {MUSCLE_GROUPS.find((g) => g.value === template.muscleGroup)?.label}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        {template.currentWeight && (
                          <div className="font-mono text-sm">{template.currentWeight} кг</div>
                        )}
                        {template.defaultScheme && (
                          <div className="text-muted-foreground text-xs">
                            {template.defaultScheme}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
