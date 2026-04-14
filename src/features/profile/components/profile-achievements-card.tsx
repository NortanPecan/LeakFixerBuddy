"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ALL_ACHIEVEMENT_DEFS } from "@/features/profile/constants";

interface ProfileAchievementsCardProps {
  achievements: Array<{ code: string; obtainedAt: string }>;
}

export function ProfileAchievementsCard({ achievements }: ProfileAchievementsCardProps) {
  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span>🏅 Достижения</span>
          <span className="text-muted-foreground text-sm font-normal">
            {achievements.length}/{ALL_ACHIEVEMENT_DEFS.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2">
          {ALL_ACHIEVEMENT_DEFS.map((def) => {
            const earned = achievements.find((a) => a.code === def.code);
            return (
              <div
                key={def.code}
                className={`flex flex-col items-center rounded-lg p-2 text-center ${
                  earned ? "bg-yellow-500/10" : "bg-muted/20 opacity-50 grayscale"
                }`}
              >
                <span className="text-2xl">{def.emoji}</span>
                <p className="mt-1 text-[11px] leading-tight font-medium">{def.label}</p>
                {earned ? (
                  <p className="text-muted-foreground mt-0.5 text-[10px]">
                    {new Date(earned.obtainedAt).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                ) : (
                  <p className="text-muted-foreground/60 mt-0.5 text-[10px] leading-tight">
                    {def.desc}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
