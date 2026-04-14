"use client";

import type { DayScheduleItem, WorkoutDayConfig } from "@/features/gym";

/**
 * Parse muscleGroups from API — may arrive as JSON string or already-parsed array.
 * Deduplicates the 4× repeated inline pattern in GymContext.
 */
export function parseMuscleGroups(raw: string | string[] | null | undefined): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export function getWorkoutName(_type: string, workoutNum: number): string {
  return `Тренировка ${workoutNum}`;
}

/**
 * Generate an evenly-distributed day schedule for a new period.
 * Pure function — no side effects.
 */
export function generateInitialSchedule(
  cycleLen: number,
  workoutsCount: number,
  days?: WorkoutDayConfig[]
): DayScheduleItem[] {
  const schedule: DayScheduleItem[] = [];
  const workoutPositions: number[] = [];
  for (let i = 0; i < workoutsCount; i++) {
    workoutPositions.push(Math.floor((i * cycleLen) / workoutsCount) + 1);
  }
  for (let dayNum = 1; dayNum <= cycleLen; dayNum++) {
    if (workoutPositions.includes(dayNum)) {
      const workoutNum = workoutPositions.indexOf(dayNum) + 1;
      const dayConfig = days?.find((d) => d.dayNum === workoutNum);
      schedule.push({
        type: "workout",
        dayNum,
        workoutNum,
        name: dayConfig?.name ?? `Тренировка ${workoutNum}`,
        muscleGroups: dayConfig?.muscles ?? [],
      });
    } else {
      schedule.push({ type: "rest", dayNum });
    }
  }
  return schedule;
}

/**
 * Progression weight calculation extracted from finalizeWorkout.
 * easy → +step, hard → -step (floor 0), normal → unchanged.
 */
export function calcProgressionWeight(
  currentWeight: number | undefined,
  rating: "easy" | "normal" | "hard",
  step: number,
  fallback: number | undefined
): number | undefined {
  if (currentWeight === undefined) return fallback;
  if (rating === "easy") return currentWeight + step;
  if (rating === "hard") return Math.max(0, currentWeight - step);
  return currentWeight;
}
