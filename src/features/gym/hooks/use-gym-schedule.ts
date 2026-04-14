"use client";

import { useCallback, useEffect, useState } from "react";
import { isOnline, showErrorToast, showSuccessToast } from "@/lib/network-utils";
import type { DayScheduleItem, GymPeriod } from "@/features/gym";

interface UseGymScheduleParams {
  activePeriod: GymPeriod | null;
  loadPeriods: () => Promise<void>;
}

export interface UseGymScheduleResult {
  parsedDaySchedule: DayScheduleItem[];
  setParsedDaySchedule: React.Dispatch<React.SetStateAction<DayScheduleItem[]>>;
  scheduleEdited: boolean;
  scheduleDraggedIdx: number | null;
  scheduleDragOverIdx: number | null;
  handleScheduleDragStart: (index: number) => void;
  handleScheduleDragOver: (e: React.DragEvent, index: number) => void;
  handleScheduleDragEnd: () => void;
  handleSaveSchedule: () => Promise<void>;
}

export function useGymSchedule({
  activePeriod,
  loadPeriods,
}: UseGymScheduleParams): UseGymScheduleResult {
  const [parsedDaySchedule, setParsedDaySchedule] = useState<DayScheduleItem[]>([]);
  const [scheduleEdited, setScheduleEdited] = useState(false);
  const [scheduleDraggedIdx, setScheduleDraggedIdx] = useState<number | null>(null);
  const [scheduleDragOverIdx, setScheduleDragOverIdx] = useState<number | null>(null);

  // Parse day schedule whenever activePeriod changes.
  // Setting state synchronously here is intentional: this effect resets local edit state
  // from an external prop (activePeriod), which is the correct React pattern.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (activePeriod?.daySchedule) {
      try {
        const raw = activePeriod.daySchedule;
        const schedule =
          typeof raw === "string"
            ? (JSON.parse(raw) as DayScheduleItem[])
            : (raw as DayScheduleItem[]);
        setParsedDaySchedule([...schedule].sort((a, b) => a.dayNum - b.dayNum));
      } catch {
        setParsedDaySchedule([]);
      }
    } else {
      setParsedDaySchedule([]);
    }
    setScheduleEdited(false);
  }, [activePeriod?.daySchedule]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleScheduleDragStart = (index: number) => setScheduleDraggedIdx(index);

  const handleScheduleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setScheduleDragOverIdx(index);
  };

  const handleScheduleDragEnd = () => {
    if (
      scheduleDraggedIdx !== null &&
      scheduleDragOverIdx !== null &&
      scheduleDraggedIdx !== scheduleDragOverIdx
    ) {
      const newSchedule = [...parsedDaySchedule];
      const [item] = newSchedule.splice(scheduleDraggedIdx, 1);
      newSchedule.splice(scheduleDragOverIdx, 0, item);
      newSchedule.forEach((s, idx) => {
        s.dayNum = idx + 1;
      });
      setParsedDaySchedule(newSchedule);
      setScheduleEdited(true);
    }
    setScheduleDraggedIdx(null);
    setScheduleDragOverIdx(null);
  };

  const handleSaveSchedule = useCallback(async () => {
    if (!activePeriod || parsedDaySchedule.length === 0) return;
    if (!isOnline()) {
      showErrorToast(new Error("Нет подключения к интернету"), "сохранение расписания");
      return;
    }
    try {
      await fetch("/api/gym", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodId: activePeriod.id, daySchedule: parsedDaySchedule }),
      });
      setScheduleEdited(false);
      showSuccessToast("Расписание сохранено");
      void loadPeriods();
    } catch (error) {
      showErrorToast(error, "сохранение расписания");
    }
  }, [activePeriod, parsedDaySchedule, loadPeriods]);

  return {
    parsedDaySchedule,
    setParsedDaySchedule,
    scheduleEdited,
    scheduleDraggedIdx,
    scheduleDragOverIdx,
    handleScheduleDragStart,
    handleScheduleDragOver,
    handleScheduleDragEnd,
    handleSaveSchedule,
  };
}
