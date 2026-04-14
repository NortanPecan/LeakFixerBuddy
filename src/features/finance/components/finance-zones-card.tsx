"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ZONE_CONFIG } from "@/features/finance/lib/finance-constants";
import { formatMoney } from "@/features/finance/lib/finance-formatters";

interface FinanceZonesCardProps {
  byZone: Record<string, number>;
  title: string;
}

export function FinanceZonesCard({ byZone, title }: FinanceZonesCardProps) {
  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(byZone).map(([zone, amount]) => {
            const zoneConfig = ZONE_CONFIG[zone] || ZONE_CONFIG.general;
            return (
              <div key={zone} className="bg-muted/30 flex items-center gap-2 rounded-lg p-2">
                <span className="text-lg">{zoneConfig.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-muted-foreground truncate text-xs">{zoneConfig.label}</p>
                  <p
                    className={`text-sm font-bold ${amount >= 0 ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {formatMoney(amount)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
