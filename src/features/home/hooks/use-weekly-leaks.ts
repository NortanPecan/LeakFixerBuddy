"use client";

import { useEffect, useState } from "react";
import type { TopWeeklyLeak } from "@/features/home/types";

interface LeakHint {
  message: string;
  emoji: string;
  severity: string;
}

interface WeeklyReportApiResponse {
  success: boolean;
  leakHints?: LeakHint[];
}

function getMondayISO(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

export function useWeeklyLeaks(userId: string | undefined) {
  const [weeklyLeaksCount, setWeeklyLeaksCount] = useState<number | null>(null);
  const [topWeeklyLeak, setTopWeeklyLeak] = useState<TopWeeklyLeak | null>(null);

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    const weekStart = getMondayISO();
    void fetch(`/api/weekly-report?userId=${userId}&weekStart=${weekStart}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data: WeeklyReportApiResponse) => {
        if (controller.signal.aborted) return;
        if (!data.success || !data.leakHints) return;
        setWeeklyLeaksCount(data.leakHints.length);
        const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
        const sorted = [...data.leakHints].sort(
          (a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3)
        );
        if (sorted.length > 0) setTopWeeklyLeak(sorted[0]);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) console.error("Failed to load weekly leaks:", error);
      });

    return () => controller.abort();
  }, [userId]);

  return { weeklyLeaksCount, topWeeklyLeak };
}
