"use client";

import { useCallback, useEffect, useState } from "react";
import { showErrorToast, showSuccessToast } from "@/lib/network-utils";
import {
  TRAINING_TYPES,
  WORKOUT_TEMPLATES,
  type DayScheduleItem,
  type WorkoutDayConfig,
  type GymPeriod,
} from "@/features/gym";
import { generateInitialSchedule, getWorkoutName } from "@/features/gym/lib/gym-helpers";

type WizardConfig = {
  type: string;
  customName: string;
  cycleLength: number;
  workoutsPerCycle: number;
  totalCycles: number;
  splitType: string;
};

export type WizardExercises = Record<
  number,
  Array<{ templateId?: string; name: string; muscleGroup?: string; order: number }>
>;

interface UseGymWizardParams {
  userId: string | undefined;
  loadPeriods: () => Promise<void>;
  setPeriods: React.Dispatch<React.SetStateAction<GymPeriod[]>>;
  setActivePeriod: React.Dispatch<React.SetStateAction<GymPeriod | null>>;
}

export interface UseGymWizardResult {
  showWizard: boolean;
  setShowWizard: React.Dispatch<React.SetStateAction<boolean>>;
  wizardStep: number;
  setWizardStep: React.Dispatch<React.SetStateAction<number>>;
  wizardConfig: WizardConfig;
  setWizardConfig: React.Dispatch<React.SetStateAction<WizardConfig>>;
  workoutDays: WorkoutDayConfig[];
  setWorkoutDays: React.Dispatch<React.SetStateAction<WorkoutDayConfig[]>>;
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
  applyTemplate: (templateId: string) => void;
  handleDragStart: (index: number) => void;
  handleDragOver: (e: React.DragEvent, index: number) => void;
  handleDragEnd: () => void;
  toggleDayType: (index: number) => void;
  resetWizard: () => void;
  handleCreatePeriod: () => Promise<void>;
}

const INITIAL_WIZARD_CONFIG: WizardConfig = {
  type: "strength",
  customName: "",
  cycleLength: 7,
  workoutsPerCycle: 3,
  totalCycles: 8,
  splitType: "split",
};

