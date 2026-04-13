import { Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PLAN_MODE_LABELS } from "@/features/leaks/lib/leak-constants";
import { formatDate, getActionLabel } from "@/features/leaks/lib/leak-formatters";
import { normalizeLookupValue } from "@/features/leaks/lib/leak-selectors";
import type {
  LeakActionLink,
  LeakEntity,
  LeakPattern,
  LeakSolutionPlan,
  PatternFilter,
} from "@/features/leaks/types";

interface PatternsTabProps {
  patternFilter: PatternFilter;
  patterns: LeakPattern[];
  visiblePatterns: LeakPattern[];
  leaks: LeakEntity[];
  savingPatternLeakType: string | null;
  onPatternFilterChange: (value: PatternFilter) => void;
  onCreateLeakFromPattern: (pattern: LeakPattern) => void;
  onSelectLinkedLeak: (leakId: string) => void;
}

function getPillClassName(isActive: boolean) {
  return `rounded-full border px-3 py-1.5 text-sm transition-colors ${
    isActive
      ? "border-indigo-400/30 bg-indigo-500/10 text-indigo-200"
      : "border-white/10 bg-white/5 text-white/55 hover:bg-white/10"
  }`;
}

export function PatternsTab({
  patternFilter,
  patterns,
  visiblePatterns,
  leaks,
  savingPatternLeakType,
  onPatternFilterChange,
  onCreateLeakFromPattern,
  onSelectLinkedLeak,
}: PatternsTabProps) {
  const linkedPatternsCount = patterns.filter((item) => (item.activeLeakCount || 0) > 0).length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-white/60">
        Здесь накапливается история AI-разборов и то, что уже реально помогало.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onPatternFilterChange("all")}
          className={getPillClassName(patternFilter === "all")}
        >
          Все ({patterns.length})
        </button>
        <button
          type="button"
          onClick={() => onPatternFilterChange("linked")}
          className={getPillClassName(patternFilter === "linked")}
        >
          С активными leaks ({linkedPatternsCount})
        </button>
      </div>

      {visiblePatterns.length === 0 ? (
        <Card
          style={{
            background: "rgba(15,23,42,0.82)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <CardContent className="pt-6">
            <p className="text-sm text-white/60">
              {patternFilter === "linked"
                ? "Пока нет паттернов, у которых есть активные leaks в работе."
                : "AI-паттерны появятся после первых разборов сигналов или ручных ликов."}
            </p>
          </CardContent>
        </Card>
      ) : (
        visiblePatterns.map((pattern) => {
          const activeLinkedLeaks =
            Array.isArray(pattern.activeLeaks) && pattern.activeLeaks.length > 0
              ? pattern.activeLeaks
              : leaks
                  .filter(
                    (leak) =>
                      leak.status !== "resolved" &&
                      leak.status !== "archived" &&
                      normalizeLookupValue(leak.title) === normalizeLookupValue(pattern.leakType)
                  )
                  .map((leak) => ({
                    id: leak.id,
                    title: leak.title,
                    status: leak.status,
                    updatedAt: leak.updatedAt,
                    matchType:
                      normalizeLookupValue(leak.title) === normalizeLookupValue(pattern.leakType)
                        ? ("exact" as const)
                        : ("fuzzy" as const),
                  }));
          const exactLinkedCount = activeLinkedLeaks.filter(
            (leak) => leak.matchType === "exact"
          ).length;
          const fuzzyLinkedCount = activeLinkedLeaks.filter(
            (leak) => leak.matchType === "fuzzy"
          ).length;

          return (
            <Card
              key={pattern.leakType}
              style={{
                background: "rgba(15,23,42,0.82)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <CardContent className="space-y-3 pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-white">{pattern.leakType}</div>
                    <div className="mt-1 text-xs text-white/35">
                      Последнее обновление: {formatDate(pattern.updatedAt)}
                    </div>
                  </div>
                  <Badge className="border-white/10 bg-white/10 text-white/75">
                    Анализов: {pattern.analysisCount}
                  </Badge>
                  {(pattern.workedCount || 0) > 0 && (
                    <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-200">
                      Сработало: {pattern.workedCount}
                    </Badge>
                  )}
                  {typeof pattern.activeLeakCount === "number" && pattern.activeLeakCount > 0 && (
                    <Badge className="border-indigo-500/20 bg-indigo-500/10 text-indigo-200">
                      Активных leaks: {pattern.activeLeakCount}
                    </Badge>
                  )}
                  {typeof pattern.clusterSize === "number" && pattern.clusterSize > 1 && (
                    <Badge className="border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-200">
                      Кластер: {pattern.clusterSize}
                    </Badge>
                  )}
                  {typeof pattern.clusterConfidence === "number" &&
                    pattern.clusterSize &&
                    pattern.clusterSize > 1 && (
                      <Badge
                        className={
                          pattern.clusterConfidence >= 0.6
                            ? "border-indigo-500/20 bg-indigo-500/10 text-indigo-200"
                            : "border-amber-500/20 bg-amber-500/10 text-amber-200"
                        }
                      >
                        {pattern.clusterConfidence >= 0.6
                          ? `Cluster confidence: ${Math.round(pattern.clusterConfidence * 100)}%`
                          : `Низкая уверенность: ${Math.round(pattern.clusterConfidence * 100)}%`}
                      </Badge>
                    )}
                  {pattern.clusterConflict && pattern.clusterConflict !== "none" && (
                    <Badge
                      className={
                        pattern.clusterConflict === "high"
                          ? "border-rose-500/20 bg-rose-500/10 text-rose-200"
                          : "border-amber-500/20 bg-amber-500/10 text-amber-200"
                      }
                    >
                      {pattern.clusterConflict === "high"
                        ? `Сильный конфликт: ${Math.round((pattern.clusterConflictRatio || 0) * 100)}%`
                        : `Смешанный конфликт: ${Math.round((pattern.clusterConflictRatio || 0) * 100)}%`}
                    </Badge>
                  )}
                  {typeof pattern.clusterWorkedCount === "number" &&
                    pattern.clusterWorkedCount > 0 && (
                      <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-200">
                        Кластер worked: {pattern.clusterWorkedCount}
                      </Badge>
                    )}
                  {typeof pattern.clusterFailedCount === "number" &&
                    pattern.clusterFailedCount > 0 && (
                      <Badge className="border-rose-500/20 bg-rose-500/10 text-rose-200">
                        Кластер failed: {pattern.clusterFailedCount}
                      </Badge>
                    )}
                  {exactLinkedCount > 0 && (
                    <Badge className="border-indigo-500/20 bg-indigo-500/10 text-indigo-200">
                      Exact: {exactLinkedCount}
                    </Badge>
                  )}
                  {fuzzyLinkedCount > 0 && (
                    <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-200">
                      Fuzzy: {fuzzyLinkedCount}
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onCreateLeakFromPattern(pattern)}
                    disabled={savingPatternLeakType === pattern.leakType}
                    className="border-indigo-500/20 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/15"
                  >
                    {savingPatternLeakType === pattern.leakType ? "Сохраняю..." : "В leak"}
                  </Button>
                </div>

                {pattern.clusterLeakTypes &&
                  pattern.clusterLeakTypes.length > 1 &&
                  (pattern.clusterSize || 0) >= 2 && (
                    <div className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/10 px-3 py-2">
                      <div className="text-xs tracking-wide text-fuchsia-100/80 uppercase">
                        Learning cluster
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {pattern.clusterLeakTypes.slice(0, 6).map((item) => (
                          <Badge
                            key={`${pattern.leakType}-cluster-${item}`}
                            className="border-white/10 bg-white/10 text-white/80"
                          >
                            {item}
                          </Badge>
                        ))}
                      </div>
                      {pattern.clusterWorkedExamples &&
                        pattern.clusterWorkedExamples.length > 0 && (
                          <div className="mt-2 text-xs text-emerald-100/90">
                            Worked в кластере:{" "}
                            {pattern.clusterWorkedExamples.slice(0, 3).join(" • ")}
                          </div>
                        )}
                      {pattern.clusterFailedExamples &&
                        pattern.clusterFailedExamples.length > 0 && (
                          <div className="mt-1 text-xs text-rose-100/90">
                            Failed в кластере:{" "}
                            {pattern.clusterFailedExamples.slice(0, 3).join(" • ")}
                          </div>
                        )}
                      {pattern.clusterConflict && pattern.clusterConflict !== "none" && (
                        <div className="mt-1 text-xs text-amber-100/90">
                          Кластер даёт конфликтные сигналы: есть и worked, и failed. Подбирай режим
                          аккуратно.
                        </div>
                      )}
                    </div>
                  )}

                {activeLinkedLeaks.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs tracking-wide text-white/40 uppercase">
                      Активные leaks по этому паттерну
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {activeLinkedLeaks.map((leak) => (
                        <Button
                          key={leak.id}
                          size="sm"
                          variant="outline"
                          onClick={() => onSelectLinkedLeak(leak.id)}
                          className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                        >
                          {leak.title}
                          {leak.matchType === "fuzzy" ? " (fuzzy)" : ""}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {pattern.workedExamples && pattern.workedExamples.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs tracking-wide text-white/40 uppercase">
                      <Lightbulb className="h-3.5 w-3.5" />
                      Что уже сработало
                    </div>
                    <div className="space-y-2">
                      {pattern.workedExamples.map((item) => (
                        <div
                          key={`${pattern.leakType}-${item.text}-${item.updatedAt || "na"}`}
                          className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2"
                        >
                          <div className="text-sm text-emerald-100">{item.text}</div>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {item.sourcePlanMode && (
                              <Badge className="border-white/10 bg-white/10 text-white/70">
                                Режим:{" "}
                                {item.sourcePlanMode in PLAN_MODE_LABELS
                                  ? PLAN_MODE_LABELS[
                                      item.sourcePlanMode as LeakSolutionPlan["mode"]
                                    ]
                                  : item.sourcePlanMode}
                              </Badge>
                            )}
                            {item.linkedEntityLabel && item.linkedEntityType && (
                              <Badge className="border-indigo-500/20 bg-indigo-500/10 text-indigo-200">
                                Сущность:{" "}
                                {getActionLabel(
                                  item.linkedEntityType as LeakActionLink["entityType"]
                                )}{" "}
                                • {item.linkedEntityLabel}
                              </Badge>
                            )}
                            {item.updatedAt && (
                              <Badge className="border-white/10 bg-white/10 text-white/65">
                                Обновлено: {formatDate(item.updatedAt)}
                              </Badge>
                            )}
                          </div>
                          {item.comment && (
                            <div className="mt-1 text-xs text-emerald-100/80">{item.comment}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : pattern.whatWorked.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs tracking-wide text-white/40 uppercase">
                      <Lightbulb className="h-3.5 w-3.5" />
                      Что уже сработало
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {pattern.whatWorked.map((item) => (
                        <Badge
                          key={item}
                          className="border-emerald-500/20 bg-emerald-500/10 text-left whitespace-normal text-emerald-200"
                        >
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-white/55">
                    Пока нет отмеченных решений, которые пользователь подтвердил как рабочие.
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
