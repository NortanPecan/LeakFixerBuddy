"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Scale, TrendingUp, TrendingDown, Minus, Target, BarChart3, List } from "lucide-react";
import { WeightHistoryModal } from "@/components/weight/WeightHistoryModal";
import { WeightRecordsModal } from "@/components/weight/WeightRecordsModal";
import { WeightGoalModal } from "@/components/weight/WeightGoalModal";
import type { WeightData } from "@/features/home/types";

interface WeightCardProps {
  weightData: WeightData | null;
  weightValue: string;
  setWeightValue: (v: string) => void;
  weightLoading: boolean;
  weightSaving: boolean;
  onSave: () => void;
  onGoalUpdate: () => void;
}

export function WeightCard({
  weightData,
  weightValue,
  setWeightValue,
  weightLoading,
  weightSaving,
  onSave,
  onGoalUpdate,
}: WeightCardProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [showRecords, setShowRecords] = useState(false);
  const [showGoal, setShowGoal] = useState(false);

  return (
    <>
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="h-5 w-5" />
            Вес сегодня
          </CardTitle>
        </CardHeader>
        <CardContent>
          {weightLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-4 w-24" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="72.5"
                    value={weightValue}
                    onChange={(e) => setWeightValue(e.target.value)}
                    className="h-12 text-center text-2xl font-bold"
                  />
                  <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                    кг
                  </span>
                </div>
                <Button
                  className="bg-primary h-12 px-4"
                  onClick={onSave}
                  disabled={!weightValue || weightSaving}
                >
                  {weightSaving ? "..." : "Записать"}
                </Button>
              </div>

              <div className="text-muted-foreground flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  {weightData?.changeWeek !== null && weightData?.changeWeek !== undefined ? (
                    <>
                      {weightData.changeWeek < 0 ? (
                        <TrendingDown className="h-3 w-3 text-emerald-400" />
                      ) : weightData.changeWeek > 0 ? (
                        <TrendingUp className="h-3 w-3 text-red-400" />
                      ) : (
                        <Minus className="h-3 w-3" />
                      )}
                      <span
                        className={
                          weightData.changeWeek < 0
                            ? "text-emerald-400"
                            : weightData.changeWeek > 0
                              ? "text-red-400"
                              : ""
                        }
                      >
                        За неделю: {weightData.changeWeek > 0 ? "+" : ""}
                        {weightData.changeWeek.toFixed(1)} кг
                      </span>
                    </>
                  ) : (
                    <span>За неделю: —</span>
                  )}
                </div>
                {weightData?.targetWeight && weightData?.toGoal !== null && (
                  <div className="flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    <span>
                      До цели ({weightData.targetWeight.toFixed(0)} кг):{" "}
                      {weightData.toGoal > 0 ? "-" : "+"}
                      {Math.abs(weightData.toGoal).toFixed(1)} кг
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => setShowHistory(true)}
                >
                  <BarChart3 className="mr-1 h-3 w-3" />
                  График
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => setShowRecords(true)}
                >
                  <List className="mr-1 h-3 w-3" />
                  История
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <WeightHistoryModal
        open={showHistory}
        onOpenChange={setShowHistory}
        onOpenRecords={() => {
          setShowHistory(false);
          setShowRecords(true);
        }}
        onOpenGoal={() => {
          setShowHistory(false);
          setShowGoal(true);
        }}
      />
      <WeightRecordsModal open={showRecords} onOpenChange={setShowRecords} />
      <WeightGoalModal
        open={showGoal}
        onOpenChange={setShowGoal}
        currentWeight={weightData?.currentWeight}
        onUpdate={onGoalUpdate}
      />
    </>
  );
}
