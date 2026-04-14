"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AdditionalActivity,
  GymExercise,
  GymExerciseSet,
  GymPeriod,
  GymWorkout,
} from "@/features/gym";
import { parseMuscleGroups } from "@/features/gym/lib/gym-helpers";

interface GymTemplate {
  id: string;
  name: string;
  muscleGroup?: string;
  currentWeight?: number;
  nextWeight?: number;
  defaultScheme?: string;
  defaultReps?: number;
  defaultSets?: number;
  techniqueNotes?: string;
}

interface EditingTemplate {
  id?: string;
  name: string;
  muscleGroup?: string;
  defaultScheme?: string;
  defaultReps?: number;
  defaultSets?: number;
  currentWeight?: number;
  nextWeight?: number;
  techniqueNotes?: string;
}

interface UseGymSessionParams {
  userId: string | undefined;
  activePeriod: GymPeriod | null;
  workouts: GymWorkout[];
  setWorkouts: React.Dispatch<React.SetStateAction<GymWorkout[]>>;
  loadTodayData: () => Promise<void>;
}

export interface UseGymSessionResult {
  // Workout detail
  selectedWorkout: GymWorkout | null;
  setSelectedWorkout: React.Dispatch<React.SetStateAction<GymWorkout | null>>;
  showWorkoutDetail: boolean;
  setShowWorkoutDetail: React.Dispatch<React.SetStateAction<boolean>>;

  // Exercise editor
  editingExercise: GymExercise | null;
  setEditingExercise: React.Dispatch<React.SetStateAction<GymExercise | null>>;
  showExerciseEditor: boolean;
  setShowExerciseEditor: React.Dispatch<React.SetStateAction<boolean>>;
  newExerciseName: string;
  setNewExerciseName: React.Dispatch<React.SetStateAction<string>>;
  newExerciseMuscle: string;
  setNewExerciseMuscle: React.Dispatch<React.SetStateAction<string>>;

  // Exercise library
  showExerciseLibraryDialog: boolean;
  setShowExerciseLibraryDialog: React.Dispatch<React.SetStateAction<boolean>>;
  editingTemplate: EditingTemplate | null;
  setEditingTemplate: React.Dispatch<React.SetStateAction<EditingTemplate | null>>;
  libraryMuscleFilter: string | null;
  setLibraryMuscleFilter: React.Dispatch<React.SetStateAction<string | null>>;

  // Skip / reschedule
  showSkipDialog: boolean;
  setShowSkipDialog: React.Dispatch<React.SetStateAction<boolean>>;
  showRescheduleDialog: boolean;
  setShowRescheduleDialog: React.Dispatch<React.SetStateAction<boolean>>;
  rescheduleMode: "single" | "shift";
  setRescheduleMode: React.Dispatch<React.SetStateAction<"single" | "shift">>;
  rescheduleDate: string;
  setRescheduleDate: React.Dispatch<React.SetStateAction<string>>;
  showReschedule: boolean;
  setShowReschedule: React.Dispatch<React.SetStateAction<boolean>>;

  // Add workout dialog
  showAddWorkoutDialog: boolean;
  setShowAddWorkoutDialog: React.Dispatch<React.SetStateAction<boolean>>;
  selectedDate: Date | null;
  setSelectedDate: React.Dispatch<React.SetStateAction<Date | null>>;
  newWorkoutName: string;
  setNewWorkoutName: React.Dispatch<React.SetStateAction<string>>;
  newWorkoutMuscles: string[];
  setNewWorkoutMuscles: React.Dispatch<React.SetStateAction<string[]>>;

  // Exercise card
  showExerciseCardDialog: boolean;
  setShowExerciseCardDialog: React.Dispatch<React.SetStateAction<boolean>>;
  selectedExerciseCard: GymExercise | null;
  exerciseHistory: Array<{ date: string; weight?: number; scheme?: string; completed: boolean }>;
  isLoadingHistory: boolean;

  // Additional activities
  newActivityType: AdditionalActivity["type"];
  setNewActivityType: React.Dispatch<React.SetStateAction<AdditionalActivity["type"]>>;
  newActivityValue: string;
  setNewActivityValue: React.Dispatch<React.SetStateAction<string>>;

  // Saving indicator
  savingSets: Set<string>;

