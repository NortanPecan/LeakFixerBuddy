import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PLAN_KIND_LABELS,
  PLAN_MODE_LABELS,
  PLAN_MODE_STYLES,
} from "@/features/leaks/lib/leak-constants";
import {
  formatDate,
  getActionLabel,
  getFeedbackResultLabel,
} from "@/features/leaks/lib/leak-formatters";
import { getLeakFeedbackByAction } from "@/features/leaks/lib/leak-selectors";
import type { FeedbackHistoryFilter, LeakActionLink, LeakEntity } from "@/features/leaks/types";

type FeedbackTimelineItem = ReturnType<typeof getLeakFeedbackByAction>[number];

interface LeakFeedbackHistoryPanelProps {
  leak: LeakEntity;
  feedbackHistoryFilter: FeedbackHistoryFilter;
  feedbackByAction: FeedbackTimelineItem[];
  visibleFeedbackTimeline: FeedbackTimelineItem[];
  retryingLeakId: string | null;
  onFeedbackHistoryFilterChange: (value: FeedbackHistoryFilter) => void;
  onRetryLatestProblem: (item: FeedbackTimelineItem) => void;
  onFocusPlanAction: (actionId: string) => void;
  onOpenEntity: (entityType: LeakActionLink["entityType"]) => void;
  onRetryTimelineItem: (item: FeedbackTimelineItem) => void;
}

function getFilterClassName(isActive: boolean, activeColor: "indigo" | "amber") {
  if (activeColor === "indigo") {
    return `rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
      isActive
        ? "border-indigo-400/30 bg-indigo-500/10 text-indigo-200"
        : "border-white/10 bg-white/5 text-white/55 hover:bg-white/10"
    }`;
  }

  return `rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
    isActive
      ? "border-amber-400/30 bg-amber-500/10 text-amber-200"
      : "border-white/10 bg-white/5 text-white/55 hover:bg-white/10"
  }`;
}

export function LeakFeedbackHistoryPanel({
  leak,
  feedbackHistoryFilter,
  feedbackByAction,
  visibleFeedbackTimeline,
  retryingLeakId,
  onFeedbackHistoryFilterChange,
  onRetryLatestProblem,
  onFocusPlanAction,
  onOpenEntity,
  onRetryTimelineItem,
}: LeakFeedbackHistoryPanelProps) {
  const recent = feedbackByAction.slice(0, 6);
  const worked = recent.filter((item) => item.result === "worked").length;
  const partial = recent.filter((item) => item.result === "partially").length;
  const failed = recent.filter((item) => item.result === "not_worked").length;
  const latestProblem = recent.find((item) => item.result !== "worked") || null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs tracking-wide text-white/40 uppercase">История feedback</div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onFeedbackHistoryFilterChange("all")}
            className={getFilterClassName(feedbackHistoryFilter === "all", "indigo")}
          >
            Все
          </button>
          <button
            type="button"
            onClick={() => onFeedbackHistoryFilterChange("problem")}
            className={getFilterClassName(feedbackHistoryFilter === "problem", "amber")}
          >
            Проблемные
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge className="border-white/10 bg-white/10 text-white/70">
          Последние: {recent.length}
        </Badge>
        <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-200">
          Сработало: {worked}
        </Badge>
        <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-200">
          Частично: {partial}
        </Badge>
        <Badge className="border-rose-500/20 bg-rose-500/10 text-rose-200">
          Не помогло: {failed}
        </Badge>
        {latestProblem && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onRetryLatestProblem(latestProblem)}
            disabled={retryingLeakId === leak.id}
            className="border-amber-500/20 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15"
          >
            {retryingLeakId === leak.id ? "Обновляю..." : "Retry по последнему проблемному"}
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {visibleFeedbackTimeline.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-xs text-white/55">
            По текущему фильтру пока нет событий.
          </div>
        ) : (
          visibleFeedbackTimeline.slice(0, 6).map((item) => {
            const linkedEntity = item.linkedEntity;

            return (
              <div
                key={`${item.actionId || item.actionTitle}-${item.updatedAt}`}
                className="rounded-xl border border-white/10 bg-black/10 px-3 py-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {item.mode ? (
                    <Badge className={PLAN_MODE_STYLES[item.mode]}>
                      {PLAN_MODE_LABELS[item.mode]}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-white/10 text-white/55">
                      Режим не задан
                    </Badge>
                  )}
                  <Badge variant="outline" className="border-white/10 text-white/55">
                    {PLAN_KIND_LABELS[item.actionKind]}
                  </Badge>
                  <Badge className="border-white/10 bg-white/10 text-white/70">
                    Попытки: {item.attempts}
                  </Badge>
                  <Badge
                    className={
                      item.result === "worked"
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                        : item.result === "partially"
                          ? "border-amber-500/20 bg-amber-500/10 text-amber-200"
                          : "border-rose-500/20 bg-rose-500/10 text-rose-200"
                    }
                  >
                    {getFeedbackResultLabel(item.result)}
                  </Badge>
                  {item.feedbackSource === "policy" && (
                    <Badge className="border-indigo-500/20 bg-indigo-500/10 text-indigo-200">
                      Policy outcome
                    </Badge>
                  )}
                  {item.policyCorrelationId && (
                    <Badge className="border-white/10 bg-white/10 text-white/60">
                      Corr: {item.policyCorrelationId.slice(0, 18)}
                    </Badge>
                  )}
                  <div className="text-xs text-white/40">{formatDate(item.updatedAt)}</div>
                </div>

                <div className="mt-1 text-sm text-white">{item.actionTitle}</div>

                {linkedEntity && (
                  <div className="mt-1">
                    <Badge className="border-indigo-500/20 bg-indigo-500/10 text-left whitespace-normal text-indigo-200">
                      Сущность: {getActionLabel(linkedEntity.entityType)} • {linkedEntity.label}
                    </Badge>
                  </div>
                )}

                {item.comment && <div className="mt-1 text-xs text-white/60">{item.comment}</div>}

                <div className="mt-2 flex flex-wrap gap-2">
                  {item.actionId && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onFocusPlanAction(item.actionId || "")}
                      className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                    >
                      К шагу
                    </Button>
                  )}
                  {linkedEntity && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onOpenEntity(linkedEntity.entityType)}
                      className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                    >
                      Открыть сущность
                    </Button>
                  )}
                  {item.result !== "worked" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRetryTimelineItem(item)}
                      disabled={retryingLeakId === leak.id}
                      className="border-amber-500/20 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15"
                    >
                      {retryingLeakId === leak.id ? "Обновляю..." : "Retry этого шага"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
