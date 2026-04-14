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
    fetch(`/api/challenges?userId=${userId}&status=active`)
      .then((r) => r.json())
      .then((d: ChallengesApiResponse) => {
        if (d.success && d.challenges) setActiveChallenges(d.challenges.slice(0, 2));
      })
      .catch(() => {});
  }, [userId, hiddenWidgets]);

  return activeChallenges;
}
