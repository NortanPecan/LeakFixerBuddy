"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useAppStore } from "@/lib/store";
import type {
  DayScheduleItem,
  GymExercise,
  GymExerciseSet,
  GymPeriod,
  GymWorkout,
  AdditionalActivity,
} from "@/features/gym";
import { useGymData } from "@/features/gym/hooks/use-gym-data";
import { useGymSchedule } from "@/features/gym/hooks/use-gym-schedule";
import { useGymWizard, type WizardExercises } from "@/features/gym/hooks/use-gym-wizard";
import { useGymSession } from "@/features/gym/hooks/use-gym-session";
import { useGymCompletion } from "@/features/gym/hooks/use-gym-completion";

// ─── Re-exported types ────────────────────────────────────────────────────────
// (kept here so existing imports from "@/features/gym/GymContext" still work)

export interface TodayWorkoutExercise {
  id: string;
  name: string;
  order: number;
  muscleGroup?: string;
  weight?: number;
  targetReps?: number;
  targetSets?: number;
  repsScheme?: string;
  nextWeight?: number;
  techniqueNotes?: string;
  cycleNote?: string;
  lastCycleNote?: string;
  template?: {
    currentWeight?: number;
    nextWeight?: number;
    defaultScheme?: string;
    defaultReps?: number;
    defaultSets?: number;
    techniqueNotes?: string;
  };
  sets: Array<{ weight?: number; reps?: number; completed: boolean; isWarmup?: boolean }>;
}

export interface TodayData {
  hasActivePeriod: boolean;
  period?: {
    id: string;
    name: string;
    currentCycle: number;
    totalCycles: number;
    progressPercent: number;
  };
  todayWorkout?: {
    id: string;
    name: string | null;
    muscleGroups: string[];
    status: string;
    completed: boolean;
    cycleNumber?: number;
    workoutNum?: number;
    template?: { name: string; muscleGroups: string[] };
    exercises: TodayWorkoutExercise[];
  };
  nextWorkout?: { id: string; date: string; name: string | null; workoutNum?: number };
  isToday: boolean;
}

// ─── Context value type ───────────────────────────────────────────────────────

export interface GymContextValue {
  user: ReturnType<typeof useAppStore.getState>["user"];

  // Core data
  periods: GymPeriod[];
  setPeriods: React.Dispatch<React.SetStateAction<GymPeriod[]>>;
  activePeriod: GymPeriod | null;
  setActivePeriod: React.Dispatch<React.SetStateAction<GymPeriod | null>>;
  workouts: GymWorkout[];
  setWorkouts: React.Dispatch<React.SetStateAction<GymWorkout[]>>;
  currentMonth: Date;
  setCurrentMonth: React.Dispatch<React.SetStateAction<Date>>;
  isLoading: boolean;
  showPeriodList: boolean;
  setShowPeriodList: React.Dispatch<React.SetStateAction<boolean>>;

  // Today data
  todayData: TodayData | null;
  isLoadingToday: boolean;

  // Wizard state
  showWizard: boolean;
  setShowWizard: React.Dispatch<React.SetStateAction<boolean>>;
  wizardStep: number;
  setWizardStep: React.Dispatch<React.SetStateAction<number>>;
  wizardConfig: {
    type: string;
    customName: string;
    cycleLength: number;
    workoutsPerCycle: number;
    totalCycles: number;
    splitType: string;
  };
  setWizardConfig: React.Dispatch<React.SetStateAction<GymContextValue["wizardConfig"]>>;
  workoutDays: import("@/features/gym").WorkoutDayConfig[];
  setWorkoutDays: React.Dispatch<React.SetStateAction<import("@/features/gym").WorkoutDayConfig[]>>;
  daySchedule: DayScheduleItem[];
  setDaySchedule: React.Dispatch<React.SetStateAction<DayScheduleItem[]>>;
  selectedTemplate: string | null;
  setSelectedTemplate: React.Dispatch<React.SetStateAction<string | null>>;
  draggedIndex: number | null;
  dragOverIndex: number | null;
  wizardExercises: WizardExercises;
  setWizardExercises: React.Dispatch<React.SetStateAction<WizardExercises>>;
  showWizardExercisePicker: boolean;
  setShowWizardExercisePicker: React.Dispatch<React.SetStateAction<boolean>>;
  selectedWorkoutNumForExercise: number | null;
  setSelectedWorkoutNumForExercise: React.Dispatch<React.SetStateAction<number | null>>;

