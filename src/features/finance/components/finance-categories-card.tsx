"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Edit2, PiggyBank } from "lucide-react";
import { ZONE_CONFIG } from "@/features/finance/lib/finance-constants";
import { formatMoney } from "@/features/finance/lib/finance-formatters";
import type { Category } from "@/features/finance/types";

interface FinanceCategoriesLabels {
  title: string;
  empty: string;
  noLimit: string;
  remainder: string;
  fromBudget: string;
  overBudgetPrefix: string;
  editBudgetTitle: string;
}

interface FinanceCategoriesCardProps {
  categories: Category[];
  labels: FinanceCategoriesLabels;
  onEditBudget: (category: Category) => void;
}

export function FinanceCategoriesCard({
  categories,
  labels,
  onEditBudget,
}: FinanceCategoriesCardProps) {
  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <PiggyBank className="h-5 w-5" />
          {labels.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {categories.length ? (
          <div className="space-y-3">
            {categories.map((category) => {
              const zoneConfig = ZONE_CONFIG[category.zone] || ZONE_CONFIG.general;
              const spentAbs = Math.abs(category.spent);
              const progress = category.monthlyTarget
                ? Math.min((spentAbs / category.monthlyTarget) * 100, 100)
                : null;
              const overBudget = category.monthlyTarget ? spentAbs > category.monthlyTarget : false;
              const progressColor = !category.monthlyTarget
                ? ""
                : overBudget
                  ? "[&>div]:bg-red-500"
                  : progress !== null && progress >= 70
                    ? "[&>div]:bg-yellow-500"
                    : "[&>div]:bg-emerald-500";

              return (
                <div key={category.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{category.icon || zoneConfig.emoji}</span>
                      <div>
                        <p className="text-sm font-medium">{category.name}</p>
                        <p className="text-muted-foreground text-xs">{zoneConfig.label}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p
                          className={`font-bold ${category.spent <= 0 ? "text-red-400" : "text-emerald-400"}`}
                        >
                          {formatMoney(spentAbs)}
                        </p>
                        {category.monthlyTarget ? (
                          <div>
                            <p
                              className={`text-xs ${overBudget ? "font-medium text-red-400" : "text-muted-foreground"}`}
                            >
                              {overBudget ? labels.overBudgetPrefix : ""}
                              {labels.fromBudget} {formatMoney(category.monthlyTarget)}
                            </p>
                            {!overBudget && (
                              <p className="text-[10px] text-emerald-400/70">
                                {labels.remainder} {formatMoney(category.monthlyTarget - spentAbs)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-muted-foreground/50 text-xs">{labels.noLimit}</p>
                        )}
                      </div>
                      <button
                        className="hover:bg-muted/50 text-muted-foreground hover:text-foreground shrink-0 rounded-lg p-1.5 transition-colors"
                        onClick={() => onEditBudget(category)}
                        title={labels.editBudgetTitle}
                        type="button"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {progress !== null && (
                    <Progress value={progress} className={`h-2 ${progressColor}`} />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-4 text-center">
            <PiggyBank className="text-muted-foreground/50 mx-auto mb-2 h-8 w-8" />
            <p className="text-muted-foreground text-sm">{labels.empty}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