export function useGymWizard({
  userId,
  loadPeriods: _loadPeriods,
  setPeriods,
  setActivePeriod,
}: UseGymWizardParams): UseGymWizardResult {
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardConfig, setWizardConfig] = useState<WizardConfig>(INITIAL_WIZARD_CONFIG);
  const [workoutDays, setWorkoutDays] = useState<WorkoutDayConfig[]>([]);
  const [daySchedule, setDaySchedule] = useState<DayScheduleItem[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [wizardExercises, setWizardExercises] = useState<WizardExercises>({});
  const [showWizardExercisePicker, setShowWizardExercisePicker] = useState(false);
  const [selectedWorkoutNumForExercise, setSelectedWorkoutNumForExercise] = useState<number | null>(
    null
  );

  // Initialize workout days on step 2; schedule on step 3
  // Using .length as deps (not full arrays) to avoid re-render loops

  useEffect(() => {
    if (wizardStep === 2 && workoutDays.length === 0 && !selectedTemplate) {
      const days: WorkoutDayConfig[] = [];
      for (let i = 1; i <= wizardConfig.workoutsPerCycle; i++) {
        days.push({
          dayNum: i,
          muscles: [],
          name: getWorkoutName(wizardConfig.splitType, i),
        });
      }
      setWorkoutDays(days);
    }
    if (wizardStep === 3 && daySchedule.length === 0) {
      setDaySchedule(
        generateInitialSchedule(
          wizardConfig.cycleLength,
          wizardConfig.workoutsPerCycle,
          workoutDays
        )
      );
    }
    // intentionally using .length to avoid loops — matches original behaviour
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    wizardStep,
    wizardConfig.cycleLength,
    wizardConfig.workoutsPerCycle,
    wizardConfig.splitType,
    workoutDays.length,
    daySchedule.length,
    selectedTemplate,
  ]);

  const applyTemplate = useCallback((templateId: string) => {
    const template = WORKOUT_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    setSelectedTemplate(templateId);
    setWizardConfig((prev) => ({
      ...prev,
      cycleLength: template.cycleLength,
      workoutsPerCycle: template.workoutsPerCycle,
      splitType: template.splitType,
    }));
    const days: WorkoutDayConfig[] = template.daySchedule
      .filter((d) => d.type === "workout")
      .map((d, idx) => ({
        dayNum: idx + 1,
        muscles: d.muscleGroups ?? [],
        name: d.name ?? `Тренировка ${idx + 1}`,
      }));
    setWorkoutDays(days);
    setDaySchedule(template.daySchedule.map((item, idx) => ({ ...item, dayNum: idx + 1 })));
  }, []);

  const handleDragStart = (index: number) => setDraggedIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };
  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const newSchedule = [...daySchedule];
      const [item] = newSchedule.splice(draggedIndex, 1);
      newSchedule.splice(dragOverIndex, 0, item);
      newSchedule.forEach((s, idx) => {
        s.dayNum = idx + 1;
      });
      setDaySchedule(newSchedule);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const toggleDayType = (index: number) => {
    const newSchedule = [...daySchedule];
    const item = newSchedule[index];
    if (item.type === "rest") {
      const maxWorkoutNum = Math.max(
        ...newSchedule.filter((d) => d.type === "workout").map((d) => d.workoutNum ?? 0),
        0
      );
      newSchedule[index] = {
        type: "workout",
        dayNum: item.dayNum,
        workoutNum: maxWorkoutNum + 1,
        name: `Тренировка ${maxWorkoutNum + 1}`,
        muscleGroups: [],
      };
    } else {
      newSchedule[index] = { type: "rest", dayNum: item.dayNum };
      let workoutCount = 0;
      newSchedule.forEach((d) => {
        if (d.type === "workout") {
          workoutCount++;
          d.workoutNum = workoutCount;
        }
      });
    }
    setDaySchedule(newSchedule);
  };

  const resetWizard = useCallback(() => {
    setWizardStep(1);
    setWizardConfig(INITIAL_WIZARD_CONFIG);
    setWorkoutDays([]);
    setDaySchedule([]);
    setSelectedTemplate(null);
    setWizardExercises({});
  }, []);

  const handleCreatePeriod = useCallback(async () => {
    if (!userId) return;
    const name =
      wizardConfig.type === "custom"
        ? wizardConfig.customName
        : (TRAINING_TYPES.find((t) => t.value === wizardConfig.type)?.label ?? "Период");
    const finalSchedule = daySchedule.map((item, idx) => {
      if (item.type === "workout" && item.workoutNum) {
        const dayConfig = workoutDays.find((d) => d.dayNum === item.workoutNum);
        return {
          ...item,
          dayNum: idx + 1,
          name: dayConfig?.name ?? item.name ?? `Тренировка ${item.workoutNum}`,
          muscleGroups: dayConfig?.muscles ?? item.muscleGroups ?? [],
        };
      }
      return { ...item, dayNum: idx + 1 };
    });
    try {
      const response = await fetch("/api/gym", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          name,
          type: wizardConfig.splitType,
          cycleLength: wizardConfig.cycleLength,
          workoutsPerCycle: wizardConfig.workoutsPerCycle,
          totalCycles: wizardConfig.totalCycles,
          workoutDays: workoutDays.map((d) => ({
            workoutNum: d.dayNum,
            name: d.name,
            muscleGroups: d.muscles,
          })),
          daySchedule: finalSchedule,
          workoutExercises: wizardExercises,
        }),
      });
      const data = (await response.json()) as { period?: GymPeriod };
      if (data.period) {
        setPeriods((prev) => [...prev, data.period!]);
        setActivePeriod(data.period!);
        setShowWizard(false);
        resetWizard();
        showSuccessToast("Период тренировок создан");
      }
    } catch (error) {
      showErrorToast(error, "создание периода");
    }
  }, [
    userId,
    wizardConfig,
    daySchedule,
    workoutDays,
    wizardExercises,
    setPeriods,
    setActivePeriod,
    resetWizard,
  ]);

  return {
    showWizard,
    setShowWizard,
    wizardStep,
    setWizardStep,
    wizardConfig,
    setWizardConfig,
    workoutDays,
    setWorkoutDays,
    daySchedule,
    setDaySchedule,
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
    applyTemplate,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    toggleDayType,
    resetWizard,
    handleCreatePeriod,
  };
}
