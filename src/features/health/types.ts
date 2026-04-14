"use client";

export interface Supplement {
  id: string;
  name: string;
  dosage: string | null;
  unit: string;
  standardDose: number;
  timeWindow: string;
  days: number[];
  checked: boolean;
  intakeId: string | null;
}

export interface SupplementsData {
  supplements: Supplement[];
  stats: {
    total: number;
    checked: number;
    progress: number;
  };
}

export interface FoodEntry {
  id: string;
  name: string;
  mealType: string;
  time: string | null;
  calories: number | null;
  quality: string | null;
  amount: string | null;
  createdAt: string;
}

export interface FoodData {
  entries: FoodEntry[];
  totals: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  };
  byMealType: Record<string, FoodEntry[]>;
}

export interface WaterData {
  current: number;
  target: number;
  percentage: number;
}

export interface NewSupplementForm {
  name: string;
  dosage: string;
  unit: string;
  timeWindow: string;
  days: number[];
}

export interface NewFoodForm {
  name: string;
  mealType: string;
  customMealType: string;
  time: string;
  calories: string;
  quality: string;
  amount: string;
}
