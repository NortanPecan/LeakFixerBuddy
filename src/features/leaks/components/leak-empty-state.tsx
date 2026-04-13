import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
            <div className="space-y-2">
              <div className="font-medium text-white">Здесь появится твой inbox ликов</div>
              <p className="text-sm text-white/60">
                Начни с одной короткой фразы в блоке выше, либо забери готовый сигнал из weekly data
                и уже потом разбери его с AI.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onOpenSignals}
                className="border-white/15 bg-white/5 text-white hover:bg-white/10"
              >
                Сигналы ({signalsCount})
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onOpenPatterns}
                className="border-white/15 bg-white/5 text-white hover:bg-white/10"
              >
                Patterns ({patternsCount})
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <div className="font-medium text-white">По текущим фильтрам ничего не найдено</div>
              <p className="text-sm text-white/60">
                Сбрось фильтры или поиск, чтобы снова увидеть весь inbox и активные leak-сценарии.
              </p>
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