  // Template select
  showTemplateSelectDialog: boolean;
  setShowTemplateSelectDialog: React.Dispatch<React.SetStateAction<boolean>>;
  templates: GymTemplate[];
  isLoadingTemplates: boolean;

  // Handlers
  loadWorkoutDetails: (workout: GymWorkout) => Promise<void>;
  loadExerciseHistory: (exercise: GymExercise) => Promise<void>;
  loadTemplates: () => Promise<void>;
  openExerciseCard: (exercise: GymExercise) => Promise<void>;
  handleAddFromTemplate: (template: {
    id: string;
    name: string;
    currentWeight?: number;
    nextWeight?: number;
    defaultReps?: number;
    defaultSets?: number;
    defaultScheme?: string;
  }) => Promise<void>;
  handleAddExercise: () => Promise<void>;
  handleAddSet: (exercise: GymExercise, isWarmup?: boolean) => Promise<void>;
  handleUpdateSet: (
    exerciseId: string,
    setId: string,
    updates: Partial<GymExerciseSet>,
    immediate?: boolean
  ) => Promise<void>;
  handleDeleteSet: (exerciseId: string, setId: string) => Promise<void>;
  handleSaveAdditionalActivities: (activities: AdditionalActivity[]) => Promise<void>;
  handleDeleteExercise: (exerciseId: string) => Promise<void>;
  handleToggleIncludeInFutureCycles: (exerciseId: string, currentValue: boolean) => Promise<void>;
  handleSkipWorkout: (shiftSchedule: boolean) => Promise<void>;
  handleRescheduleWorkout: (mode: "single" | "shift") => Promise<void>;
  handleAddWorkoutToDate: () => Promise<void>;
}

