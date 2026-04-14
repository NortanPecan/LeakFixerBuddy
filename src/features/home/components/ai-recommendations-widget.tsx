"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { LEAK_TYPE_LABELS } from "@/features/home/constants";
import type { AiRecommendation } from "@/features/home/types";

interface AiRecommendationsWidgetProps {
  recommendation: AiRecommendation;
  onNavigate: () => void;
}

const URGENCY_BG: Record<string, string> = {
  now: "rgba(239,68,68,0.08)",
  thisWeek: "rgba(99,102,241,0.08)",
  thisMonth: "rgba(99,102,241,0.06)",
};
const URGENCY_BORDER: Record<string, string> = {
  now: "rgba(239,68,68,0.2)",
  thisWeek: "rgba(99,102,241,0.2)",
  thisMonth: "rgba(99,102,241,0.15)",
};

export function AiRecommendationsWidget({
  recommendation: rec,
  onNavigate,
}: AiRecommendationsWidgetProps) {
  const topSolution = rec.analysis.solutions?.[0];
  const leakLabel = LEAK_TYPE_LABELS[rec.leakType] ?? rec.leakType.replace(/_/g, " ");
  const bg = URGENCY_BG[rec.analysis.urgency] ?? URGENCY_BG.thisWeek;
  const border = URGENCY_BORDER[rec.analysis.urgency] ?? URGENCY_BORDER.thisWeek;

  return (
    <Card style={{ background: bg, border: `1px solid ${border}` }}>
      <CardContent className="pt-3 pb-3">
        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 text-xl">💡</span>
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 text-[10px] font-medium tracking-wider text-indigo-400 uppercase">
              AI Рекомендации · {leakLabel}
            </div>
            {topSolution ? (
              <p className="text-sm leading-snug text-white/80">{topSolution.text}</p>
            ) : (
              <p className="text-sm leading-snug text-white/60">{rec.analysis.cause}</p>
            )}
          </div>
          <button
            onClick={onNavigate}
            className="flex flex-shrink-0 items-center gap-0.5 text-[10px] text-indigo-400 hover:text-indigo-300"
          >
            Все
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
