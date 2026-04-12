"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Flame, Rocket, Check, Loader2 } from "lucide-react";
import { PRESET_INFO, PresetLevel } from "@/lib/wellbeing-config";

interface PresetSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPreset?: PresetLevel;
  onSelect?: (preset: PresetLevel) => void;
}

const PRESET_CARDS: Array<{
  id: PresetLevel;
  icon: React.ReactNode;
  color: string;
  borderColor: string;
  bgGradient: string;
}> = [
  {
    id: "core",
    icon: <Zap className="h-6 w-6" />,
    color: "text-cyan-400",
    borderColor: "border-cyan-500/50",
    bgGradient: "from-cyan-500/10 to-cyan-600/5",
  },
  {
    id: "expanded",
    icon: <Flame className="h-6 w-6" />,
    color: "text-orange-400",
    borderColor: "border-orange-500/50",
    bgGradient: "from-orange-500/10 to-orange-600/5",
  },
  {
    id: "full",
    icon: <Rocket className="h-6 w-6" />,
    color: "text-purple-400",
    borderColor: "border-purple-500/50",
    bgGradient: "from-purple-500/10 to-purple-600/5",
  },
];

export function PresetSelectionDialog({
  open,
  onOpenChange,
  currentPreset = "core",
  onSelect,
}: PresetSelectionDialogProps) {
  const { user } = useAppStore();
  const [selected, setSelected] = useState<PresetLevel>(currentPreset);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!user?.id || selected === currentPreset) {
      onOpenChange(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/wellbeing/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, preset: selected }),
      });

      if (!response.ok) throw new Error("Failed to update preset");

      onSelect?.(selected);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save preset:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">🎯 Трекер благополучия</DialogTitle>
          <DialogDescription>
            Выберите формат отслеживания. Можно изменить в любой момент.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {PRESET_CARDS.map((card) => {
            const info = PRESET_INFO[card.id];
            const isSelected = selected === card.id;

            return (
              <Card
                key={card.id}
                className={`cursor-pointer transition-all ${
                  isSelected
                    ? `${card.borderColor} bg-gradient-to-br ${card.bgGradient}`
                    : "bg-muted/30 hover:bg-muted/50"
                }`}
                onClick={() => setSelected(card.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`bg-background/50 rounded-lg p-2 ${card.color}`}>
                      {card.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{info.nameRu}</span>
                        <Badge variant="outline" className="text-xs">
                          {info.dailyMinutes}
                        </Badge>
                        {isSelected && <Check className={`h-4 w-4 ${card.color}`} />}
                      </div>
                      <div className="text-muted-foreground mt-1 text-xs">
                        {info.dailyQuestions} ежедневных
                        {info.weeklyQuestions > 0 && ` • ${info.weeklyQuestions} еженедельных`}
                      </div>
                      <div className="text-muted-foreground mt-1 text-xs">{info.description}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Отмена
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : selected === currentPreset ? (
              "Готово"
            ) : (
              "Сохранить"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
