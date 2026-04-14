"use client";

import { useCallback, useState } from "react";
import type { AdditionalActivity, GymExercise, GymExerciseSet, GymWorkout } from "@/features/gym";
import { calcProgressionWeight } from "@/features/gym/lib/gym-helpers";
import type { GymContextValue } from "@/features/gym/GymContext";
import { showSuccessToast } from "@/lib/network-utils";

type ExerciseRating = "easy" | "normal" | "hard";

interface UseGymCompletionParams {
  selectedWorkout: GymWorkout | null;
  loadTodayData: () => Promise<void>;
  setWorkouts: React.Dispatch<React.SetStateAction<GymWorkout[]>>;
  setShowWorkoutDetail: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface UseGymCompletionResult {
  showPostWorkoutDialog: boolean;
  setShowPostWorkoutDialog: React.Dispatch<React.SetStateAction<boolean>>;
  exerciseRatings: Record<string, ExerciseRating>;
  setExerciseRatings: React.Dispatch<React.SetStateAction<Record<string, ExerciseRating>>>;
  editingActivities: AdditionalActivity[];
  setEditingActivities: React.Dispatch<React.SetStateAction<AdditionalActivity[]>>;
  showQuickCompleteDialog: boolean;
  setShowQuickCompleteDialog: React.Dispatch<React.SetStateAction<boolean>>;
  quickCompleteNextWeights: Record<string, { weight: number; reps: number; sets: number }>;
  setQuickCompleteNextWeights: React.Dispatch<
    React.SetStateAction<Record<string, { weight: number; reps: number; sets: number }>>
  >;
  workoutNote: string;
  setWorkoutNote: React.Dispatch<React.SetStateAction<string>>;
  stretchingDone: boolean;
  setStretchingDone: React.Dispatch<React.SetStateAction<boolean>>;
  showCompletionPreview: boolean;
  setShowCompletionPreview: React.Dispatch<React.SetStateAction<boolean>>;
  completionData: GymContextValue["completionData"];
  handleCompleteWorkout: (workoutId: string) => Promise<void>;
  openQuickCompleteDialog: () => void;
  getUnfilledSetsInfo: () => Array<{
    exerciseName: string;
    exerciseId: string;
    setNum: number;
    setId: string;
  }>;
  handleAutoFillSets: (
    handleUpdateSet: (
      exerciseId: string,
      setId: string,
      updates: Partial<GymExerciseSet>,
      immediate?: boolean
    ) => Promise<void>
  ) => void;
  handleConfirmQuickComplete: () => Promise<void>;
  handleUndoComplete: () => Promise<void>;
  finalizeWorkout: (
    workoutId: string,
    ratings: Record<string, ExerciseRating>,
    activities: AdditionalActivity[],
    note?: string,
    stretchingDone?: boolean
  ) => Promise<void>;
}

export function useGymCompletion({
  selectedWorkout,
  loadTodayData,
  setWorkouts,
  setShowWorkoutDetail,
}: UseGymCompletionParams): UseGymCompletionResult {
  const [showPostWorkoutDialog, setShowPostWorkoutDialog] = useState(false);
  const [exerciseRatings, setExerciseRatings] = useState<Record<string, ExerciseRating>>({});
  const [editingActivities, setEditingActivities] = useState<AdditionalActivity[]>([]);

  const [showQuickCompleteDialog, setShowQuickCompleteDialog] = useState(false);
  const [quickCompleteNextWeights, setQuickCompleteNextWeights] = useState<
    Record<string, { weight: number; reps: number; sets: number }>
  >({});
  const [workoutNote, setWorkoutNote] = useState("");
  const [stretchingDone, setStretchingDone] = useState(false);

  const [showCompletionPreview, setShowCompletionPreview] = useState(false);
  const [completionData, setCompletionData] = useState<GymContextValue["completionData"]>({
    exercises: [],
  });

  // ── Core finalize ──────────────────────────────────────────────────────────
  // Defined early so handleCompleteWorkout can call it safely via shared closure.
  // Both are useCallback with the same stable deps, so stale-closure is avoided.

  const finalizeWorkout = useCallback(
    async (
      workoutId: string,
      ratings: Record<string, ExerciseRating>,
      activities: AdditionalActivity[],
      note?: string,
      stretching?: boolean
    ) => {
      if (!selectedWorkout) return;
      try {
        const exercisesData = selectedWorkout.exercises?.map((ex: GymExercise) => {
          const rating = ratings[ex.id] ?? "normal";
          const currentWeight = ex.sets?.[0]?.weight ?? ex.template?.currentWeight;
          const step =
            (ex.template as (typeof ex.template & { progressionStep?: number }) | undefined)
              ?.progressionStep ?? 2.5;
          const nextWeight = calcProgressionWeight(
            currentWeight,
            rating,
            step,
            ex.nextWeight ?? ex.template?.nextWeight
          );
          return {
            id: ex.id,
            templateId: ex.templateId,
            weight: currentWeight,
            nextWeight,
            repsScheme: ex.repsScheme,
            sets: ex.sets?.map((s) => ({
              id: (s as GymExerciseSet).id,
              weight: s.weight,
              reps: s.reps,
              completed: s.completed,
            })),
          };
        });
        await fetch("/api/gym/today", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workoutId,
            completed: true,
            additionalActivities: activities,
            exercises: exercisesData,
            cycleNote: note,
            stretchingDone: stretching ?? false,
          }),
        });
        setWorkouts((prev) =>
          prev.map((w) => (w.id === workoutId ? { ...w, completed: true } : w))
        );
        setShowPostWorkoutDialog(false);
        setShowWorkoutDetail(false);
        setWorkoutNote("");
        setStretchingDone(false);
        void loadTodayData();
      } catch (error) {
        console.error("Failed to finalize workout:", error);
      }
    },
    [selectedWorkout, setWorkouts, setShowWorkoutDetail, loadTodayData]
  );

  // ── Complete workout ───────────────────────────────────────────────────────
  // Opens post-workout dialog, or finalizes directly when workout has no exercises.
  // Inlines the no-exercise path to avoid stale finalizeWorkout closure.

  const handleCompleteWorkout = useCallback(
    async (workoutId: string) => {
      if (!selectedWorkout) return;
      if (selectedWorkout.exercises && selectedWorkout.exercises.length > 0) {
        const initialRatings: Record<string, ExerciseRating> = {};
        selectedWorkout.exercises.forEach((ex) => {
          initialRatings[ex.id] = "normal";
        });
        setExerciseRatings(initialRatings);
        setEditingActivities(selectedWorkout.additionalActivities ?? []);
        setShowPostWorkoutDialog(true);
      } else {
        // No exercises — finalize immediately with empty data
        try {
          await fetch("/api/gym/today", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              workoutId,
              completed: true,
              additionalActivities: [],
              exercises: [],
              cycleNote: undefined,
              stretchingDone: false,
            }),
          });
          setWorkouts((prev) =>
            prev.map((w) => (w.id === workoutId ? { ...w, completed: true } : w))
          );
          setShowWorkoutDetail(false);
          void loadTodayData();
        } catch (error) {
          console.error("Failed to complete workout:", error);
        }
      }
    },
    [selectedWorkout, setWorkouts, setShowWorkoutDetail, loadTodayData]
  );

  const openQuickCompleteDialog = useCallback(() => {
    if (!selectedWorkout) return;
    const nextWeights: Record<string, { weight: number; reps: number; sets: number }> = {};
    selectedWorkout.exercises?.forEach((ex) => {
      const workingSets = ex.sets?.filter((s) => !s.isWarmup) ?? [];
      const firstWorkingSet = workingSets[0];
      const currentWeight = firstWorkingSet?.weight ?? ex.template?.currentWeight ?? ex.weight ?? 0;
      const currentReps = firstWorkingSet?.reps ?? ex.targetReps ?? ex.template?.defaultReps ?? 10;
      const currentSets = workingSets.length || ex.targetSets || ex.template?.defaultSets || 4;
      nextWeights[ex.id] = { weight: currentWeight, reps: currentReps, sets: currentSets };
    });
    setQuickCompleteNextWeights(nextWeights);
    setWorkoutNote("");
    setShowQuickCompleteDialog(true);
  }, [selectedWorkout]);

  const getUnfilledSetsInfo = useCallback(() => {
    if (!selectedWorkout?.exercises) return [];
    const unfilled: Array<{
      exerciseName: string;
      exerciseId: string;
      setNum: number;
      setId: string;
    }> = [];
    selectedWorkout.exercises.forEach((ex) => {
      ex.sets?.forEach((set, idx) => {
        if (!set.isWarmup && (!set.weight || !set.reps)) {
          unfilled.push({
            exerciseName: ex.name,
            exerciseId: ex.id,
            setNum: idx + 1,
            setId: (set as GymExerciseSet).id,
          });
        }
      });
    });
    return unfilled;
  }, [selectedWorkout]);

  const handleAutoFillSets = useCallback(
    (
      handleUpdateSet: (
        exerciseId: string,
        setId: string,
        updates: Partial<GymExerciseSet>,
        immediate?: boolean
      ) => Promise<void>
    ) => {
      if (!selectedWorkout?.exercises) return;
      selectedWorkout.exercises.forEach((ex) => {
        const workingSets = ex.sets?.filter((s) => !s.isWarmup) ?? [];
        const lastFilled = workingSets.filter((s) => s.weight && s.reps).pop();
        if (lastFilled) {
          workingSets.forEach((set) => {
            if (!set.weight || !set.reps) {
              void handleUpdateSet(
                ex.id,
                (set as GymExerciseSet).id,
                { weight: lastFilled.weight, reps: lastFilled.reps },
                true
              );
            }
          });
        }
      });
    },
    [selectedWorkout]
  );

  const handleConfirmQuickComplete = useCallback(async () => {
    if (!selectedWorkout) return;
    try {
      const exercisesData = selectedWorkout.exercises?.map((ex) => {
        const nextWeightConfig = quickCompleteNextWeights[ex.id];
        return {
          id: ex.id,
          templateId: ex.templateId,
          weight: ex.sets?.[0]?.weight ?? ex.template?.currentWeight,
          nextWeight: nextWeightConfig?.weight ?? ex.template?.currentWeight,
          nextTargetReps: nextWeightConfig?.reps ?? ex.targetReps,
          nextTargetSets: nextWeightConfig?.sets ?? ex.targetSets,
          sets: ex.sets?.map((s) => ({
            id: (s as GymExerciseSet).id,
            weight: s.weight,
            reps: s.reps,
            completed: s.completed,
          })),
        };
      });
      const response = await fetch("/api/gym/today", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workoutId: selectedWorkout.id,
          completed: true,
          exercises: exercisesData,
          cycleNote: workoutNote,
        }),
      });
      if (response.ok) {
        const previewExercises =
          selectedWorkout.exercises?.map((ex) => {
            const nextConfig = quickCompleteNextWeights[ex.id];
            const workingSets = ex.sets?.filter((s) => !s.isWarmup) ?? [];
            const firstWorkingSet = workingSets[0];
            return {
              name: ex.name,
              weight: firstWorkingSet?.weight ?? ex.weight ?? ex.template?.currentWeight,
              reps: firstWorkingSet?.reps ?? ex.targetReps ?? ex.template?.defaultReps,
              sets: workingSets.length || ex.targetSets || ex.template?.defaultSets || 4,
              nextWeight:
                nextConfig?.weight ?? firstWorkingSet?.weight ?? ex.template?.currentWeight,
            };
          }) ?? [];
        setCompletionData({ exercises: previewExercises, note: workoutNote || undefined });
        setWorkouts((prev) =>
          prev.map((w) =>
            w.id === selectedWorkout.id ? { ...w, completed: true, status: "completed" } : w
          )
        );
        setShowQuickCompleteDialog(false);
        setShowWorkoutDetail(false);
        setShowCompletionPreview(true);
        showSuccessToast("Тренировка завершена! 💪");
        void loadTodayData();
      }
    } catch (error) {
      console.error("Failed to confirm quick complete:", error);
    }
  }, [
    selectedWorkout,
    quickCompleteNextWeights,
    workoutNote,
    setWorkouts,
    setShowWorkoutDetail,
    loadTodayData,
  ]);

  const handleUndoComplete = useCallback(async () => {
    if (!selectedWorkout) return;
    try {
      const response = await fetch("/api/gym/workouts/undo-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workoutId: selectedWorkout.id }),
      });
      if (response.ok) {
        setWorkouts((prev) =>
          prev.map((w) =>
            w.id === selectedWorkout.id ? { ...w, completed: false, status: "in_progress" } : w
          )
        );
        void loadTodayData();
      }
    } catch (error) {
      console.error("Failed to undo completion:", error);
    }
  }, [selectedWorkout, setWorkouts, loadTodayData]);

  return {
    showPostWorkoutDialog,
    setShowPostWorkoutDialog,
    exerciseRatings,
    setExerciseRatings,
    editingActivities,
    setEditingActivities,
    showQuickCompleteDialog,
    setShowQuickCompleteDialog,
    quickCompleteNextWeights,
    setQuickCompleteNextWeights,
    workoutNote,
    setWorkoutNote,
    stretchingDone,
    setStretchingDone,
    showCompletionPreview,
    setShowCompletionPreview,
    completionData,
    handleCompleteWorkout,
    openQuickCompleteDialog,
    getUnfilledSetsInfo,
    handleAutoFillSets,
    handleConfirmQuickComplete,
    handleUndoComplete,
    finalizeWorkout,
  };
}
