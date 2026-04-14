"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Droplets } from "lucide-react";
import type { WaterData } from "@/features/health/types";

interface WaterCardProps {
  waterData: WaterData | null;
  onUpdate: (delta: number) => Promise<void>;
}

export function WaterCard({ waterData, onUpdate }: WaterCardProps) {
  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Droplets className="h-5 w-5" />
          Вода
        </CardTitle>
      </CardHeader>
      <CardContent>
        {waterData && (
          <>
            <div className="mb-4 text-center">
              <div className="mb-2 flex items-center justify-center gap-2">
                <Droplets className="h-6 w-6 text-cyan-400" />
                <span className="text-primary text-3xl font-bold">{waterData.current}</span>
                <span className="text-muted-foreground text-lg">/ {waterData.target} мл</span>
              </div>
              <Badge
                variant={waterData.percentage >= 100 ? "default" : "outline"}
                className={waterData.percentage >= 100 ? "bg-emerald-500 text-white" : ""}
              >
                {waterData.percentage >= 100 ? "Цель достигнута!" : `${waterData.percentage}%`}
              </Badge>
            </div>

            <Progress value={Math.min(waterData.percentage, 100)} className="mb-4 h-3" />

            <div className="grid grid-cols-4 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void onUpdate(-500)}
                disabled={waterData.current < 500}
                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                -500
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void onUpdate(-200)}
                disabled={waterData.current < 200}
                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                -200
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void onUpdate(200)}
                className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
              >
                +200
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void onUpdate(500)}
                className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
              >
                +500
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
