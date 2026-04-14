"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

interface WeeklyLeaksCardProps {
  leaksCount: number | null;
  onClick: () => void;
}

export function WeeklyLeaksCard({ leaksCount, onClick }: WeeklyLeaksCardProps) {
  return (
    <Card
      className="bg-card/50 hover:bg-card/70 cursor-pointer backdrop-blur transition-colors"
      onClick={onClick}
    >
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔍</span>
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                Лики недели
                {leaksCount !== null && leaksCount > 0 && (
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                    style={{
                      background: leaksCount >= 3 ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)",
                      color: leaksCount >= 3 ? "#ef4444" : "#f59e0b",
                    }}
                  >
                    {leaksCount}
                  </span>
                )}
              </div>
              <div className="text-xs text-white/40">Паттерны и корреляции</div>
            </div>
          </div>
          <ChevronRight className="text-muted-foreground h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}