export function useGymSession({
  userId,
  activePeriod,
  workouts,
  setWorkouts,
  loadTodayData,
}: UseGymSessionParams): UseGymSessionResult {
  // Workout detail
  const [selectedWorkout, setSelectedWorkout] = useState<GymWorkout | null>(null);
  const [showWorkoutDetail, setShowWorkoutDetail] = useState(false);

  // Exercise editor
  const [editingExercise, setEditingExercise] = useState<GymExercise | null>(null);
  const [showExerciseEditor, setShowExerciseEditor] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [newExerciseMuscle, setNewExerciseMuscle] = useState("");

  // Exercise library
  const [showExerciseLibraryDialog, setShowExerciseLibraryDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EditingTemplate | null>(null);
  const [libraryMuscleFilter, setLibraryMuscleFilter] = useState<string | null>(null);

  // Skip / reschedule
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [rescheduleMode, setRescheduleMode] = useState<"single" | "shift">("single");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [showReschedule, setShowReschedule] = useState(false);

  // Add workout dialog
  const [showAddWorkoutDialog, setShowAddWorkoutDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [newWorkoutName, setNewWorkoutName] = useState("");
  const [newWorkoutMuscles, setNewWorkoutMuscles] = useState<string[]>([]);

  // Exercise card
  const [showExerciseCardDialog, setShowExerciseCardDialog] = useState(false);
  const [selectedExerciseCard, setSelectedExerciseCard] = useState<GymExercise | null>(null);
  const [exerciseHistory, setExerciseHistory] = useState<
    Array<{ date: string; weight?: number; scheme?: string; completed: boolean }>
  >([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Additional activities
  const [newActivityType, setNewActivityType] = useState<AdditionalActivity["type"]>("walk");
  const [newActivityValue, setNewActivityValue] = useState("");

  // Saving indicator
  const [savingSets, setSavingSets] = useState<Set<string>>(new Set());

  // Template select
  const [showTemplateSelectDialog, setShowTemplateSelectDialog] = useState(false);
  const [templates, setTemplates] = useState<GymTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  // Debounce refs for set updates — must co-locate with handleUpdateSet and unmount cleanup
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingUpdates = useRef<
    Record<string, { setId: string; updates: Record<string, unknown> }>
  >({});

  // Flush pending set updates on unmount
  useEffect(() => {
    return () => {
      Object.entries(debounceTimers.current).forEach(([key, timer]) => {
        if (timer) clearTimeout(timer);
        const pending = pendingUpdates.current[key];
        if (pending) {
          fetch("/api/gym/exercises/sets", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ setId: pending.setId, ...pending.updates }),
          }).catch(console.error);
        }
      });
      debounceTimers.current = {};
      pendingUpdates.current = {};
    };
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const reloadWorkouts = useCallback(async () => {
    if (!activePeriod?.id) return;
    const res = await fetch(`/api/gym/workouts?periodId=${activePeriod.id}`);
    const wData = (await res.json()) as { workouts?: GymWorkout[] };
    setWorkouts(
      (wData.workouts ?? []).map((w) => ({
        ...w,
        muscleGroups: parseMuscleGroups(w.muscleGroups as string | string[] | undefined),
      }))
    );
  }, [activePeriod?.id, setWorkouts]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const loadWorkoutDetails = useCallback(async (workout: GymWorkout) => {
    try {
      const response = await fetch(`/api/gym/workouts/${workout.id}`);
      const data = (await response.json()) as { workout?: GymWorkout };
      const muscleGroups = parseMuscleGroups(
        data.workout?.muscleGroups as string | string[] | undefined
      );
      setSelectedWorkout({ ...workout, muscleGroups, exercises: data.workout?.exercises ?? [] });
      setShowWorkoutDetail(true);
    } catch (error) {
      console.error("Failed to load workout details:", error);
      setSelectedWorkout({
        ...workout,
        muscleGroups: parseMuscleGroups(workout.muscleGroups as string | string[] | undefined),
      });
      setShowWorkoutDetail(true);
    }
  }, []);

  const loadExerciseHistory = useCallback(async (exercise: GymExercise) => {
    if (!exercise.templateId) {
      setExerciseHistory([]);
      return;
    }
    setIsLoadingHistory(true);
    try {
      const response = await fetch(`/api/gym/templates/${exercise.templateId}/history`);
      const data = (await response.json()) as {
        history?: Array<{ date: string; weight?: number; scheme?: string; completed: boolean }>;
      };
      setExerciseHistory(data.history ?? []);
    } catch {
      setExerciseHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    if (!userId) return;
    setIsLoadingTemplates(true);
    try {
      const response = await fetch(`/api/gym/templates?userId=${userId}`);
      const data = (await response.json()) as { templates?: GymTemplate[] };
      setTemplates(data.templates ?? []);
    } catch {
      setTemplates([]);
    } finally {
      setIsLoadingTemplates(false);
    }
  }, [userId]);

  const openExerciseCard = useCallback(
    async (exercise: GymExercise) => {
      setSelectedExerciseCard(exercise);
      setShowExerciseCardDialog(true);
      await loadExerciseHistory(exercise);
    },
    [loadExerciseHistory]
  );

  const handleAddFromTemplate = useCallback(
    async (template: {
      id: string;
      name: string;
      currentWeight?: number;
      nextWeight?: number;
      defaultReps?: number;
      defaultSets?: number;
      defaultScheme?: string;
    }) => {
      if (!selectedWorkout) return;
      try {
        const response = await fetch("/api/gym/exercises", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workoutId: selectedWorkout.id,
            name: template.name,
            templateId: template.id,
            order: (selectedWorkout.exercises?.length ?? 0) + 1,
            targetReps: template.defaultReps,
            targetSets: template.defaultSets ?? 4,
            weight: template.currentWeight ?? template.nextWeight,
            createSets: true,
          }),
        });
        const data = (await response.json()) as { exercise?: GymExercise };
        if (data.exercise) {
          setSelectedWorkout((prev) =>
            prev ? { ...prev, exercises: [...(prev.exercises ?? []), data.exercise!] } : null
          );
          setShowTemplateSelectDialog(false);
        }
      } catch (error) {
        console.error("Failed to add exercise from template:", error);
      }
    },
    [selectedWorkout]
  );

  const handleAddExercise = useCallback(async () => {
    if (!selectedWorkout || !newExerciseName) return;
    try {
      const response = await fetch("/api/gym/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workoutId: selectedWorkout.id,
          name: newExerciseName,
          muscleGroup: newExerciseMuscle,
          order: (selectedWorkout.exercises?.length ?? 0) + 1,
        }),
      });
      const data = (await response.json()) as { exercise?: GymExercise };
      if (data.exercise) {
        setSelectedWorkout((prev) =>
          prev ? { ...prev, exercises: [...(prev.exercises ?? []), data.exercise!] } : null
        );
        setNewExerciseName("");
        setNewExerciseMuscle("");
        setShowExerciseEditor(false);
      }
    } catch (error) {
      console.error("Failed to add exercise:", error);
    }
  }, [selectedWorkout, newExerciseName, newExerciseMuscle]);

  const handleAddSet = useCallback(async (exercise: GymExercise, isWarmup = false) => {
    try {
      const response = await fetch("/api/gym/exercises/sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseId: exercise.id,
          isWarmup,
          weight: isWarmup ? undefined : exercise.weight,
          reps: isWarmup ? undefined : exercise.targetReps,
        }),
      });
      const data = (await response.json()) as { set?: GymExerciseSet };
      if (data.set) {
        setSelectedWorkout((prev) =>
          prev
            ? {
                ...prev,
                exercises: prev.exercises?.map((e) =>
                  e.id === exercise.id
                    ? {
                        ...e,
                        sets: [...(e.sets ?? []), data.set!].sort(
                          (a: GymExerciseSet, b: GymExerciseSet) => a.setNum - b.setNum
                        ),
                      }
                    : e
                ),
              }
            : null
        );
      }
    } catch (error) {
      console.error("Failed to add set:", error);
    }
  }, []);

  const handleUpdateSet = useCallback(
    async (
      exerciseId: string,
      setId: string,
      updates: Partial<GymExerciseSet>,
      immediate = false
    ) => {
      // Optimistic update
      setSelectedWorkout((prev) =>
        prev
          ? {
              ...prev,
              exercises: prev.exercises?.map((e) =>
                e.id === exerciseId
                  ? {
                      ...e,
                      sets: e.sets?.map((s) =>
                        (s as GymExerciseSet).id === setId ? { ...s, ...updates } : s
                      ),
                    }
                  : e
              ),
            }
          : null
      );

      if (immediate || updates.completed !== undefined) {
        setSavingSets((prev) => new Set(prev).add(setId));
        try {
          const response = await fetch("/api/gym/exercises/sets", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ setId, ...updates }),
          });
          const data = (await response.json()) as { workoutStatusChanged?: boolean };
          if (data.workoutStatusChanged) void loadTodayData();
        } catch (error) {
          console.error("Failed to update set:", error);
        } finally {
          setTimeout(() => {
            setSavingSets((prev) => {
              const next = new Set(prev);
              next.delete(setId);
              return next;
            });
          }, 500);
        }
        return;
      }

      // Debounced path
      if (debounceTimers.current[setId]) clearTimeout(debounceTimers.current[setId]);
      pendingUpdates.current[setId] = { setId, updates };
      debounceTimers.current[setId] = setTimeout(async () => {
        setSavingSets((prev) => new Set(prev).add(setId));
        delete pendingUpdates.current[setId];
        try {
          await fetch("/api/gym/exercises/sets", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ setId, ...updates }),
          });
        } catch (error) {
          console.error("Failed to update set:", error);
        } finally {
          setTimeout(() => {
            setSavingSets((prev) => {
              const next = new Set(prev);
              next.delete(setId);
              return next;
            });
          }, 500);
        }
      }, 300);
    },
    [loadTodayData]
  );

  const handleDeleteSet = useCallback(async (exerciseId: string, setId: string) => {
    if (!confirm("Удалить этот подход?")) return;
    try {
      await fetch(`/api/gym/exercises/sets?setId=${setId}`, { method: "DELETE" });
      setSelectedWorkout((prev) =>
        prev
          ? {
              ...prev,
              exercises: prev.exercises?.map((e) =>
                e.id === exerciseId
                  ? { ...e, sets: e.sets?.filter((s) => (s as GymExerciseSet).id !== setId) }
                  : e
              ),
            }
          : null
      );
    } catch (error) {
      console.error("Failed to delete set:", error);
    }
  }, []);

  const handleSaveAdditionalActivities = useCallback(
    async (activities: AdditionalActivity[]) => {
      if (!selectedWorkout) return;
      try {
        await fetch("/api/gym/workouts", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workoutId: selectedWorkout.id,
            additionalActivities: activities,
          }),
        });
      } catch (error) {
        console.error("Failed to save additional activities:", error);
      }
    },
    [selectedWorkout]
  );

  const handleDeleteExercise = useCallback(async (exerciseId: string) => {
    if (!confirm("Удалить упражнение из этой тренировки?")) return;
    try {
      await fetch(`/api/gym/exercises?exerciseId=${exerciseId}`, { method: "DELETE" });
      setSelectedWorkout((prev) =>
        prev ? { ...prev, exercises: prev.exercises?.filter((e) => e.id !== exerciseId) } : null
      );
    } catch (error) {
      console.error("Failed to delete exercise:", error);
    }
  }, []);

  const handleToggleIncludeInFutureCycles = useCallback(
    async (exerciseId: string, currentValue: boolean) => {
      const newValue = !currentValue;
      setSelectedWorkout((prev) =>
        prev
          ? {
              ...prev,
              exercises: prev.exercises?.map((e) =>
                e.id === exerciseId ? { ...e, includeInFutureCycles: newValue } : e
              ),
            }
          : null
      );
      try {
        await fetch("/api/gym/exercises", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ exerciseId, includeInFutureCycles: newValue }),
        });
      } catch (error) {
        console.error("Failed to toggle includeInFutureCycles:", error);
        setSelectedWorkout((prev) =>
          prev
            ? {
                ...prev,
                exercises: prev.exercises?.map((e) =>
                  e.id === exerciseId ? { ...e, includeInFutureCycles: currentValue } : e
                ),
              }
            : null
        );
      }
    },
    []
  );

  const handleSkipWorkout = useCallback(
    async (shiftSchedule: boolean) => {
      if (!selectedWorkout || !activePeriod) return;
      try {
        const response = await fetch("/api/gym/workouts/skip", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workoutId: selectedWorkout.id,
            periodId: activePeriod.id,
            shiftSchedule,
          }),
        });
        const data = (await response.json()) as { success?: boolean };
        if (data.success) {
          setShowSkipDialog(false);
          setShowWorkoutDetail(false);
          await reloadWorkouts();
        }
      } catch (error) {
        console.error("Failed to skip workout:", error);
      }
    },
    [selectedWorkout, activePeriod, reloadWorkouts]
  );

  const handleRescheduleWorkout = useCallback(
    async (mode: "single" | "shift") => {
      if (!selectedWorkout || !activePeriod || !rescheduleDate) return;
      try {
        await fetch("/api/gym/workouts/reschedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workoutId: selectedWorkout.id,
            periodId: activePeriod.id,
            newDate: rescheduleDate,
            ...(mode === "shift" ? { shiftCycle: true } : {}),
          }),
        });
        setShowRescheduleDialog(false);
        setShowWorkoutDetail(false);
        setRescheduleDate("");
        await reloadWorkouts();
      } catch (error) {
        console.error("Failed to reschedule workout:", error);
      }
    },
    [selectedWorkout, activePeriod, rescheduleDate, reloadWorkouts]
  );

  const handleAddWorkoutToDate = useCallback(async () => {
    if (!selectedDate || !activePeriod || !userId) return;
    const name = newWorkoutName || `Тренировка ${workouts.length + 1}`;
    try {
      const response = await fetch("/api/gym/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodId: activePeriod.id,
          date: selectedDate.toISOString(),
          name,
          muscleGroups: newWorkoutMuscles,
          workoutNum: workouts.filter((w) => !w.completed).length + 1,
          isManual: true,
        }),
      });
      const data = (await response.json()) as { workout?: GymWorkout };
      if (data.workout) {
        setShowAddWorkoutDialog(false);
        setSelectedDate(null);
        setNewWorkoutName("");
        setNewWorkoutMuscles([]);
        await reloadWorkouts();
      }
    } catch (error) {
      console.error("Failed to add workout:", error);
    }
  }, [
    selectedDate,
    activePeriod,
    userId,
    newWorkoutName,
    newWorkoutMuscles,
    workouts,
    reloadWorkouts,
  ]);

  return {
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
    showExerciseLibraryDialog,
    setShowExerciseLibraryDialog,
    editingTemplate,
    setEditingTemplate,
    libraryMuscleFilter,
    setLibraryMuscleFilter,
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
    handleSkipWorkout,
    handleRescheduleWorkout,
    handleAddWorkoutToDate,
  };
}
