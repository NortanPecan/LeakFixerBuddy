"use client";

import { useEffect, useState } from "react";
import type { ActiveChallenge } from "@/features/home/types";

interface ChallengesApiResponse {
  success: boolean;
  challenges?: ActiveChallenge[];
}

export function useActiveChallenges(
  userId: string | undefined,
  hiddenWidgets: string[]
): ActiveChallenge[] {
  const [activeChallenges, setActiveChallenges] = useState<ActiveChallenge[]>([]);

  useEffect(() => {
    if (!userId || hiddenWidgets.includes("challenges")) return;

    const controller = new AbortController();

    void fetch(`/api/challenges?userId=${userId}&status=active`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d: ChallengesApiResponse) => {
        if (!controller.signal.aborted && d.success && d.challenges) {
          setActiveChallenges(d.challenges.slice(0, 2));
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) console.error("Failed to load active challenges:", error);
      });

    return () => controller.abort();
  }, [userId, hiddenWidgets]);

  return activeChallenges;
}
