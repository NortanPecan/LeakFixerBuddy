"use client";

import { useGymContext } from "@/features/gym/GymContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { WEEKDAYS } from "@/features/gym";

export function GymCalendarCard() {
  const {
    currentMonth,
    setCurrentMonth,
    calendarDays,
    workouts,
    setSelectedDate,
    setNewWorkoutName,
    setNewWorkoutMuscles,
    setShowAddWorkoutDialog,
    loadWorkoutDetails,
  } = useGymContext();

  return (
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
            <div key={day} className="text-muted-foreground py-1 text-center text-xs font-medium">
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
  );
}
