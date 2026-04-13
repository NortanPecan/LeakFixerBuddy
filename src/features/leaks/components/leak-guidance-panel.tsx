import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LEAK_GUIDANCE_STYLES,
  PLAN_KIND_LABELS,
  PLAN_MODE_LABELS,
  PLAN_MODE_STYLES,
} from "@/features/leaks/lib/leak-constants";
import { formatDate } from "@/features/leaks/lib/leak-formatters";
import type {
  AdaptiveModeHint,
  ContextDriftHint,
  ExecutionScoreHint,
  LeakActionLink,
  LeakGuidance,
  LeakPlanAction,
  LeakPlanMode,
  LeakPolicyJournalEvent,
  LeakRetryFocus,
  LeakSolutionPlan,
} from "@/features/leaks/types";

interface LatestWorkedOutcomeLike {
  actionTitle: string;
  actionKind: LeakPlanAction["kind"];
  mode: LeakPlanMode;
  updatedAt: string;
  linkedEntity: LeakActionLink | null;
}

interface RecentFeedbackTrendLike {
  windowSize: number;
  negativeShare: number;
  workedShare: number | null;
  isRisky: boolean;
  isStable: boolean;
}

interface LeakGuidancePanelProps {
  guidance: LeakGuidance;
  retryFocus: LeakRetryFocus | null;
  latestWorkedOutcome: LatestWorkedOutcomeLike | null;
  selectedPlan: LeakSolutionPlan | null;
  executionScore: ExecutionScoreHint;
  recentFeedbackTrend: RecentFeedbackTrendLike | null;
  selectedModeForChain: LeakPlanMode | null;
  createdEntityCountForChain: number;
  feedbackCountForChain: number;
  workedCountForChain: number;
  policyLinkedCreatedCount: number;
  policyLinkedCreatedWithoutFeedback: number;
  firstPolicyLinkedWithoutFeedbackActionId: string | null;
  latestPolicyFailedOutcome: LeakPolicyJournalEvent | null;
  contextDriftHint: ContextDriftHint | null;
  adaptiveModeSuggestion: AdaptiveModeHint | null;
  bottleneckPlanAction: LeakPlanAction | null;
  bottleneckLinkedEntity: LeakActionLink | null;
  policyPanel: ReactNode;
  isUpdating: boolean;
  isRetrying: boolean;
  isGeneratingPlans: boolean;
  isSelectingMode: boolean;
  isPolicyActionBusy: boolean;
  applyingPlanActionId: string | null;
  applyingPlanLeakId: string | null;
  onOpenActionEntity: (entityType: LeakActionLink["entityType"]) => void;
  onFocusLatestWorkedAction: (actionTitle: string) => void;
  onRunGuidanceAction: (action: NonNullable<LeakGuidance["action"]>) => void | Promise<void>;
  onFocusAction: (actionId: string) => void;
  onCreateBottleneckAction: (action: LeakPlanAction) => void | Promise<void>;
  onExecuteAdaptiveMode: (targetMode: LeakPlanMode) => void | Promise<void>;
  onRetryLatestPolicyFailure: () => void | Promise<void>;
}

