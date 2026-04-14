"use client";

import { useState } from "react";
import { useAppStore, Screen } from "@/lib/store";
import type { DailySummary } from "@/features/home/types";

interface UseQuickInputOptions {
  userId: string | undefined;
  dailySummary: DailySummary | null;
  onWaterUpdate: (newAmount: number) => void;
}

export function useQuickInput({ userId, dailySummary, onWaterUpdate }: UseQuickInputOptions) {
  const { globalState, updateGlobalState, setScreen } = useAppStore();
  const [quickInput, setQuickInput] = useState("");
  const [quickResult, setQuickResult] = useState<string | null>(null);

  const showResult = (msg: string) => {
    setQuickResult(msg);
    setQuickInput("");
    setTimeout(() => setQuickResult(null), 3000);
  };

  const handleQuickInput = async () => {
    const raw = quickInput.trim().toLowerCase();
    if (!raw || !userId) return;

    // Water: "вода 300", "вода 300мл", "воды 500"
    const waterMatch = raw.match(/^вод[аы]\s*(\d+)/);
    if (waterMatch) {
      const ml = parseInt(waterMatch[1]);
      const current = dailySummary?.water.current ?? 0;
      const newAmount = current + ml;
      try {
        await fetch("/api/water", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, amount: newAmount }),
        });
        onWaterUpdate(newAmount);
        showResult(`💧 Вода +${ml} мл (${newAmount} мл)`);
      } catch {
        showResult("❌ Ошибка");
      }
      return;
    }

    // Weight: "вес 74.5", "вес 75кг"
    const weightMatch = raw.match(/^вес\s*([\d.]+)/);
    if (weightMatch) {
      const kg = parseFloat(weightMatch[1]);
      try {
        await fetch("/api/weight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, weight: kg }),
        });
        showResult(`⚖️ Вес: ${kg} кг сохранён`);
      } catch {
        showResult("❌ Ошибка");
      }
      return;
    }

    // Mood: "настроение 8", "настр 7"
    const moodMatch = raw.match(/^настр\w*\s*(\d+)/);
    if (moodMatch) {
      const val = Math.min(10, Math.max(1, parseInt(moodMatch[1])));
      try {
        await updateGlobalState(val, globalState?.energy ?? 5);
        showResult(`😊 Настроение: ${val}/10`);
      } catch {
        showResult("❌ Ошибка");
      }
      return;
    }

    // Energy: "энергия 7", "энерг 8"
    const energyMatch = raw.match(/^энерг\w*\s*(\d+)/);
    if (energyMatch) {
      const val = Math.min(10, Math.max(1, parseInt(energyMatch[1])));
      try {
        await updateGlobalState(globalState?.mood ?? 5, val);
        showResult(`⚡ Энергия: ${val}/10`);
      } catch {
        showResult("❌ Ошибка");
      }
      return;
    }

    // Ate: "ел", "поел", "покушал" (5.10)
    if (raw === "ел" || raw === "поел" || raw === "покушал" || raw === "поела" || raw === "ела") {
      try {
        await fetch("/api/food", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, name: "Приём пищи", calories: 0, quality: "neutral" }),
        });
        showResult("🍽️ Приём пищи отмечен");
      } catch {
        showResult("❌ Ошибка");
      }
      return;
    }

    // Supplements: "бад", "бады", "добавки"
    if (raw === "бад" || raw === "бады" || raw === "добавки" || raw === "витамины") {
      setScreen("health" as Screen);
      showResult("💊 Открываю раздел БАДов...");
      return;
    }

    // Gym: "зал", "тренировка"
    if (
      raw === "зал" ||
      raw === "тренировка" ||
      raw === "gym" ||
      raw.startsWith("зал ") ||
      raw.startsWith("трен")
    ) {
      setScreen("gym" as Screen);
      showResult("🏋️ Открываю тренировки...");
      return;
    }

    // Rituals: "ритуалы", "привычки"
    if (raw === "ритуалы" || raw === "привычки" || raw === "ритуал") {
      setScreen("rituals" as Screen);
      showResult("🎯 Открываю ритуалы...");
      return;
    }

    // Finance
    if (
      raw === "расходы" ||
      raw === "финансы" ||
      raw === "деньги" ||
      raw.startsWith("расход") ||
      raw.startsWith("трат")
    ) {
      setScreen("finance" as Screen);
      showResult("💰 Открываю финансы...");
      return;
    }

    showResult('🤔 Не понял. Попробуй: "вода 300", "вес 74.5", "настроение 7", "зал", "ел"');
  };

  return { quickInput, setQuickInput, quickResult, handleQuickInput };
}
