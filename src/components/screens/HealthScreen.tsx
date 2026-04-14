"use client";

import { useAppStore } from "@/lib/store";
import { DatePicker, DateBadge } from "@/components/DatePicker";
import { useHealthScreen } from "@/features/health/hooks/use-health-screen";
import { FastingWidget } from "@/features/health/components/fasting-widget";
import { SupplementsCard } from "@/features/health/components/supplements-card";
import { FoodCard } from "@/features/health/components/food-card";
import { WaterCard } from "@/features/health/components/water-card";

export function HealthScreen() {
  const { user, selectedDate } = useAppStore();

  const {
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
  } = useHealthScreen(user?.id, selectedDate);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 pb-20">
        <h1 className="text-foreground text-2xl font-bold">Здоровье</h1>
        <div className="text-muted-foreground py-8 text-center">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-foreground text-2xl font-bold">Здоровье</h1>
        <DateBadge />
      </div>

      <DatePicker variant="compact" />

      <SupplementsCard
        supplementsData={supplementsData}
        onToggle={handleToggleSupplement}
        onAdd={handleAddSupplement}
        onDelete={handleDeleteSupplement}
      />

      <FoodCard
        foodData={foodData}
        onAdd={handleAddFood}
        onDelete={handleDeleteFood}
        onUpdate={handleUpdateFood}
      />

      <FastingWidget entries={foodData?.entries ?? []} />

      <WaterCard waterData={waterData} onUpdate={handleUpdateWater} />
    </div>
  );
}
