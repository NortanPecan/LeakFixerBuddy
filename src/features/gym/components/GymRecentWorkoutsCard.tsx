"use client";

import { useGymContext } from "@/features/gym/GymContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, ChevronRight } from "lucide-react";

export function GymRecentWorkoutsCard() {
  const { workouts, loadWorkoutDetails } = useGymContext();

  const completed = workouts
    .filter((w) => w.completed)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Последние тренировки</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {completed.map((workout) => (
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
                <p className="font-medium">{workout.name ?? `Тренировка ${workout.workoutNum}`}</p>
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
        {completed.length === 0 && (
          <p className="text-muted-foreground py-4 text-center">Нет выполненных тренировок</p>
        )}
      </CardContent>
    </Card>
  );
}
