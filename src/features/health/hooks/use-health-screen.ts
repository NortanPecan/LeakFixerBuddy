"use client";

import { useEffect, useState } from "react";
import { showErrorToast, showSuccessToast } from "@/lib/network-utils";
import type {
  FoodData,
  FoodEntry,
  Supplement,
  SupplementsData,
  WaterData,
} from "@/features/health/types";

interface UseHealthScreenResult {
  supplementsData: SupplementsData | null;
  foodData: FoodData | null;
  waterData: WaterData | null;
  loading: boolean;
  handleToggleSupplement: (supplement: Supplement) => Promise<void>;
  handleAddSupplement: (params: {
    name: string;
    dosage: string;
    unit: string;
    timeWindow: string;
    days: number[];
  }) => Promise<void>;
  handleDeleteSupplement: (id: string) => Promise<void>;
  handleAddFood: (params: {
    name: string;
    mealType: string;
    time: string;
    calories: string;
    quality: string;
    amount: string;
  }) => Promise<void>;
  handleDeleteFood: (id: string) => Promise<void>;
  handleUpdateFood: (entry: FoodEntry) => Promise<void>;
  handleUpdateWater: (delta: number) => Promise<void>;
}

export function useHealthScreen(
  userId: string | undefined,
  selectedDate: string
): UseHealthScreenResult {
  const [supplementsData, setSupplementsData] = useState<SupplementsData | null>(null);
  const [foodData, setFoodData] = useState<FoodData | null>(null);
  const [waterData, setWaterData] = useState<WaterData | null>(null);
  const [loading, setLoading] = useState(true);

  const reloadSupplements = async (uid: string) => {
    const res = await fetch(`/api/supplements?userId=${uid}&date=${selectedDate}`);
    const json = (await res.json()) as { success: boolean } & SupplementsData;
    if (json.success) setSupplementsData(json);
  };

  const reloadFood = async (uid: string) => {
    const res = await fetch(`/api/food?userId=${uid}&date=${selectedDate}`);
    const json = (await res.json()) as { success: boolean } & FoodData;
    if (json.success) setFoodData(json);
  };

  useEffect(() => {
    const loadData = async () => {
      if (!userId) return;
      setLoading(true);
      try {
        const [suppRes, foodRes, waterRes] = await Promise.all([
          fetch(`/api/supplements?userId=${userId}&date=${selectedDate}`),
          fetch(`/api/food?userId=${userId}&date=${selectedDate}`),
          fetch(`/api/water?userId=${userId}&date=${selectedDate}`),
        ]);
        const [suppJson, foodJson, waterJson] = await Promise.all([
          suppRes.json() as Promise<{ success: boolean } & SupplementsData>,
          foodRes.json() as Promise<{ success: boolean } & FoodData>,
          waterRes.json() as Promise<{ success: boolean; water: WaterData }>,
        ]);
        if (suppJson.success) setSupplementsData(suppJson);
        if (foodJson.success) setFoodData(foodJson);
        if (waterJson.success) setWaterData(waterJson.water);
      } catch (error) {
        showErrorToast(error, "загрузка данных о здоровье");
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, [userId, selectedDate]);

  const handleToggleSupplement = async (supplement: Supplement) => {
    if (!userId) return;
    try {
      await fetch("/api/supplements/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplementId: supplement.id,
          userId,
          date: selectedDate,
          checked: !supplement.checked,
        }),
      });
      await reloadSupplements(userId);
    } catch (error) {
      showErrorToast(error, "отметка БАДа");
    }
  };

  const handleAddSupplement = async (params: {
    name: string;
    dosage: string;
    unit: string;
    timeWindow: string;
    days: number[];
  }) => {
    if (!userId || !params.name) return;
    try {
      await fetch("/api/supplements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          name: params.name,
          dosage: params.dosage || null,
          unit: params.unit,
          timeWindow: params.timeWindow,
          days: params.days,
        }),
      });
      await reloadSupplements(userId);
      showSuccessToast("БАД добавлен");
    } catch (error) {
      showErrorToast(error, "добавление БАДа");
    }
  };

  const handleDeleteSupplement = async (id: string) => {
    if (!userId) return;
    try {
      await fetch(`/api/supplements?id=${id}`, { method: "DELETE" });
      await reloadSupplements(userId);
      showSuccessToast("БАД удалён");
    } catch (error) {
      showErrorToast(error, "удаление БАДа");
    }
  };

  const handleAddFood = async (params: {
    name: string;
    mealType: string;
    time: string;
    calories: string;
    quality: string;
    amount: string;
  }) => {
    if (!userId || !params.name) return;
    try {
      const postRes = await fetch("/api/food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          date: selectedDate,
          name: params.name,
          mealType: params.mealType,
          time: params.time || null,
          calories: params.calories ? parseInt(params.calories) : null,
          quality: params.quality,
          amount: params.amount || null,
        }),
      });
      if (!postRes.ok) throw new Error("Failed to save food entry");
      await reloadFood(userId);
      showSuccessToast("Еда добавлена");
    } catch (error) {
      showErrorToast(error, "добавление еды");
    }
  };

  const handleDeleteFood = async (id: string) => {
    if (!userId) return;
    try {
      await fetch(`/api/food?id=${id}`, { method: "DELETE" });
      await reloadFood(userId);
      showSuccessToast("Запись удалена");
    } catch (error) {
      showErrorToast(error, "удаление еды");
    }
  };

  const handleUpdateFood = async (entry: FoodEntry) => {
    if (!userId) return;
    try {
      await fetch("/api/food", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: entry.id,
          name: entry.name,
          mealType: entry.mealType,
          time: entry.time,
          calories: entry.calories,
          quality: entry.quality,
          amount: entry.amount,
        }),
      });
      await reloadFood(userId);
      showSuccessToast("Запись обновлена");
    } catch (error) {
      showErrorToast(error, "обновление еды");
    }
  };

  const handleUpdateWater = async (delta: number) => {
    if (!userId || !waterData) return;
    const newAmount = Math.max(0, waterData.current + delta);
    try {
      await fetch("/api/water", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, date: selectedDate, amount: newAmount }),
      });
      setWaterData({
        ...waterData,
        current: newAmount,
        percentage: Math.round((newAmount / waterData.target) * 100),
      });
    } catch (error) {
      showErrorToast(error, "обновление воды");
    }
  };

  return {
    supplementsData,
    foodData,
    waterData,
    loading,
    handleToggleSupplement,
    handleAddSupplement,
    handleDeleteSupplement,
    handleAddFood,
    handleDeleteFood,
    handleUpdateFood,
    handleUpdateWater,
  };
}
