import { LeakAiAnalysisCard } from "@/components/LeakAiAnalysisCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SEVERITY_STYLES } from "@/features/leaks/lib/leak-constants";
import type { LeakHint } from "@/features/leaks/types";

interface SignalsTabProps {
  userId: string;
  signals: LeakHint[];
  savingSignalKey: string | null;
  onOpenWeeklyReport: () => void;
  onCreateLeakFromSignal: (signal: LeakHint) => void;
}

export function SignalsTab({
  userId,
  signals,
  savingSignalKey,
  onOpenWeeklyReport,
  onCreateLeakFromSignal,
}: SignalsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/60">
          Сигналы, которые уже удалось вытащить из weekly data.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenWeeklyReport}
          className="border-white/15 bg-white/5 text-white hover:bg-white/10"
        >
          В недельный отчёт
        </Button>
      </div>

      {signals.length === 0 ? (
        <Card
          style={{
            background: "rgba(15,23,42,0.82)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <CardContent className="pt-6">
            <p className="text-sm text-white/60">
              Пока мало данных для автосигналов. Здесь появятся найденные паттерны недели.
            </p>
          </CardContent>
        </Card>
      ) : (
        signals.map((signal, index) => (
          <Card
            key={`${signal.type}-${index}`}
            style={{
              background: "rgba(15,23,42,0.82)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <CardContent className="pt-4">
              <div className="flex gap-3">
                <div className="text-2xl">{signal.emoji}</div>
                <div className="flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge className={SEVERITY_STYLES[signal.severity]}>{signal.severity}</Badge>
                    {signal.days?.map((day) => (
                      <Badge key={day} variant="outline" className="border-white/10 text-white/55">
                        {day}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-white/75">{signal.message}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onCreateLeakFromSignal(signal)}
                      disabled={savingSignalKey === `${signal.type}:${signal.message}`}
                      className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                    >
                      Сохранить как leak
                    </Button>
                  </div>
                  <LeakAiAnalysisCard
                    userId={userId}
                    leakType={signal.type}
                    leakMessage={signal.message}
                    severity={signal.severity}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
