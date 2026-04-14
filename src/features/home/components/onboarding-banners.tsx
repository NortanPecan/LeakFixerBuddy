"use client";

import { Card, CardContent } from "@/components/ui/card";

interface OnboardingBannersProps {
  userDay: number;
}

export function OnboardingBanners({ userDay }: OnboardingBannersProps) {
  if (userDay < 8) {
    return (
      <Card className="border-primary/20 bg-primary/5 border">
        <CardContent className="pt-3 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔓</span>
              <div>
                <div className="text-sm font-medium">Аналитика откроется на 8-й день</div>
                <div className="text-muted-foreground text-xs">
                  Ещё {8 - userDay} дн. — следи за привычками каждый день
                </div>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-primary text-sm font-bold">{userDay}/7</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (userDay >= 8 && userDay < 15) {
    return (
      <Card className="border border-amber-500/20 bg-amber-500/5">
        <CardContent className="pt-3 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">💰</span>
              <div>
                <div className="text-sm font-medium">Финансы и Buddy откроются на 15-й день</div>
                <div className="text-muted-foreground text-xs">
                  Ещё {15 - userDay} дн. — продолжай трекить
                </div>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-sm font-bold text-amber-500">{userDay}/14</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
