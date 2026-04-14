"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import type { TopWeeklyLeak } from "@/features/home/types";

interface WeeklyFocusCardProps {
  leak: TopWeeklyLeak;
  onClick: () => void;
}

const SEVERITY_BG: Record<string, string> = {
  critical: "rgba(239,68,68,0.08)",
  warning: "rgba(245,158,11,0.08)",
};
const SEVERITY_BORDER: Record<string, string> = {
  critical: "rgba(239,68,68,0.2)",
  warning: "rgba(245,158,11,0.2)",
};
const SEVERITY_TEXT: Record<string, string> = {
  critical: "#ef4444",
  warning: "#f59e0b",
};

export function WeeklyFocusCard({ leak, onClick }: WeeklyFocusCardProps) {
  const bg = SEVERITY_BG[leak.severity] ?? "rgba(99,102,241,0.08)";
  const border = SEVERITY_BORDER[leak.severity] ?? "rgba(99,102,241,0.2)";
  const textColor = SEVERITY_TEXT[leak.severity] ?? "#818cf8";

  return (
    <Card
      className="cursor-pointer"
      style={{ background: bg, border: `1px solid ${border}` }}
      onClick={onClick}
    >
      <CardContent className="pt-3 pb-3">
        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 text-xl">{leak.emoji}</span>
          <div className="min-w-0 flex-1">
            <div
              className="mb-0.5 text-[10px] font-medium tracking-wider uppercase"
              style={{ color: textColor }}
            >
              Фокус недели
            </div>
            <p className="text-sm leading-snug text-white/80">{leak.message}</p>
          </div>
          <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-white/30" />
        </div>
      </CardContent>
    </Card>
  );
}
