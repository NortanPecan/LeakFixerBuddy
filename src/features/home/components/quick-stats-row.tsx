"use client";

import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Trophy } from "lucide-react";

interface QuickStatsRowProps {
  streak: number;
  points: number;
}

export function QuickStatsRow({ streak, points }: QuickStatsRowProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Card className="bg-card/50 backdrop-blur">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="text-muted-foreground h-5 w-5" />
            <span className="text-muted-foreground text-sm">Дней подряд</span>
          </div>
          <p className="text-primary mt-1 text-2xl font-bold">{streak}</p>
        </CardContent>
      </Card>
      <Card className="bg-card/50 backdrop-blur">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <Trophy className="text-muted-foreground h-5 w-5" />
            <span className="text-muted-foreground text-sm">Очки</span>
          </div>
          <p className="text-primary mt-1 text-2xl font-bold">{points}</p>
        </CardContent>
      </Card>
    </div>
  );
}
