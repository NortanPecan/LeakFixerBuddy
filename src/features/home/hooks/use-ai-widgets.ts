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
    fetch(`/api/ai/recommendations?userId=${userId}`)
      .then((r) => r.json())
      .then((data: AiRecommendationApiResponse) => {
        if (data.success && data.recommendation) setAiRecommendation(data.recommendation);
      })
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (!userId || hiddenWidgets.includes("daily_tip")) return;
    fetch(`/api/ai/daily-tip?userId=${userId}`)
      .then((r) => {
        if (!r.ok) return null;
        return r.json() as Promise<DailyTipApiResponse>;
      })
      .then((data) => {
        if (data) setDailyTip(data);
      })
      .catch(() => {});
  }, [userId, hiddenWidgets]);

  return { aiRecommendation, dailyTip };
}
