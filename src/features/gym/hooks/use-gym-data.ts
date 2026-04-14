"use client";

import { useCallback, useEffect, useState } from "react";
import type { GymPeriod, GymWorkout } from "@/features/gym";
import { parseMuscleGroups } from "@/features/gym/lib/gym-helpers";
import type { TodayData } from "@/features/gym/GymContext";

export interface UseGymDataResult {
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
  todayData: TodayData | null;
  isLoadingToday: boolean;
  personalRecords: Record<string, number>;
  loadPeriods: () => Promise<void>;
  loadTodayData: () => Promise<void>;
}

export function useGymData(userId: string | undefined): UseGymDataResult {
  const [periods, setPeriods] = useState<GymPeriod[]>([]);
  const [activePeriod, setActivePeriod] = useState<GymPeriod | null>(null);
  const [workouts, setWorkouts] = useState<GymWorkout[]>([]);
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [showPeriodList, setShowPeriodList] = useState(false);
  const [todayData, setTodayData] = useState<TodayData | null>(null);
  const [isLoadingToday, setIsLoadingToday] = useState(false);
  const [personalRecords, setPersonalRecords] = useState<Record<string, number>>({});

  const loadPeriods = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/gym?userId=${userId}`);
      const data = (await response.json()) as { periods?: GymPeriod[] };
      const list = data.periods ?? [];
      setPeriods(list);
      if (list.length > 0) {
        setActivePeriod((prev) => {
          if (prev) return prev;
          return list.find((p) => p.isActive) ?? list[0] ?? null;
        });
      }
    } catch (error) {
      console.error("Failed to load gym periods:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const loadTodayData = useCallback(async () => {
    if (!userId) return;
    setIsLoadingToday(true);
    try {
      const response = await fetch(`/api/gym/today?userId=${userId}`);
      const data = (await response.json()) as TodayData;
      setTodayData(data);
    } catch (error) {
      console.error("Failed to load today data:", error);
    } finally {
      setIsLoadingToday(false);
    }
  }, [userId]);

  // Bootstrap effects
  useEffect(() => {
    void loadPeriods();
  }, [loadPeriods]);

  useEffect(() => {
    void loadTodayData();
  }, [loadTodayData]);

  // Personal records — fire-and-forget
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/gym/records?userId=${userId}`)
      .then((r) => r.json())
      .then((data: { records?: Record<string, number> }) => {
        if (data.records) setPersonalRecords(data.records);
      })
      .catch(() => {
        /* silent */
      });
  }, [userId]);

  // Workouts for the active period
  useEffect(() => {
    const load = async () => {
      if (!activePeriod?.id) return;
      try {
        const response = await fetch(`/api/gym/workouts?periodId=${activePeriod.id}`);
        const data = (await response.json()) as { workouts?: GymWorkout[] };
        setWorkouts(
          (data.workouts ?? []).map((w) => ({
            ...w,
            muscleGroups: parseMuscleGroups(w.muscleGroups as string | string[] | undefined),
          }))
        );
      } catch (error) {
        console.error("Failed to load workouts:", error);
      }
    };
    void load();
  }, [activePeriod?.id]);

  return {
    periods,
    setPeriods,
    activePeriod,
    setActivePeriod,
    workouts,
    setWorkouts,
    currentMonth,
    setCurrentMonth,
    isLoading,
    showPeriodList,
    setShowPeriodList,
    todayData,
    isLoadingToday,
    personalRecords,
    loadPeriods,
    loadTodayData,
  };
}
