import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Inbox, Search } from "lucide-react";

interface LeakEmptyStateProps {
  hasLeaks: boolean;
  signalsCount: number;
  patternsCount: number;
  onOpenSignals: () => void;
  onOpenPatterns: () => void;
  onClearFilters: () => void;
}

export function LeakEmptyState({
  hasLeaks,
  signalsCount,
  patternsCount,
  onOpenSignals,
  onOpenPatterns,
  onClearFilters,
}: LeakEmptyStateProps) {
  return (
    <Card
      style={{
        background: "rgba(15,23,42,0.82)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <CardContent className="space-y-4 pt-6">
        {!hasLeaks ? (
          <>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10">
                <Inbox className="h-5 w-5 text-indigo-300" />
              </div>
              <div>
                <div className="font-medium text-white">Пока пусто</div>
                <p className="text-sm text-white/60">
                  Заметь первое слабое место выше — или возьми готовый сигнал из weekly data.
                </p>
              </div>
            </div>
            {(signalsCount > 0 || patternsCount > 0) && (
              <div className="flex flex-wrap gap-2">
                {signalsCount > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onOpenSignals}
                    className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                  >
                    Сигналы ({signalsCount})
                  </Button>
                )}
                {patternsCount > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onOpenPatterns}
                    className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                  >
                    Паттерны ({patternsCount})
                  </Button>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
                <Search className="h-5 w-5 text-white/50" />
              </div>
              <div>
                <div className="font-medium text-white">Ничего не найдено</div>
                <p className="text-sm text-white/60">
                  Попробуй сбросить фильтры или изменить поиск.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onClearFilters}
                className="border-white/15 bg-white/5 text-white hover:bg-white/10"
              >
                Сбросить фильтры
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
