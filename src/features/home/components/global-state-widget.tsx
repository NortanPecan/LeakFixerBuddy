"use client";

import { useCallback, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useAppStore } from "@/lib/store";

interface GlobalStateWidgetProps {
  morningEnergy?: number;
}

export function GlobalStateWidget({ morningEnergy }: GlobalStateWidgetProps) {
  const { globalState, updateGlobalState } = useAppStore();
  const [showMoodDialog, setShowMoodDialog] = useState(false);
  const [moodValue, setMoodValue] = useState(globalState?.mood ?? 5);
  const [energyValue, setEnergyValue] = useState(globalState?.energy ?? 5);

  const getMoodColor = useCallback((level: number) => {
    const colors = [
      "bg-red-500",
      "bg-red-400",
      "bg-orange-500",
      "bg-orange-400",
      "bg-yellow-400",
      "bg-lime-400",
      "bg-lime-500",
      "bg-green-400",
      "bg-green-500",
      "bg-emerald-400",
    ];
    return colors[level - 1] || "bg-gray-500";
  }, []);

  const handleOpenDialog = () => {
    setMoodValue(globalState?.mood ?? 5);
    setEnergyValue(globalState?.energy ?? 5);
    setShowMoodDialog(true);
  };

  const handleSaveMood = async () => {
    await updateGlobalState(moodValue, energyValue);
    setShowMoodDialog(false);
  };

  const energy = globalState?.energy ?? morningEnergy ?? 0;
  const energyColor =
    energy >= 7 ? "bg-yellow-400" : energy >= 5 ? "bg-amber-500" : "bg-orange-700";

  return (
    <>
      <Card className="border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-800/50 backdrop-blur-xl">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Dual vertical scales */}
            <div className="flex items-center gap-2">
              {/* Mood bar */}
              <div className="flex flex-col items-center">
                <div className="mb-1 text-[9px] font-medium text-orange-400">ПИК 🔥</div>
                <div className="relative flex h-36 w-8 flex-col justify-between overflow-hidden rounded-xl border border-white/20 bg-slate-900/60 p-1">
                  {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((level) => (
                    <div
                      key={level}
                      className={`mx-0.5 h-2.5 rounded transition-colors ${
                        globalState && level <= globalState.mood
                          ? getMoodColor(globalState.mood)
                          : "bg-slate-800"
                      }`}
                    />
                  ))}
                </div>
                <div className="text-muted-foreground mt-1 text-[9px]">😊</div>
              </div>

              {/* Energy bar */}
              <div className="flex flex-col items-center">
                <div className="mb-1 text-[9px] font-medium text-yellow-400">⚡</div>
                <div className="relative flex h-36 w-8 flex-col justify-between overflow-hidden rounded-xl border border-white/20 bg-slate-900/60 p-1">
                  {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((level) => (
                    <div
                      key={level}
                      className={`mx-0.5 h-2.5 rounded transition-colors ${
                        energy > 0 && level <= energy ? energyColor : "bg-slate-800"
                      }`}
                    />
                  ))}
                </div>
                <div className="text-muted-foreground mt-1 text-[9px]">🔋</div>
              </div>
            </div>

            {/* Right: Text and controls */}
            <div className="flex h-36 flex-1 flex-col justify-between">
              <div>
                <div className="text-muted-foreground mb-1 text-[10px] tracking-wider uppercase">
                  Глобальное состояние
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="bg-gradient-to-r from-emerald-300 to-emerald-500 bg-clip-text text-3xl font-black text-transparent">
                    {globalState?.mood?.toFixed(1) || "—"}
                  </span>
                  <span className="text-muted-foreground text-sm">/ 10</span>
                </div>
                <div className="mt-1 text-xs font-medium text-emerald-400">
                  {globalState?.status || "Нажмите обновить"}
                </div>
              </div>

              <div className="text-muted-foreground flex items-center gap-2 text-[10px]">
                <span>Вчера: {(globalState?.mood || 5) - (globalState?.trend || 0)}</span>
                {globalState?.trend !== undefined && (
                  <span
                    className={`flex items-center gap-0.5 ${
                      globalState.trend > 0
                        ? "text-emerald-400"
                        : globalState.trend < 0
                          ? "text-red-400"
                          : "text-muted-foreground"
                    }`}
                  >
                    {globalState.trend > 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : globalState.trend < 0 ? (
                      <TrendingDown className="h-3 w-3" />
                    ) : (
                      <Minus className="h-3 w-3" />
                    )}
                    {globalState.trend > 0 ? "+" : ""}
                    {globalState.trend.toFixed(1)}
                  </span>
                )}
              </div>

              <Button
                size="sm"
                variant="outline"
                className="self-start border-0 bg-sky-500/90 text-xs text-white hover:bg-sky-400"
                onClick={handleOpenDialog}
              >
                ✏️ Обновить настроение
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showMoodDialog} onOpenChange={setShowMoodDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Как ты себя чувствуешь?</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Настроение</span>
                <span className="text-2xl font-bold">{moodValue}</span>
              </div>
              <Slider
                value={[moodValue]}
                onValueChange={([v]) => setMoodValue(v)}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <div className="text-muted-foreground flex justify-between text-xs">
                <span>💀 Кризис</span>
                <span>🔥 Пик</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Энергия</span>
                <span className="text-2xl font-bold">{energyValue}</span>
              </div>
              <Slider
                value={[energyValue]}
                onValueChange={([v]) => setEnergyValue(v)}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <div className="text-muted-foreground flex justify-between text-xs">
                <span>🪫 Ноль</span>
                <span>⚡ Полный</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowMoodDialog(false)}>
                Отмена
              </Button>
              <Button className="bg-primary flex-1" onClick={handleSaveMood}>
                Сохранить
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
