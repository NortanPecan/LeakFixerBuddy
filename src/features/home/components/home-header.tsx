"use client";

import { Badge } from "@/components/ui/badge";
import { Flame, Trophy, ShieldCheck, ShieldOff } from "lucide-react";
import { pluralDays } from "@/features/home/constants";

interface HomeHeaderProps {
  firstName: string | null | undefined;
  daysWithApp: number;
  streak: number;
  points: number;
  streakShieldUsedAt: Date | string | null | undefined;
  isMorningTime: boolean;
  isEveningTime: boolean;
}

export function HomeHeader({
  firstName,
  daysWithApp,
  streak,
  points,
  streakShieldUsedAt,
  isMorningTime,
  isEveningTime,
}: HomeHeaderProps) {
  const greeting = isMorningTime
    ? "Доброе утро 🌅"
    : isEveningTime
      ? "Добрый вечер 🌙"
      : "Привет 👋";

  const usedAt = streakShieldUsedAt ? new Date(streakShieldUsedAt) : null;
  const shieldReady = !usedAt || Date.now() - usedAt.getTime() > 7 * 86400000;
  const shieldRechargeDate = usedAt
    ? new Date(usedAt.getTime() + 7 * 86400000).toLocaleDateString("ru")
    : "";

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-foreground text-2xl font-bold">{greeting}</h1>
        <p className="text-muted-foreground text-sm">
          {firstName || "Друг"} · {daysWithApp} {pluralDays(daysWithApp)} с приложением
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="flex items-center gap-1">
          <Flame className="h-4 w-4 text-orange-500" />
          {streak}
        </Badge>
        {streak > 0 && (
          <Badge
            variant="outline"
            className={`flex items-center gap-1 text-xs ${
              shieldReady
                ? "border-emerald-500/40 text-emerald-400"
                : "text-muted-foreground border-white/10"
            }`}
            title={
              shieldReady
                ? "Щит готов — защитит стрик при пропуске дня"
                : `Щит перезаряжается до ${shieldRechargeDate}`
            }
          >
            {shieldReady ? (
              <ShieldCheck className="h-3.5 w-3.5" />
            ) : (
              <ShieldOff className="h-3.5 w-3.5" />
            )}
          </Badge>
        )}
        <Badge variant="secondary" className="flex items-center gap-1">
          <Trophy className="h-4 w-4 text-yellow-500" />
          {points}
        </Badge>
      </div>
    </div>
  );
}
