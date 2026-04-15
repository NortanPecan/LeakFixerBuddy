"use client";

import { useGymContext } from "@/features/gym/GymContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, Plus, Trash2 } from "lucide-react";

export function GymPeriodList() {
  const {
    periods,
    setPeriods,
    activePeriod,
    setActivePeriod,
    setShowPeriodList,
    resetWizard,
    setShowWizard,
  } = useGymContext();

  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-lg">Периоды</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {periods.map((period) => (
          <div
            key={period.id}
            className={`flex cursor-pointer items-center justify-between rounded-lg p-3 transition-colors ${
              period.isActive
                ? "bg-primary/10 border-primary/30 border"
                : "bg-muted/30 hover:bg-muted/50"
            }`}
          >
            <div
              className="flex flex-1 items-center gap-3"
              onClick={() => {
                setActivePeriod(period);
                setShowPeriodList(false);
              }}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  period.isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                }`}
              >
                <Dumbbell className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">{period.name}</p>
                <p className="text-muted-foreground text-sm">
                  Цикл {period.currentCycle} из {period.totalCycles} • {period.type}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {period.isActive && (
                <Badge className="bg-primary text-primary-foreground text-xs">Активен</Badge>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                onClick={async (e) => {
                  e.stopPropagation();
                  if (confirm(`Удалить период "${period.name}"? Все данные будут потеряны.`)) {
                    try {
                      const response = await fetch(`/api/gym?periodId=${period.id}`, {
                        method: "DELETE",
                      });
                      if (response.ok) {
                        setPeriods((prev) => prev.filter((p) => p.id !== period.id));
                        if (activePeriod?.id === period.id) {
                          setActivePeriod(periods.find((p) => p.id !== period.id) ?? null);
                        }
                      }
                    } catch (error) {
                      console.error("Failed to delete period:", error);
                    }
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {periods.length === 0 && (
          <p className="text-muted-foreground py-4 text-center">Нет периодов</p>
        )}
        <Button
          className="mt-2 w-full"
          variant="outline"
          onClick={() => {
            resetWizard();
            setShowWizard(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Новый период
        </Button>
      </CardContent>
    </Card>
  );
}
