"use client";

import { GymProvider, useGymContext } from "@/features/gym/GymContext";
import { GymWizardDialogs } from "@/features/gym/components/GymWizardDialogs";
import { GymExerciseLibraryDialog } from "@/features/gym/components/GymExerciseLibraryDialog";
import { GymWorkoutDetailDialog } from "@/features/gym/components/GymWorkoutDetailDialog";
import { GymPostWorkoutDialog } from "@/features/gym/components/GymPostWorkoutDialog";
import { GymQuickCompleteDialog } from "@/features/gym/components/GymQuickCompleteDialog";
import { AddWorkoutDialog } from "@/features/gym/components/AddWorkoutDialog";
import { CompletionPreviewDialog } from "@/features/gym/components/CompletionPreviewDialog";
import { GymPeriodList } from "@/features/gym/components/GymPeriodList";
import { GymTodayBlock } from "@/features/gym/components/GymTodayBlock";
import { GymPeriodStats } from "@/features/gym/components/GymPeriodStats";
import { GymCalendarCard } from "@/features/gym/components/GymCalendarCard";
import { GymRecentWorkoutsCard } from "@/features/gym/components/GymRecentWorkoutsCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dumbbell, Plus, ChevronLeft } from "lucide-react";

function GymScreenContent() {
  const { activePeriod, isLoading, showPeriodList, setShowPeriodList, resetWizard, setShowWizard } =
    useGymContext();

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
          <Button size="sm" variant="outline" onClick={() => setShowPeriodList(true)}>
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
        <GymPeriodList />
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
          <GymTodayBlock />
          <GymPeriodStats />
          <GymCalendarCard />
          <GymRecentWorkoutsCard />
        </>
      )}

      {/* Dialogs */}
      <GymWizardDialogs />
      <GymExerciseLibraryDialog />
      <GymWorkoutDetailDialog />
      <GymPostWorkoutDialog />
      <GymQuickCompleteDialog />
      <AddWorkoutDialog />
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
