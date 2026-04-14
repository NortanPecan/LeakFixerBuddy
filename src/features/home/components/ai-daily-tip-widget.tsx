"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { DailyTip } from "@/features/home/types";

interface AiDailyTipWidgetProps {
  tip: DailyTip;
}

export function AiDailyTipWidget({ tip }: AiDailyTipWidgetProps) {
  return (
    <Card className="border-violet-500/20 bg-gradient-to-br from-violet-900/30 to-indigo-900/20">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 text-xl">🧠</span>
          <div className="min-w-0 flex-1">
            <div className="mb-1 text-xs font-medium tracking-wider text-violet-400 uppercase">
              Совет дня
            </div>
            <p className="text-sm leading-snug text-white/90">{tip.tip}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