export function LeakGuidancePanel({
  guidance,
  retryFocus,
  latestWorkedOutcome,
  selectedPlan,
  executionScore,
  recentFeedbackTrend,
  selectedModeForChain,
  createdEntityCountForChain,
  feedbackCountForChain,
  workedCountForChain,
  policyLinkedCreatedCount,
  policyLinkedCreatedWithoutFeedback,
  firstPolicyLinkedWithoutFeedbackActionId,
  latestPolicyFailedOutcome,
  contextDriftHint,
  adaptiveModeSuggestion,
  bottleneckPlanAction,
  bottleneckLinkedEntity,
  policyPanel,
  isUpdating,
  isRetrying,
  isGeneratingPlans,
  isSelectingMode,
  isPolicyActionBusy,
  applyingPlanActionId,
  applyingPlanLeakId,
  onOpenActionEntity,
  onFocusLatestWorkedAction,
  onRunGuidanceAction,
  onFocusAction,
  onCreateBottleneckAction,
  onExecuteAdaptiveMode,
  onRetryLatestPolicyFailure,
}: LeakGuidancePanelProps) {
  return (
    <div className={`rounded-2xl border p-3 ${LEAK_GUIDANCE_STYLES[guidance.tone]}`}>
      <div className="text-xs tracking-wide text-white/45 uppercase">Следующий шаг</div>
      <div className="mt-1 text-sm font-medium text-white">{guidance.title}</div>
      <p className="mt-1 text-sm text-white/70">{guidance.description}</p>

      {guidance.bottleneckText && (
        <div className="mt-2 rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-xs text-white/75">
          Узкое место: {guidance.bottleneckText}
        </div>
      )}

      {retryFocus?.actionTitle && (
        <div className="mt-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2">
          <div className="text-xs text-amber-200">
            Retry-фокус: {retryFocus.actionTitle}
            {retryFocus.actionKind
              ? ` (${PLAN_KIND_LABELS[retryFocus.actionKind as LeakPlanAction["kind"]] || retryFocus.actionKind})`
              : ""}
          </div>
          {retryFocus.failureReason && (
            <div className="mt-1 text-xs text-amber-100/80">
              Причина прошлого сбоя: {retryFocus.failureReason}
            </div>
          )}
        </div>
      )}

      {latestWorkedOutcome && (
        <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
          <div className="text-xs text-emerald-200">
            Последний сработавший шаг: {latestWorkedOutcome.actionTitle}
          </div>
          <div className="mt-1 text-[11px] text-emerald-100/80">
            Режим {PLAN_MODE_LABELS[latestWorkedOutcome.mode]} •{" "}
            {formatDate(latestWorkedOutcome.updatedAt)}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {latestWorkedOutcome.linkedEntity ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  latestWorkedOutcome.linkedEntity &&
                  onOpenActionEntity(latestWorkedOutcome.linkedEntity.entityType)
                }
                className="border-emerald-500/20 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15"
              >
                Открыть последний сработавший
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onFocusLatestWorkedAction(latestWorkedOutcome.actionTitle)}
                className="border-emerald-500/20 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15"
              >
                Перейти к шагу
              </Button>
            )}
          </div>
        </div>
      )}

      {guidance.selectedPlan && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge className={PLAN_MODE_STYLES[guidance.selectedPlan.mode]}>
            {PLAN_MODE_LABELS[guidance.selectedPlan.mode]}
          </Badge>
          <Badge
            className={
              executionScore.value >= 70
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                : executionScore.value >= 40
                  ? "border-amber-500/20 bg-amber-500/10 text-amber-200"
                  : "border-rose-500/20 bg-rose-500/10 text-rose-200"
            }
          >
            Execution score: {executionScore.value}
          </Badge>
          <Badge className="border-white/10 bg-white/10 text-white/75">
            Создано {guidance.createdActions}/{guidance.totalActions}
          </Badge>
          {guidance.workedActions > 0 && (
            <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-200">
              Сработало {guidance.workedActions}
            </Badge>
          )}
          {guidance.partialActions > 0 && (
            <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-200">
              Частично {guidance.partialActions}
            </Badge>
          )}
          {guidance.failedActions > 0 && (
            <Badge className="border-rose-500/20 bg-rose-500/10 text-rose-200">
              Не помогло {guidance.failedActions}
            </Badge>
          )}
        </div>
      )}

      {guidance.selectedPlan && (
        <div className="mt-2 text-[11px] text-white/55">
          Score breakdown: создание {executionScore.breakdown.createdCoverage}% • feedback{" "}
          {executionScore.breakdown.feedbackCoverage}% • worked{" "}
          {executionScore.breakdown.workedShare}% • штраф попыток -
          {executionScore.breakdown.attemptsPenalty} • штраф drift -
          {executionScore.breakdown.driftPenalty}
        </div>
      )}

      {guidance.totalActions > 0 && (
        <div className="mt-3 space-y-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-indigo-400/80"
              style={{
                width: `${Math.round((guidance.createdActions / guidance.totalActions) * 100)}%`,
              }}
            />
          </div>
          <div className="text-xs text-white/50">
            Применение: {Math.round((guidance.createdActions / guidance.totalActions) * 100)}%
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-emerald-400/80"
              style={{
                width: `${Math.round((guidance.feedbackActions / guidance.totalActions) * 100)}%`,
              }}
            />
          </div>
          <div className="text-xs text-white/50">
            Feedback покрытие:{" "}
            {Math.round((guidance.feedbackActions / guidance.totalActions) * 100)}%
          </div>
          {guidance.feedbackActions > 0 && (
            <>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-emerald-400/80"
                  style={{
                    width: `${Math.round((guidance.workedActions / guidance.feedbackActions) * 100)}%`,
                  }}
                />
              </div>
              <div className="text-xs text-white/50">
                Эффективность feedback:{" "}
                {Math.round((guidance.workedActions / guidance.feedbackActions) * 100)}%
              </div>
            </>
          )}
        </div>
      )}

      {recentFeedbackTrend && (
        <div
          className={`mt-3 rounded-xl border px-3 py-2 text-xs ${
            recentFeedbackTrend.isRisky
              ? "border-amber-500/25 bg-amber-500/10 text-amber-100"
              : "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"
          }`}
        >
          Свежий тренд feedback: {recentFeedbackTrend.windowSize} событий, негативных{" "}
          {recentFeedbackTrend.negativeShare}%.
          {recentFeedbackTrend.isRisky
            ? " Режим можно упростить до minimum."
            : recentFeedbackTrend.isStable
              ? " Динамика стабильная: можно аккуратно усиливать режим."
              : " Динамика пока смешанная."}
        </div>
      )}

      <div className="mt-3 space-y-2 rounded-xl border border-white/10 bg-black/15 px-3 py-2">
        <div className="text-xs text-white/75">
          Цепочка выполнения: leak {" → "}
          {selectedModeForChain
            ? `режим ${PLAN_MODE_LABELS[selectedModeForChain]}`
            : "режим не выбран"}
          {" → "}создано сущностей {createdEntityCountForChain}
          {" → "}feedback {feedbackCountForChain}
          {" → "}worked {workedCountForChain}
        </div>
        <div className="grid gap-2 md:grid-cols-4">
          <div className="rounded-lg border border-white/10 bg-black/10 px-2 py-1.5">
            <div className="text-[11px] text-white/50">Leak</div>
            <div className="text-xs text-white/75">captured</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/10 px-2 py-1.5">
            <div className="text-[11px] text-white/50">Mode</div>
            <div className="text-xs text-white/75">
              {selectedModeForChain ? PLAN_MODE_LABELS[selectedModeForChain] : "не выбран"}
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/10 px-2 py-1.5">
            <div className="text-[11px] text-white/50">Entities</div>
            <div className="text-xs text-white/75">
              {createdEntityCountForChain} всего, policy-linked {policyLinkedCreatedCount}
            </div>
            {policyLinkedCreatedWithoutFeedback > 0 && (
              <div className="mt-1 text-[11px] text-amber-200">
                Без feedback: {policyLinkedCreatedWithoutFeedback}
              </div>
            )}
            {firstPolicyLinkedWithoutFeedbackActionId && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onFocusAction(firstPolicyLinkedWithoutFeedbackActionId)}
                className="mt-1 h-6 border-amber-500/20 bg-amber-500/10 px-2 text-[11px] text-amber-200 hover:bg-amber-500/15"
              >
                К первому без feedback
              </Button>
            )}
          </div>
          <div className="rounded-lg border border-white/10 bg-black/10 px-2 py-1.5">
            <div className="text-[11px] text-white/50">Feedback</div>
            <div className="text-xs text-white/75">
              {feedbackCountForChain} событий • worked {workedCountForChain}
            </div>
          </div>
        </div>
        {latestPolicyFailedOutcome && (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRetryLatestPolicyFailure()}
              disabled={isPolicyActionBusy || isRetrying}
              className="border-amber-500/20 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15"
            >
              {isPolicyActionBusy || isRetrying ? "Обновляю..." : "Retry from policy failure"}
            </Button>
            <div className="self-center text-[11px] text-white/55">
              Последний провал: {latestPolicyFailedOutcome.actionTitle || "шаг не указан"} {" • "}
              {formatDate(latestPolicyFailedOutcome.at)}
            </div>
          </div>
        )}
      </div>

      {contextDriftHint && (
        <div
          className={`mt-3 rounded-xl border px-3 py-2 text-xs ${
            contextDriftHint.isStale
              ? "border-rose-500/25 bg-rose-500/10 text-rose-100"
              : "border-white/10 bg-black/10 text-white/70"
          }`}
        >
          Drift контекста: {contextDriftHint.score}%.
          {contextDriftHint.generatedAt
            ? ` База: ${formatDate(contextDriftHint.generatedAt)}.`
            : " База генерации ещё не зафиксирована."}
          {contextDriftHint.changedMetrics.length > 0 && (
            <div className="mt-1 text-[11px] text-white/60">
              Изменилось:{" "}
              {contextDriftHint.changedMetrics
                .map((item) => `${item.key} (${item.deltaPct > 0 ? "+" : ""}${item.deltaPct}%)`)
                .join(", ")}
            </div>
          )}
          {contextDriftHint.changedMetrics.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {contextDriftHint.changedMetrics.slice(0, 4).map((item) => (
                <Badge
                  key={`${item.key}-${item.deltaPct}`}
                  className="border-white/10 bg-white/10 text-white/70"
                >
                  {item.key}: {item.before} → {item.now} ({item.deltaPct > 0 ? "+" : ""}
                  {item.deltaPct}%)
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {policyPanel}

      {guidance.action && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => guidance.action && onRunGuidanceAction(guidance.action)}
            disabled={isRetrying || isUpdating || isGeneratingPlans}
            className="border-white/15 bg-white/5 text-white hover:bg-white/10"
          >
            {isRetrying && guidance.action === "retry" ? "Обновляю..." : guidance.actionLabel}
          </Button>
        </div>
      )}

      {adaptiveModeSuggestion &&
        selectedPlan &&
        adaptiveModeSuggestion.targetMode !== selectedPlan.mode && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onExecuteAdaptiveMode(adaptiveModeSuggestion.targetMode)}
              disabled={isSelectingMode || isPolicyActionBusy}
              className="border-indigo-400/25 bg-indigo-500/10 text-indigo-100 hover:bg-indigo-500/15"
            >
              {isSelectingMode || isPolicyActionBusy
                ? "Переключаю..."
                : `Adaptive: ${PLAN_MODE_LABELS[adaptiveModeSuggestion.targetMode]}`}
            </Button>
            <div className="self-center text-xs text-white/60">{adaptiveModeSuggestion.reason}</div>
          </div>
        )}

      {guidance.bottleneckActionId && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onFocusAction(guidance.bottleneckActionId || "")}
            className="border-white/15 bg-white/5 text-white hover:bg-white/10"
          >
            Перейти к узкому шагу
          </Button>
          {selectedPlan && bottleneckPlanAction && !bottleneckLinkedEntity && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onCreateBottleneckAction(bottleneckPlanAction)}
              disabled={
                applyingPlanActionId === bottleneckPlanAction.id ||
                applyingPlanLeakId === selectedPlan.leakId
              }
              className="border-indigo-500/20 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/15"
            >
              {applyingPlanActionId === bottleneckPlanAction.id ? "Создаю..." : "Создать узкий шаг"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
