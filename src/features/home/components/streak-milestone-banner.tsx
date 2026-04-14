"use client";

import { Card, CardContent } from "@/components/ui/card";
import { STREAK_MILESTONES } from "@/features/home/constants";

interface StreakMilestoneBannerProps {
  streak: number;
}

export function StreakMilestoneBanner({ streak }: StreakMilestoneBannerProps) {
  const milestone = STREAK_MILESTONES[streak];
  if (!milestone) return null;

  return (
    <Card className="border border-yellow-500/30 bg-yellow-500/5">
      <CardContent className="pt-3 pb-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{milestone.emoji}</span>
          <p className="text-sm leading-snug text-yellow-200/90">{milestone.text}</p>
        </div>
      </CardContent>
    </Card>
  );
}