  // Exercise library
  showExerciseLibraryDialog: boolean;
  setShowExerciseLibraryDialog: React.Dispatch<React.SetStateAction<boolean>>;
  editingTemplate: {
    id?: string;
    name: string;
    muscleGroup?: string;
    defaultScheme?: string;
    defaultReps?: number;
    defaultSets?: number;
    currentWeight?: number;
    nextWeight?: number;
    techniqueNotes?: string;
  } | null;
  setEditingTemplate: React.Dispatch<React.SetStateAction<GymContextValue["editingTemplate"]>>;
  libraryMuscleFilter: string | null;
  setLibraryMuscleFilter: React.Dispatch<React.SetStateAction<string | null>>;

  // Parsed day schedule
  parsedDaySchedule: DayScheduleItem[];
  setParsedDaySchedule: React.Dispatch<React.SetStateAction<DayScheduleItem[]>>;

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

  // Schedule edit
  scheduleEdited: boolean;

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

  // Post-workout dialog
  showPostWorkoutDialog: boolean;
  setShowPostWorkoutDialog: React.Dispatch<React.SetStateAction<boolean>>;
  exerciseRatings: Record<string, "easy" | "normal" | "hard">;
  setExerciseRatings: React.Dispatch<
    React.SetStateAction<Record<string, "easy" | "normal" | "hard">>
  >;
  editingActivities: AdditionalActivity[];
  setEditingActivities: React.Dispatch<React.SetStateAction<AdditionalActivity[]>>;

  // Exercise card dialog
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

  // Template select dialog
  showTemplateSelectDialog: boolean;
  setShowTemplateSelectDialog: React.Dispatch<React.SetStateAction<boolean>>;
  templates: Array<{
    id: string;
    name: string;
    muscleGroup?: string;
    currentWeight?: number;
    defaultScheme?: string;
    defaultReps?: number;
    defaultSets?: number;
    nextWeight?: number;
    techniqueNotes?: string;
  }>;
  isLoadingTemplates: boolean;
  personalRecords: Record<string, number>;

  // Quick complete dialog
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

  // Completion preview
  showCompletionPreview: boolean;
  setShowCompletionPreview: React.Dispatch<React.SetStateAction<boolean>>;
  completionData: {
    exercises: Array<{
      name: string;
      weight?: number;
      reps?: number;
      sets?: number;
      nextWeight?: number;
    }>;
    note?: string;
  };

  // Drag for schedule
  scheduleDraggedIdx: number | null;
  scheduleDragOverIdx: number | null;

  // Computed/derived
  calendarDays: (null | { date: Date; workout: GymWorkout | undefined; dayNum: number })[];
  periodProgress: number;
  nextWorkout: GymWorkout | null;
  completedWorkouts: number;
  calendarPreview: { date: Date; item: DayScheduleItem; isToday: boolean }[];

