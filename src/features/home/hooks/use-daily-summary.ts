"use client";

import { useEffect, useState } from "react";
import type { DailySummary } from "@/features/home/types";

interface DailySummaryApiResponse {
  success: boolean;
  summary?: DailySummary;
}

export function useDailySummary(userId: string | undefined, selectedDate: string) {
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      if (!userId) return;
      setSummaryLoading(true);
      try {
        const r = await fetch(`/api/daily-summary?userId=${userId}&date=${selectedDate}`, {
          signal: controller.signal,
        });
        const data = (await r.json()) as DailySummaryApiResponse;
        if (controller.signal.aborted) return;
        if (data.success && data.summary) setDailySummary(data.summary);
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        console.error("Failed to load daily summary:", err);
      } finally {
        if (!controller.signal.aborted) setSummaryLoading(false);
      }
    };
    void load();

    return () => controller.abort();
  }, [userId, selectedDate]);

  const handleQuickWater = async (addMl: number, currentUserId: string) => {
    if (!dailySummary) return;
    const newAmount = dailySummary.water.current + addMl;
    setDailySummary((prev) =>
      prev
        ? {
            ...prev,
            water: {
              ...prev.water,
              current: newAmount,
              percentage: Math.round((newAmount / prev.water.target) * 100),
            },
          }
        : prev
    );
    try {
      await fetch("/api/water", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId, amount: newAmount }),
      });
    } catch {
      /* silent */
    }
  };

  return { dailySummary, summaryLoading, setDailySummary, handleQuickWater };
}
