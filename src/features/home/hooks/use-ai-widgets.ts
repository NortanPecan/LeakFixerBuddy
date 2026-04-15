"use client";

import { useEffect, useState } from "react";
import type { AiRecommendation, DailyTip } from "@/features/home/types";

interface AiRecommendationApiResponse {
  success: boolean;
  recommendation?: AiRecommendation;
}

interface DailyTipApiResponse {
  tip: string;
  provider: string;
  cached: boolean;
}

export function useAiWidgets(userId: string | undefined, hiddenWidgets: string[]) {
  const [aiRecommendation, setAiRecommendation] = useState<AiRecommendation | null>(null);
  const [dailyTip, setDailyTip] = useState<DailyTip | null>(null);

  useEffect(() => {
    if (!userId) return;

    const controller = new AbortController();

    void fetch(`/api/ai/recommendations?userId=${userId}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data: AiRecommendationApiResponse) => {
        if (!controller.signal.aborted && data.success && data.recommendation) {
          setAiRecommendation(data.recommendation);
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) console.error("Failed to load AI recommendation:", error);
      });

    return () => controller.abort();
  }, [userId]);

  useEffect(() => {
    if (!userId || hiddenWidgets.includes("daily_tip")) return;

    const controller = new AbortController();

    void fetch(`/api/ai/daily-tip?userId=${userId}`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) return null;
        return r.json() as Promise<DailyTipApiResponse>;
      })
      .then((data) => {
        if (!controller.signal.aborted && data) setDailyTip(data);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) console.error("Failed to load daily tip:", error);
      });

    return () => controller.abort();
  }, [userId, hiddenWidgets]);

  return { aiRecommendation, dailyTip };
}
