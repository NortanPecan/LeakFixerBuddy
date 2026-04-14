"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Timer, Utensils } from "lucide-react";
import { timeToMinutes } from "@/features/health/constants";
import type { FoodEntry } from "@/features/health/types";

interface FastingWidgetProps {
  entries: FoodEntry[];
}

export function FastingWidget({ entries }: FastingWidgetProps) {
  const withTime = entries.filter((e) => e.time && /^\d{2}:\d{2}$/.test(e.time));
  if (withTime.length < 2) {
    return (
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Timer className="h-5 w-5 text-violet-400" />
            Интервальное голодание
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground py-2 text-center text-sm">
            {withTime.length === 0
              ? "Добавь приёмы пищи со временем, чтобы увидеть окно голодания"
              : "Нужно минимум 2 записи с указанным временем"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const times = withTime.map((e) => timeToMinutes(e.time!)).sort((a, b) => a - b);
  const firstMin = times[0];
  const lastMin = times[times.length - 1];
  const eatingWindow = (lastMin - firstMin) / 60;
  const fastingWindow = 24 - eatingWindow;

  const firstEntry = withTime.find((e) => timeToMinutes(e.time!) === firstMin)!;
  const lastEntry = withTime
    .slice()
    .reverse()
    .find((e) => timeToMinutes(e.time!) === lastMin)!;

  let protocol = "";
  let protocolColor = "text-muted-foreground";
  if (fastingWindow >= 20) {
    protocol = "20:4";
    protocolColor = "text-violet-400";
  } else if (fastingWindow >= 18) {
    protocol = "18:6";
    protocolColor = "text-emerald-400";
  } else if (fastingWindow >= 16) {
    protocol = "16:8";
    protocolColor = "text-emerald-400";
  } else if (fastingWindow >= 14) {
    protocol = "14:10";
    protocolColor = "text-yellow-400";
  } else if (fastingWindow >= 12) {
    protocol = "12:12";
    protocolColor = "text-orange-400";
  }

  const fastingColor =
    fastingWindow >= 16
      ? "#22c55e"
      : fastingWindow >= 14
        ? "#f59e0b"
        : fastingWindow >= 12
          ? "#f97316"
          : "#ef4444";
  const pct = Math.min((fastingWindow / 24) * 100, 100);

  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Timer className="h-5 w-5 text-violet-400" />
          Интервальное голодание
          {protocol && (
            <span className={`ml-auto text-sm font-bold ${protocolColor}`}>{protocol}</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <div className="text-muted-foreground mb-1 flex justify-between text-xs">
            <span>Голодание</span>
            <span className="font-bold" style={{ color: fastingColor }}>
              {fastingWindow.toFixed(1)} ч
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, background: fastingColor }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <Utensils className="mx-auto mb-1 h-4 w-4 text-emerald-400" />
            <p className="text-muted-foreground text-xs">Первый приём</p>
            <p className="text-sm font-bold">{firstEntry.time}</p>
            <p className="text-muted-foreground truncate text-xs">{firstEntry.name}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <Clock className="mx-auto mb-1 h-4 w-4 text-orange-400" />
            <p className="text-muted-foreground text-xs">Последний приём</p>
            <p className="text-sm font-bold">{lastEntry.time}</p>
            <p className="text-muted-foreground truncate text-xs">{lastEntry.name}</p>
          </div>
        </div>

        <div className="bg-muted/20 flex items-center justify-between rounded-lg px-3 py-2 text-sm">
          <span className="text-muted-foreground">Окно еды</span>
          <span className="font-medium">{eatingWindow.toFixed(1)} ч</span>
        </div>
      </CardContent>
    </Card>
  );
}
