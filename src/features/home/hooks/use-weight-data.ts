"use client";

import { useCallback, useEffect, useState } from "react";
import { showErrorToast, showSuccessToast } from "@/lib/network-utils";
import type { WeightData } from "@/features/home/types";

interface WeightApiResponse {
  todayAvg?: number | null;
  changeWeek?: number | null;
  currentWeight?: number | null;
  targetWeight?: number | null;
  toGoal?: number | null;
}

function mapResponse(data: WeightApiResponse): WeightData {
  return {
    todayAvg: data.todayAvg ?? null,
    changeWeek: data.changeWeek ?? null,
    currentWeight: data.currentWeight ?? null,
    targetWeight: data.targetWeight ?? null,
    toGoal: data.toGoal ?? null,
  };
}

export function useWeightData(userId: string | undefined) {
  const [weightData, setWeightData] = useState<WeightData | null>(null);
  const [weightValue, setWeightValue] = useState("");
  const [weightLoading, setWeightLoading] = useState(false);
  const [weightSaving, setWeightSaving] = useState(false);

  const reload = useCallback(async (uid: string) => {
    const r = await fetch(`/api/weight?userId=${uid}`);
    const data = (await r.json()) as WeightApiResponse;
    setWeightData(mapResponse(data));
    if (data.todayAvg) setWeightValue(data.todayAvg.toFixed(1));
  }, []);

  useEffect(() => {
    if (!userId) return;
    setWeightLoading(true);
    reload(userId)
      .catch((err: unknown) => console.error("Failed to load weight:", err))
      .finally(() => setWeightLoading(false));
  }, [userId, reload]);

  const handleSaveWeight = async () => {
    if (!userId || !weightValue) return;
    setWeightSaving(true);
    try {
      await fetch("/api/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, value: parseFloat(weightValue) }),
      });
      showSuccessToast("Вес записан");
      await reload(userId);
    } catch (err: unknown) {
      showErrorToast(err, "save weight");
    } finally {
      setWeightSaving(false);
    }
  };

  const reloadWeightData = () => {
    if (userId) reload(userId).catch(() => {});
  };

  return {
    weightData,
    weightValue,
    setWeightValue,
    weightLoading,
    weightSaving,
    handleSaveWeight,
    reloadWeightData,
  };
}
