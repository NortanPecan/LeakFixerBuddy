"use client";

import { useEffect, useState } from "react";

interface SettingsApiResponse {
  success: boolean;
  settings?: { hiddenWidgets?: unknown };
}

export function useHiddenWidgets(userId: string | undefined): string[] {
  const [hiddenWidgets, setHiddenWidgets] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/settings?userId=${userId}`)
      .then((r) => r.json())
      .then((data: SettingsApiResponse) => {
        if (data.success && Array.isArray(data.settings?.hiddenWidgets)) {
          setHiddenWidgets(data.settings.hiddenWidgets as string[]);
        }
      })
      .catch(() => {});
  }, [userId]);

  return hiddenWidgets;
}
