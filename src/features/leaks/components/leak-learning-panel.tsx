import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PLAN_MODE_LABELS } from "@/features/leaks/lib/leak-constants";
import { formatDate, getActionLabel } from "@/features/leaks/lib/leak-formatters";
import type { LeakActionLink, LeakPattern, LeakSolutionPlan } from "@/features/leaks/types";

interface LeakLearningPanelProps {
  recentFeedbackWindowLength: number;
  recentWorkedCount: number;
  recentPartialCount: number;
  recentFailedCount: number;
  policyLinkedCreatedWithoutFeedback: number;
  matchedPattern: LeakPattern | null;
  matchedPatternLinkType: "exact" | "fuzzy" | "none";
  canSyncTitleWithPattern: boolean;
  updating: boolean;
  onOpenPatterns: () => void;
  onSyncTitleWithPattern: () => void;
}

export function LeakLearningPanel({
  recentFeedbackWindowLength,
  recentWorkedCount,
  recentPartialCount,
  recentFailedCount,
  policyLinkedCreatedWithoutFeedback,
  matchedPattern,
  matchedPatternLinkType,
  canSyncTitleWithPattern,
  updating,
  onOpenPatterns,
  onSyncTitleWithPattern,
}: LeakLearningPanelProps) {
  return (
    <>
      {recentFeedbackWindowLength > 0 && (
        <div className="space-y-2">
          <div className="text-xs tracking-wide text-white/40 uppercase">Learning summary</div>
          <div className="flex flex-wrap gap-2">
            <Badge className="border-white/10 bg-white/10 text-white/70">
              Recent: {recentFeedbackWindowLength}
            </Badge>
            <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-200">
              Worked: {recentWorkedCount}
            </Badge>
            <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-200">
              Partial: {recentPartialCount}
            </Badge>
            <Badge className="border-rose-500/20 bg-rose-500/10 text-rose-200">
              Failed: {recentFailedCount}
            </Badge>
            <Badge className="border-indigo-500/20 bg-indigo-500/10 text-indigo-200">
              Без feedback по policy-created: {policyLinkedCreatedWithoutFeedback}
            </Badge>
          </div>
        </div>
      )}

      {matchedPattern !== null && (
        <div className="space-y-2">
          <div className="text-xs tracking-wide text-white/40 uppercase">Learning слой</div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-white/10 bg-white/10 text-white/70">
              Паттерн: {matchedPattern.leakType}
            </Badge>
            <Badge className="border-white/10 bg-white/10 text-white/70">
              Анализов: {matchedPattern.analysisCount}
            </Badge>
            <Badge
              className={
                matchedPatternLinkType === "exact"
                  ? "border-indigo-500/20 bg-indigo-500/10 text-indigo-200"
                  : matchedPatternLinkType === "fuzzy"
                    ? "border-amber-500/20 bg-amber-500/10 text-amber-200"
                    : "border-white/10 bg-white/10 text-white/70"
              }
            >
              Связь:{" "}
              {matchedPatternLinkType === "exact"
                ? "точное совпадение"
                : matchedPatternLinkType === "fuzzy"
                  ? "похожее название"
                  : "не определена"}
            </Badge>
            <Badge className="border-white/10 bg-white/10 text-white/70">
              Обновлено: {formatDate(matchedPattern.updatedAt)}
            </Badge>
            {(matchedPattern.workedCount || 0) > 0 && (
              <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-200">
                Сработало: {matchedPattern.workedCount}
              </Badge>
            )}
            {(matchedPattern.partialCount || 0) > 0 && (
              <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-200">
                Частично: {matchedPattern.partialCount}
              </Badge>
            )}
            {(matchedPattern.failedCount || 0) > 0 && (
              <Badge className="border-rose-500/20 bg-rose-500/10 text-rose-200">
                Не помогло: {matchedPattern.failedCount}
              </Badge>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenPatterns}
              className="border-white/15 bg-white/5 text-white hover:bg-white/10"
            >
              Открыть Patterns
            </Button>
          </div>

          <div className="text-xs text-white/55">
            {matchedPatternLinkType === "exact"
              ? "Связь построена по точному совпадению названия leak и pattern."
              : matchedPatternLinkType === "fuzzy"
                ? "Связь построена по похожему названию. Проверь формулировку leak для более точного обучения."
                : "Тип связи не определён автоматически."}
          </div>

          {canSyncTitleWithPattern && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onSyncTitleWithPattern}
                disabled={updating}
                className="border-amber-500/20 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15"
              >
                {updating ? "Синхронизирую..." : "Синхронизировать название с паттерном"}
              </Button>
            </div>
          )}

          {matchedPattern.workedExamples && matchedPattern.workedExamples.length > 0 ? (
            <div className="space-y-2">
              {matchedPattern.workedExamples.map((item) => (
                <div
                  key={`${item.text}-${item.updatedAt || "na"}`}
                  className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2"
                >
                  <div className="text-sm text-emerald-100">{item.text}</div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {item.sourcePlanMode && (
                      <Badge className="border-white/10 bg-white/10 text-white/70">
                        Режим:{" "}
                        {item.sourcePlanMode in PLAN_MODE_LABELS
                          ? PLAN_MODE_LABELS[item.sourcePlanMode as LeakSolutionPlan["mode"]]
                          : item.sourcePlanMode}
                      </Badge>
                    )}
                    {item.linkedEntityLabel && item.linkedEntityType && (
                      <Badge className="border-indigo-500/20 bg-indigo-500/10 text-indigo-200">
                        Сущность:{" "}
                        {getActionLabel(item.linkedEntityType as LeakActionLink["entityType"])} •{" "}
                        {item.linkedEntityLabel}
                      </Badge>
                    )}
                    {item.updatedAt && (
                      <Badge className="border-white/10 bg-white/10 text-white/65">
                        Feedback: {formatDate(item.updatedAt)}
                      </Badge>
                    )}
                  </div>
                  {item.comment && (
                    <div className="mt-1 text-xs text-emerald-100/80">{item.comment}</div>
                  )}
                </div>
              ))}
            </div>
          ) : matchedPattern.whatWorked?.length ? (
            <div className="flex flex-wrap gap-2">
              {matchedPattern.whatWorked.map((item) => (
                <Badge
                  key={item}
                  className="border-emerald-500/20 bg-emerald-500/10 text-left whitespace-normal text-emerald-200"
                >
                  {item}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/55">
              После первых feedback тут появятся решения, которые стабильно работают именно для
              этого leak.
            </p>
          )}
        </div>
      )}
    </>
  );
}
