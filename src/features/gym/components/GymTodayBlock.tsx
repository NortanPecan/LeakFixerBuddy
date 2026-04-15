"use client";

import { useGymContext } from "@/features/gym/GymContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, CheckCircle2, Play, Coffee } from "lucide-react";
import { MUSCLE_GROUPS, type GymWorkout } from "@/features/gym";

export function GymTodayBlock() {
  const { todayData, loadTodayData, loadWorkoutDetails } = useGymContext();

  if (!todayData?.hasActivePeriod) return null;

  return (
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
        <div className="mt-1">
          <p className="text-sm font-medium">
            {new Date().toLocaleDateString("ru-RU", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
            {" — "}
            Период «{todayData.period?.name ?? "Тренировки"}»
          </p>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {todayData.todayWorkout ? (
          <TodayWorkoutContent
            todayWorkout={todayData.todayWorkout}
            loadTodayData={loadTodayData}
            loadWorkoutDetails={loadWorkoutDetails}
          />
        ) : (
          <TodayRestContent nextWorkout={todayData.nextWorkout} />
        )}
      </CardContent>
    </Card>
  );
}

// ── inner sub-components ─────────────────────────────────────────────────────

interface TodayWorkout {
  id: string;
  workoutNum?: number;
  name?: string | null;
  status: string;
  completed: boolean;
  muscleGroups?: string[];
  template?: { name?: string; muscleGroups?: string[] };
  exercises?: Array<{
    id: string;
    order: number;
    name: string;
    weight?: number;
    targetReps?: number;
    targetSets?: number;
    nextWeight?: number;
    techniqueNotes?: string;
    cycleNote?: string;
    lastCycleNote?: string;
    sets?: Array<{ isWarmup?: boolean; weight?: number; reps?: number }>;
    template?: {
      currentWeight?: number;
      defaultReps?: number;
      defaultSets?: number;
      nextWeight?: number;
      techniqueNotes?: string;
    };
  }>;
}

interface NextWorkoutSummary {
  name?: string | null;
  workoutNum?: number;
  date: string;
}

function TodayWorkoutContent({
  todayWorkout,
  loadTodayData,
  loadWorkoutDetails,
}: {
  todayWorkout: TodayWorkout;
  loadTodayData: () => Promise<void>;
  loadWorkoutDetails: (w: GymWorkout) => void;
}) {
  const isCompleted = todayWorkout.status === "completed";

  const buildGymWorkout = (): GymWorkout =>
    ({
      id: todayWorkout.id,
      date: new Date().toISOString(),
      dayOfWeek: new Date().getDay() || 7,
      workoutNum: todayWorkout.workoutNum ?? 1,
      name: todayWorkout.name,
      muscleGroups: todayWorkout.muscleGroups,
      duration: null,
      completed: todayWorkout.completed,
      status: todayWorkout.status,
      exercises: [],
    }) as GymWorkout;

  return (
    <>
      {/* Header row: day name + status badge */}
      <div className="border-border/30 mb-3 border-b pb-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">
            День {todayWorkout.workoutNum ?? 1}:{" "}
            {todayWorkout.template?.name ?? todayWorkout.name ?? "Тренировка"}
          </p>
          <Badge
            className={
              isCompleted
                ? "bg-emerald-500/20 text-emerald-400"
                : todayWorkout.status === "in_progress"
                  ? "bg-yellow-500/20 text-yellow-400"
                  : "bg-muted text-muted-foreground"
            }
          >
            {isCompleted
              ? "Завершена"
              : todayWorkout.status === "in_progress"
                ? "В процессе"
                : "Запланирована"}
          </Badge>
        </div>
        {(todayWorkout.template?.muscleGroups?.length || todayWorkout.muscleGroups?.length || 0) >
          0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {(todayWorkout.template?.muscleGroups ?? todayWorkout.muscleGroups ?? []).map(
              (m: string) => {
                const group = MUSCLE_GROUPS.find((g) => g.value === m);
                return (
                  <Badge
                    key={m}
                    className={`px-1.5 py-0 text-[10px] ${group?.color ?? "bg-muted"}`}
                  >
                    {group?.label ?? m}
                  </Badge>
                );
              }
            )}
          </div>
        )}
      </div>

      {/* Exercises list */}
      <div className="space-y-3">
        {(() => {
          return todayWorkout.exercises
            ?.sort((a, b) => a.order - b.order)
            .map((ex, idx) => {
              const workingSets = ex.sets?.filter((s) => !s.isWarmup) ?? [];
              const firstWorkingSet = workingSets[0];
              const weight = firstWorkingSet?.weight ?? ex.weight ?? ex.template?.currentWeight;
              const targetReps = firstWorkingSet?.reps ?? ex.targetReps ?? ex.template?.defaultReps;
              const targetSets =
                workingSets.length || ex.targetSets || ex.template?.defaultSets || 4;
              const nextWt = ex.nextWeight ?? ex.template?.nextWeight;

              const techNoteLines = (ex.techniqueNotes ?? ex.template?.techniqueNotes ?? "")
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              const cycleNoteLines = (ex.cycleNote ?? ex.lastCycleNote ?? "")
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);

              return (
                <div key={ex.id} className="border-border/30 border-b py-2 last:border-0">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-1 items-center gap-2">
                      <span className="text-muted-foreground w-5 text-xs">{idx + 1}.</span>
                      <span className="text-sm font-medium">{ex.name}</span>
                    </div>
                    <div className="text-right font-mono text-sm">
                      {weight && targetReps && targetSets && (
                        <span className="text-primary">
                          {weight}×{targetReps}×{targetSets}
                        </span>
                      )}
                      {nextWt && isCompleted && (
                        <span
                          className="text-muted-foreground hover:text-primary ml-1 cursor-pointer text-xs transition-colors"
                          onClick={() => {
                            const newWeight = prompt("Новый вес на след. раз:", String(nextWt));
                            if (newWeight && !isNaN(parseFloat(newWeight))) {
                              fetch("/api/gym/today", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  exerciseId: ex.id,
                                  nextWeight: parseFloat(newWeight),
                                }),
                              })
                                .then(() => loadTodayData())
                                .catch(console.error);
                            }
                          }}
                          title="Клик чтобы изменить"
                        >
                          → {nextWt} в след. раз
                        </span>
                      )}
                    </div>
                  </div>

                  {!isCompleted && techNoteLines.length > 0 && (
                    <div className="mt-1 ml-7 space-y-0.5">
                      {techNoteLines.map((line, lineIdx) => (
                        <div key={lineIdx} className="flex items-start gap-1.5">
                          <span className="text-xs">💡</span>
                          <span className="text-muted-foreground text-xs">{line}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {!isCompleted && cycleNoteLines.length > 0 && (
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

      {/* Workout notes (completed) */}
      {isCompleted && todayWorkout.exercises?.[0]?.cycleNote && (
        <div className="border-border/30 mt-3 border-t pt-3">
          <p className="text-muted-foreground mb-1 text-xs">📝 Заметки на следующий цикл:</p>
          <p className="text-sm">{todayWorkout.exercises[0].cycleNote}</p>
        </div>
      )}

      {/* Format legend (not completed) */}
      {!isCompleted && (
        <div className="border-border/30 mt-3 border-t pt-2">
          <p className="text-muted-foreground text-xs">
            Формат: вес × повторы × подходы → вес в след. раз
          </p>
        </div>
      )}

      {/* Quick actions */}
      <div className="mt-3 flex gap-2">
        {todayWorkout.status === "planned" && (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
            onClick={() => loadWorkoutDetails(buildGymWorkout())}
          >
            <CheckCircle2 className="mr-1 h-4 w-4" />
            Всё по плану
          </Button>
        )}
        <Button
          size="sm"
          className="bg-primary hover:bg-primary/90 flex-1"
          onClick={() => loadWorkoutDetails(buildGymWorkout())}
        >
          <Play className="mr-1 h-4 w-4" />
          {todayWorkout.status === "in_progress" ? "Продолжить" : "Открыть"}
        </Button>
      </div>
    </>
  );
}

function TodayRestContent({ nextWorkout }: { nextWorkout?: NextWorkoutSummary | null }) {
  return (
    <div className="py-6 text-center">
      <Coffee className="text-muted-foreground/50 mx-auto mb-2 h-10 w-10" />
      <p className="text-muted-foreground">Сегодня тренировки не запланировано</p>
      <p className="text-muted-foreground/70 mt-1 text-xs">
        Можно отдохнуть или добавить активность вручную
      </p>
      {nextWorkout && (
        <div className="border-border/30 mt-3 border-t pt-3">
          <p className="text-muted-foreground mb-1 text-xs">Следующая тренировка:</p>
          <p className="text-sm font-medium">
            {nextWorkout.name ?? `Тренировка ${nextWorkout.workoutNum}`}
          </p>
          <p className="text-muted-foreground text-xs">
            {new Date(nextWorkout.date).toLocaleDateString("ru-RU", {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
          </p>
        </div>
      )}
    </div>
  );
}
