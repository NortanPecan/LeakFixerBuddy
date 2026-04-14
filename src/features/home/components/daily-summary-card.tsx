"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Droplets, Apple, CheckCircle2, Pill, ChevronRight } from "lucide-react";
import type { DailySummary } from "@/features/home/types";

interface DailySummaryCardProps {
  dailySummary: DailySummary;
  hiddenWidgets: string[];
  onOpenDailySummary: () => void;
  onQuickWater: (ml: number) => void;
}

export function DailySummaryCard({
  dailySummary,
  hiddenWidgets,
  onOpenDailySummary,
  onQuickWater,
}: DailySummaryCardProps) {
  const showWater = !hiddenWidgets.includes("water");
  const showFood = !hiddenWidgets.includes("food");
  const showRituals = !hiddenWidgets.includes("rituals");
  const showSupplements = !hiddenWidgets.includes("supplements");
  const colCount = [showWater, showFood, showRituals, showSupplements].filter(Boolean).length;

  return (
    <Card
      className="bg-card/50 hover:bg-card/70 cursor-pointer backdrop-blur transition-colors"
      onClick={onOpenDailySummary}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Сводка за день</CardTitle>
          <ChevronRight className="text-muted-foreground h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${colCount}, 1fr)` }}>
          {showWater && (
            <div className="bg-muted/30 rounded-lg p-2 text-center">
              <Droplets className="mx-auto mb-1 h-4 w-4 text-cyan-400" />
              <div className="text-muted-foreground text-xs">Вода</div>
              <div className="text-sm font-bold">{dailySummary.water.percentage}%</div>
            </div>
          )}

          {showFood && (
            <div className="bg-muted/30 rounded-lg p-2 text-center">
              <Apple className="mx-auto mb-1 h-4 w-4 text-green-400" />
              <div className="text-muted-foreground text-xs">Еда</div>
              <div className="text-sm font-bold">{dailySummary.food.calories}</div>
              {dailySummary.food.entriesCount > 0 && (
                <div className="mt-1 flex h-1 gap-px overflow-hidden rounded-full">
                  {dailySummary.food.qualityBreakdown.good > 0 && (
                    <div
                      className="bg-emerald-500"
                      style={{ flex: dailySummary.food.qualityBreakdown.good }}
                    />
                  )}
                  {dailySummary.food.qualityBreakdown.neutral > 0 && (
                    <div
                      className="bg-yellow-500"
                      style={{ flex: dailySummary.food.qualityBreakdown.neutral }}
                    />
                  )}
                  {dailySummary.food.qualityBreakdown.bad > 0 && (
                    <div
                      className="bg-red-500"
                      style={{ flex: dailySummary.food.qualityBreakdown.bad }}
                    />
                  )}
                </div>
              )}
              {dailySummary.food.eatingWindowHours !== null && (
                <div className="text-muted-foreground/70 mt-0.5 text-[9px]">
                  ⏱ {dailySummary.food.eatingWindowHours}ч
                </div>
              )}
              {dailySummary.food.avgCalories7d !== null && (
                <div className="text-muted-foreground/50 mt-0.5 text-[9px]">
                  ∅{dailySummary.food.avgCalories7d}
                </div>
              )}
            </div>
          )}

          {showRituals && (
            <div className="bg-muted/30 rounded-lg p-2 text-center">
              <CheckCircle2 className="mx-auto mb-1 h-4 w-4 text-purple-400" />
              <div className="text-muted-foreground text-xs">Ритуалы</div>
              <div className="text-sm font-bold">
                {dailySummary.rituals.completed}/{dailySummary.rituals.total}
              </div>
            </div>
          )}

          {showSupplements && (
            <div className="bg-muted/30 rounded-lg p-2 text-center">
              <Pill className="mx-auto mb-1 h-4 w-4 text-blue-400" />
              <div className="text-muted-foreground text-xs">БАДы</div>
              <div className="text-sm font-bold">
                {dailySummary.supplements.checked}/{dailySummary.supplements.total}
              </div>
            </div>
          )}
        </div>

        {/* Quick water add (5.7) */}
        {showWater && (
          <div
            className="border-border/20 mt-3 flex items-center gap-2 border-t pt-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Droplets className="h-3.5 w-3.5 flex-shrink-0 text-cyan-400" />
            <span className="text-muted-foreground flex-shrink-0 text-[10px]">
              {dailySummary.water.current} / {dailySummary.water.target} мл
            </span>
            <div className="ml-auto flex gap-1">
              {[200, 350, 500].map((ml) => (
                <button
                  key={ml}
                  onClick={() => onQuickWater(ml)}
                  className="rounded-md bg-cyan-500/10 px-2 py-1 text-[10px] font-medium text-cyan-400 transition-colors hover:bg-cyan-500/20"
                >
                  +{ml}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Warning flags */}
        {(dailySummary.flags.isOvereating ||
          dailySummary.flags.isLowEnergy ||
          dailySummary.flags.isBadMood ||
          dailySummary.flags.isRitualsFailed ||
          dailySummary.flags.isDehydrated) && (
          <div className="mt-3 flex flex-wrap gap-1">
            {dailySummary.flags.isDehydrated && (
              <Badge
                variant="outline"
                className="border-cyan-500/30 bg-cyan-500/10 text-[10px] text-cyan-400"
              >
                💧 Обезвоживание
              </Badge>
            )}
            {dailySummary.flags.isOvereating && (
              <Badge
                variant="outline"
                className="border-red-500/30 bg-red-500/10 text-[10px] text-red-400"
              >
                🍔 Переедание
              </Badge>
            )}
            {dailySummary.flags.isLowEnergy && (
              <Badge
                variant="outline"
                className="border-orange-500/30 bg-orange-500/10 text-[10px] text-orange-400"
              >
                🪫 Низкая энергия
              </Badge>
            )}
            {dailySummary.flags.isRitualsFailed && (
              <Badge
                variant="outline"
                className="border-yellow-500/30 bg-yellow-500/10 text-[10px] text-yellow-400"
              >
                ⚠️ Ритуалы
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
