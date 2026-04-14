"use client";

import { useEffect, useState } from "react";
import type { CheckinStatus } from "@/features/home/types";

const DEFAULT_STATUS: CheckinStatus = { morningDone: false, eveningDone: false };

interface CheckinApiResponse {
  success: boolean;
  morning?: {
    createdAt: string;
    energy?: number;
    focusWord?: string;
  };
  evening?: {
    dayRating?: number;
    win?: string;
  };
}

export function useCheckinStatus(userId: string | undefined, selectedDate: string): CheckinStatus {
  const [status, setStatus] = useState<CheckinStatus>(DEFAULT_STATUS);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/checkin?userId=${userId}&date=${selectedDate}`)
      .then((r) => r.json())
      .then((data: CheckinApiResponse) => {
        if (!data.success) return;
        const morningHour = data.morning?.createdAt
          ? new Date(data.morning.createdAt).getHours()
          : null;
        setStatus({
          morningDone: !!data.morning,
          eveningDone: !!data.evening,
          morningEnergy: data.morning?.energy,
          morningFocus: data.morning?.focusWord,
          eveningRating: data.evening?.dayRating,
          eveningWin: data.evening?.win,
          earlyBird: morningHour !== null && morningHour < 9,
        });
      })
      .catch(() => {});
  }, [userId, selectedDate]);

  return status;
}
