"use client";

import { useGymContext } from "@/features/gym/GymContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dumbbell,
  Play,
  Target,
  CheckCircle2,
  Trophy,
  CalendarDays,
  GripVertical,
  Coffee,
  Save,
} from "lucide-react";
import { MUSCLE_GROUPS } from "@/features/gym";

export function GymPeriodStats() {
  const {
    activePeriod,
    completedWorkouts,
    periodProgress,
    parsedDaySchedule,
    scheduleEdited,
    scheduleDraggedIdx,
    scheduleDragOverIdx,
    handleScheduleDragStart,
    handleScheduleDragOver,
    handleScheduleDragEnd,
    handleSaveSchedule,
    nextWorkout,
    loadWorkoutDetails,
  } = useGymContext();

  if (!activePeriod) return null;

  return (
    <>
      {/* Period stats card */}
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
                      {day.name ?? `День ${day.workoutNum}`}
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

      {/* Period progress card */}
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

      {/* Day schedule card */}
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
                                {day.name ?? `Тренировка ${day.workoutNum}`}
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
                                    className={`px-1.5 py-0 text-[10px] ${group?.color ?? "bg-muted"}`}
                                  >
                                    {group?.label ?? muscle}
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

      {/* Next workout card */}
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
                    {nextWorkout.name ?? `Тренировка ${nextWorkout.workoutNum}`}
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
                              className={`px-1.5 py-0 text-[10px] ${group?.color ?? "bg-muted"}`}
                            >
                              {group?.label ?? muscle}
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
    </>
  );
}