  // Handlers
  loadPeriods: () => Promise<void>;
  loadTodayData: () => Promise<void>;
  applyTemplate: (templateId: string) => void;
  handleDragStart: (index: number) => void;
  handleDragOver: (e: React.DragEvent, index: number) => void;
  handleDragEnd: () => void;
  handleScheduleDragStart: (index: number) => void;
  handleScheduleDragOver: (e: React.DragEvent, index: number) => void;
  handleScheduleDragEnd: () => void;
  handleSaveSchedule: () => Promise<void>;
  handleSkipWorkout: (shiftSchedule: boolean) => Promise<void>;
  handleRescheduleWorkout: (mode: "single" | "shift") => Promise<void>;
  handleAddWorkoutToDate: () => Promise<void>;
  handleCreatePeriod: () => Promise<void>;
  resetWizard: () => void;
  handleCompleteWorkout: (workoutId: string) => Promise<void>;
  openQuickCompleteDialog: () => void;
  getUnfilledSetsInfo: () => Array<{
    exerciseName: string;
    exerciseId: string;
    setNum: number;
    setId: string;
  }>;
  handleAutoFillSets: () => void;
  handleConfirmQuickComplete: () => Promise<void>;
  handleUndoComplete: () => Promise<void>;
  finalizeWorkout: (
    workoutId: string,
    ratings: Record<string, "easy" | "normal" | "hard">,
    activities: AdditionalActivity[],
    note?: string,
    stretchingDone?: boolean
  ) => Promise<void>;
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
  toggleDayType: (index: number) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const GymContext = createContext<GymContextValue | null>(null);

export function useGymContext(): GymContextValue {
  const ctx = useContext(GymContext);
  if (!ctx) throw new Error("useGymContext must be used within GymProvider");
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function GymProvider({ children }: { children: ReactNode }) {
  const { user } = useAppStore();

  // ── Domain hooks ────────────────────────────────────────────────────────────

  const data = useGymData(user?.id);

  const schedule = useGymSchedule({
    activePeriod: data.activePeriod,
    loadPeriods: data.loadPeriods,
  });

  const wizard = useGymWizard({
    userId: user?.id,
    loadPeriods: data.loadPeriods,
    setPeriods: data.setPeriods,
    setActivePeriod: data.setActivePeriod,
  });

  const session = useGymSession({
    userId: user?.id,
    activePeriod: data.activePeriod,
    workouts: data.workouts,
    setWorkouts: data.setWorkouts,
    loadTodayData: data.loadTodayData,
  });

  const completion = useGymCompletion({
    selectedWorkout: session.selectedWorkout,
    loadTodayData: data.loadTodayData,
    setWorkouts: data.setWorkouts,
    setShowWorkoutDetail: session.setShowWorkoutDetail,
  });

  // ── Derived / computed selectors ────────────────────────────────────────────

  const calendarDays = useMemo(() => {
    const year = data.currentMonth.getFullYear();
    const month = data.currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = (firstDay.getDay() + 6) % 7;
    const days: (null | { date: Date; workout: GymWorkout | undefined; dayNum: number })[] = [];
    for (let i = 0; i < startPadding; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const workout = data.workouts.find((w) => w.date.split("T")[0] === dateStr);
      days.push({ date, workout, dayNum: d });
    }
    return days;
  }, [data.currentMonth, data.workouts]);

  const periodProgress = useMemo(() => {
    if (!data.activePeriod) return 0;
    const completedCount = data.workouts.filter((w) => w.completed).length;
    const total = data.activePeriod.totalCycles * data.activePeriod.workoutsPerCycle;
    return Math.min(100, (completedCount / total) * 100);
  }, [data.activePeriod, data.workouts]);

  const nextWorkout = useMemo((): GymWorkout | null => {
    if (!data.activePeriod) return null;
    const today = new Date().toISOString().split("T")[0];
    return (
      data.workouts
        .filter((w) => !w.completed && w.date.split("T")[0] >= today)
        .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null
    );
  }, [data.activePeriod, data.workouts]);

  const completedWorkouts = useMemo(
    () => data.workouts.filter((w) => w.completed).length,
    [data.workouts]
  );

  const calendarPreview = useMemo(() => {
    if (wizard.daySchedule.length === 0) return [];
    const today = new Date();
    return Array.from({ length: 14 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const scheduleIdx = i % wizard.daySchedule.length;
      return { date, item: wizard.daySchedule[scheduleIdx], isToday: i === 0 };
    });
  }, [wizard.daySchedule]);

  // ── handleAutoFillSets wires completion → session ──────────────────────────

  const handleAutoFillSets = useCallback(() => {
    completion.handleAutoFillSets(session.handleUpdateSet);
  }, [completion, session.handleUpdateSet]);

  // ── Assemble value ──────────────────────────────────────────────────────────

  const value: GymContextValue = {
    user,

    // data
    periods: data.periods,
    setPeriods: data.setPeriods,
    activePeriod: data.activePeriod,
    setActivePeriod: data.setActivePeriod,
    workouts: data.workouts,
    setWorkouts: data.setWorkouts,
    currentMonth: data.currentMonth,
    setCurrentMonth: data.setCurrentMonth,
    isLoading: data.isLoading,
    showPeriodList: data.showPeriodList,
    setShowPeriodList: data.setShowPeriodList,
    todayData: data.todayData,
    isLoadingToday: data.isLoadingToday,
    personalRecords: data.personalRecords,
    loadPeriods: data.loadPeriods,
    loadTodayData: data.loadTodayData,

    // schedule
    parsedDaySchedule: schedule.parsedDaySchedule,
    setParsedDaySchedule: schedule.setParsedDaySchedule,
    scheduleEdited: schedule.scheduleEdited,
    scheduleDraggedIdx: schedule.scheduleDraggedIdx,
    scheduleDragOverIdx: schedule.scheduleDragOverIdx,
    handleScheduleDragStart: schedule.handleScheduleDragStart,
    handleScheduleDragOver: schedule.handleScheduleDragOver,
    handleScheduleDragEnd: schedule.handleScheduleDragEnd,
    handleSaveSchedule: schedule.handleSaveSchedule,

    // wizard
    showWizard: wizard.showWizard,
    setShowWizard: wizard.setShowWizard,
    wizardStep: wizard.wizardStep,
    setWizardStep: wizard.setWizardStep,
    wizardConfig: wizard.wizardConfig,
    setWizardConfig: wizard.setWizardConfig,
    workoutDays: wizard.workoutDays,
    setWorkoutDays: wizard.setWorkoutDays,
    daySchedule: wizard.daySchedule,
    setDaySchedule: wizard.setDaySchedule,
    selectedTemplate: wizard.selectedTemplate,
    setSelectedTemplate: wizard.setSelectedTemplate,
    draggedIndex: wizard.draggedIndex,
    dragOverIndex: wizard.dragOverIndex,
    wizardExercises: wizard.wizardExercises,
    setWizardExercises: wizard.setWizardExercises,
    showWizardExercisePicker: wizard.showWizardExercisePicker,
    setShowWizardExercisePicker: wizard.setShowWizardExercisePicker,
    selectedWorkoutNumForExercise: wizard.selectedWorkoutNumForExercise,
    setSelectedWorkoutNumForExercise: wizard.setSelectedWorkoutNumForExercise,
    applyTemplate: wizard.applyTemplate,
    handleDragStart: wizard.handleDragStart,
    handleDragOver: wizard.handleDragOver,
    handleDragEnd: wizard.handleDragEnd,
    toggleDayType: wizard.toggleDayType,
    resetWizard: wizard.resetWizard,
    handleCreatePeriod: wizard.handleCreatePeriod,

    // session
    selectedWorkout: session.selectedWorkout,
    setSelectedWorkout: session.setSelectedWorkout,
    showWorkoutDetail: session.showWorkoutDetail,
    setShowWorkoutDetail: session.setShowWorkoutDetail,
    editingExercise: session.editingExercise,
    setEditingExercise: session.setEditingExercise,
    showExerciseEditor: session.showExerciseEditor,
    setShowExerciseEditor: session.setShowExerciseEditor,
    newExerciseName: session.newExerciseName,
    setNewExerciseName: session.setNewExerciseName,
    newExerciseMuscle: session.newExerciseMuscle,
    setNewExerciseMuscle: session.setNewExerciseMuscle,
    showExerciseLibraryDialog: session.showExerciseLibraryDialog,
    setShowExerciseLibraryDialog: session.setShowExerciseLibraryDialog,
    editingTemplate: session.editingTemplate,
    setEditingTemplate: session.setEditingTemplate,
    libraryMuscleFilter: session.libraryMuscleFilter,
    setLibraryMuscleFilter: session.setLibraryMuscleFilter,
    showSkipDialog: session.showSkipDialog,
    setShowSkipDialog: session.setShowSkipDialog,
    showRescheduleDialog: session.showRescheduleDialog,
    setShowRescheduleDialog: session.setShowRescheduleDialog,
    rescheduleMode: session.rescheduleMode,
    setRescheduleMode: session.setRescheduleMode,
    rescheduleDate: session.rescheduleDate,
    setRescheduleDate: session.setRescheduleDate,
    showReschedule: session.showReschedule,
    setShowReschedule: session.setShowReschedule,
    showAddWorkoutDialog: session.showAddWorkoutDialog,
    setShowAddWorkoutDialog: session.setShowAddWorkoutDialog,
    selectedDate: session.selectedDate,
    setSelectedDate: session.setSelectedDate,
    newWorkoutName: session.newWorkoutName,
    setNewWorkoutName: session.setNewWorkoutName,
    newWorkoutMuscles: session.newWorkoutMuscles,
    setNewWorkoutMuscles: session.setNewWorkoutMuscles,
    showExerciseCardDialog: session.showExerciseCardDialog,
    setShowExerciseCardDialog: session.setShowExerciseCardDialog,
    selectedExerciseCard: session.selectedExerciseCard,
    exerciseHistory: session.exerciseHistory,
    isLoadingHistory: session.isLoadingHistory,
    newActivityType: session.newActivityType,
    setNewActivityType: session.setNewActivityType,
    newActivityValue: session.newActivityValue,
    setNewActivityValue: session.setNewActivityValue,
    savingSets: session.savingSets,
    showTemplateSelectDialog: session.showTemplateSelectDialog,
    setShowTemplateSelectDialog: session.setShowTemplateSelectDialog,
    templates: session.templates,
    isLoadingTemplates: session.isLoadingTemplates,
    loadWorkoutDetails: session.loadWorkoutDetails,
    loadExerciseHistory: session.loadExerciseHistory,
    loadTemplates: session.loadTemplates,
    openExerciseCard: session.openExerciseCard,
    handleAddFromTemplate: session.handleAddFromTemplate,
    handleAddExercise: session.handleAddExercise,
    handleAddSet: session.handleAddSet,
    handleUpdateSet: session.handleUpdateSet,
    handleDeleteSet: session.handleDeleteSet,
    handleSaveAdditionalActivities: session.handleSaveAdditionalActivities,
    handleDeleteExercise: session.handleDeleteExercise,
    handleToggleIncludeInFutureCycles: session.handleToggleIncludeInFutureCycles,
    handleSkipWorkout: session.handleSkipWorkout,
    handleRescheduleWorkout: session.handleRescheduleWorkout,
    handleAddWorkoutToDate: session.handleAddWorkoutToDate,

    // completion
    showPostWorkoutDialog: completion.showPostWorkoutDialog,
    setShowPostWorkoutDialog: completion.setShowPostWorkoutDialog,
    exerciseRatings: completion.exerciseRatings,
    setExerciseRatings: completion.setExerciseRatings,
    editingActivities: completion.editingActivities,
    setEditingActivities: completion.setEditingActivities,
    showQuickCompleteDialog: completion.showQuickCompleteDialog,
    setShowQuickCompleteDialog: completion.setShowQuickCompleteDialog,
    quickCompleteNextWeights: completion.quickCompleteNextWeights,
    setQuickCompleteNextWeights: completion.setQuickCompleteNextWeights,
    workoutNote: completion.workoutNote,
    setWorkoutNote: completion.setWorkoutNote,
    stretchingDone: completion.stretchingDone,
    setStretchingDone: completion.setStretchingDone,
    showCompletionPreview: completion.showCompletionPreview,
    setShowCompletionPreview: completion.setShowCompletionPreview,
    completionData: completion.completionData,
    handleCompleteWorkout: completion.handleCompleteWorkout,
    openQuickCompleteDialog: completion.openQuickCompleteDialog,
    getUnfilledSetsInfo: completion.getUnfilledSetsInfo,
    handleAutoFillSets,
    handleConfirmQuickComplete: completion.handleConfirmQuickComplete,
    handleUndoComplete: completion.handleUndoComplete,
    finalizeWorkout: completion.finalizeWorkout,

    // derived
    calendarDays,
    periodProgress,
    nextWorkout,
    completedWorkouts,
    calendarPreview,
  };

  return <GymContext.Provider value={value}>{children}</GymContext.Provider>;
}
