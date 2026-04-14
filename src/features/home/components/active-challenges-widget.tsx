"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, ChevronRight, Flame } from "lucide-react";
import type { ActiveChallenge } from "@/features/home/types";

interface ActiveChallengesWidgetProps {
  challenges: ActiveChallenge[];
  onNavigateList: () => void;
  onNavigateDetail: (id: string) => void;
}

export function ActiveChallengesWidget({
  challenges,
  onNavigateList,
  onNavigateDetail,
}: ActiveChallengesWidgetProps) {
  if (challenges.length === 0) return null;

  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardContent className="pt-3 pb-3">
        <div
          className="mb-2 flex cursor-pointer items-center justify-between"
          onClick={onNavigateList}
        >
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-400" />
            <span className="text-sm font-medium">Активные челленджи</span>
          </div>
          <ChevronRight className="text-muted-foreground h-4 w-4" />
        </div>
        <div className="space-y-2">
          {challenges.map((c) => (
            <div
              key={c.id}
              className="-mx-1 cursor-pointer rounded-md px-1 transition-colors hover:bg-white/5"
              onClick={() => onNavigateDetail(c.id)}
            >
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="max-w-[70%] truncate text-white/80">{c.name}</span>
                <span className="font-medium text-white/60">{c.progressPercentage}%</span>
              </div>
              <Progress value={c.progressPercentage} className="h-1.5" />
              {c.currentStreak > 0 && (
                <div className="mt-0.5 flex items-center gap-1 text-[10px] text-orange-400">
                  <Flame className="h-2.5 w-2.5" />
                  {c.currentStreak} дней подряд
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
