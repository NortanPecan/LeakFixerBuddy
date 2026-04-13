import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PLAN_MODE_LABELS } from "@/features/leaks/lib/leak-constants";
import {
  formatDate,
  getPolicyActionLabel,
  getPolicyEventLabel,
  getPolicyNudgeLabel,
  getPolicyResultLabel,
  getPolicyStuckSignalLabel,
  getPolicyUrgencyLabel,
} from "@/features/leaks/lib/leak-formatters";
import type {
  LeakEntity,
  LeakPlanFeedback,
  LeakPolicyFunnel,
  LeakPolicyHint,
  LeakPolicyJournalEvent,
  LeakPolicyLearningSignals,
  LeakPolicyStuckOverview,
  LeakSolutionPlan,
  NextBestActionHint,
} from "@/features/leaks/types";

type PolicyDecisionState = "accepted" | "rejected" | "pending";

interface SendPlanActionFeedbackOptions {
  additionalActionIds?: string[];
  silent?: boolean;
}

interface LeakPolicyActionRequest {
  actionType: "switch_mode" | "retry" | "regenerate_context" | "focus_action";
  decision?: "rejected";
  reason?: string;
  correlationId?: string | null;
  targetMode?: LeakSolutionPlan["mode"];
  actionId?: string | null;
  actionTitle?: string | null;
  actionKind?: string | null;
  factors?: NextBestActionHint["factors"];
}

interface LeakPolicyPanelProps {
  leak: LeakEntity;
  policy: LeakPolicyHint | null;
  selectedPlan: LeakSolutionPlan | null;
  nextBestActionHint: NextBestActionHint | null;
  policyDecisionState: PolicyDecisionState;
  policyComputedMinutes: number | null;
  currentFunnel: LeakPolicyFunnel | null;
  currentFunnelStageLabel: string;
  nextPendingFunnelActionId: string | null;
  nextPendingFunnelActionTitle: string | null;
  recentFunnels: LeakPolicyFunnel[];
  priorityPendingQueue: LeakPolicyFunnel[];
  policyStuckOverview: LeakPolicyStuckOverview;
  policyAcceptedCount: number;
  policyRejectedCount: number;
  policyOutcomeCount: number;
  policyOutcomeWorked: number;
  policyOutcomePartial: number;
  policyOutcomeFailed: number;
  policyLinkedCreatedCount: number;
  policyAcceptRate: number | null;
  policyWorkedRate: number | null;
  learningSignals: LeakPolicyLearningSignals;
  policyRejectReasonCounts: Record<string, number>;
  policyEvents: LeakPolicyJournalEvent[];
  savingFeedbackActionId: string | null;
  isPolicyActionBusy: boolean;
  isSelectingMode: boolean;
  isGeneratingPlans: boolean;
  isRetrying: boolean;
  showPolicyInspector: boolean;
  showFunnels: boolean;
  showPriorityPendingQueue: boolean;
  onExecuteSuggestedAction: () => void | Promise<void>;
  onRejectSuggestedAction: (
    reason: "not_now" | "too_hard" | "not_relevant"
  ) => void | Promise<void>;
  onFocusPlanAction: (actionId: string) => void;
  onSendPlanActionFeedback: (
    actionId: string,
    result: LeakPlanFeedback["result"],
    comment: string,
    options?: SendPlanActionFeedbackOptions
  ) => void | Promise<void>;
  onGetFeedbackCommentDraft: (actionId: string) => string;
  onLoadPolicy: () => void | Promise<void>;
  onExecutePolicyAction: (request: LeakPolicyActionRequest) => void | Promise<void>;
  onRetryFailedOutcome: (event: LeakPolicyJournalEvent) => void | Promise<void>;
}

function getFunnelStageLabel(stage: LeakPolicyFunnel["stage"]): string {
  switch (stage) {
    case "suggested":
      return "совет";
    case "accepted":
      return "принят";
    case "awaiting_feedback":
      return "ждёт feedback";
    case "learning":
      return "learning";
    case "completed":
      return "завершён";
    case "rejected":
      return "отклонён";
    default:
      return "нет этапа";
  }
}

export function LeakPolicyPanel({
  leak: _leak,
  policy,
  selectedPlan,
  nextBestActionHint,
  policyDecisionState,
  policyComputedMinutes,
  currentFunnel,
  currentFunnelStageLabel,
  nextPendingFunnelActionId,
  nextPendingFunnelActionTitle,
  recentFunnels,
  priorityPendingQueue,
  policyStuckOverview,
  policyAcceptedCount,
  policyRejectedCount,
  policyOutcomeCount,
  policyOutcomeWorked,
  policyOutcomePartial,
  policyOutcomeFailed,
  policyLinkedCreatedCount,
  policyAcceptRate,
  policyWorkedRate,
  learningSignals,
  policyRejectReasonCounts,
  policyEvents,
  savingFeedbackActionId,
  isPolicyActionBusy,
  isSelectingMode,
  isGeneratingPlans,
  isRetrying,
  showPolicyInspector,
  showFunnels,
  showPriorityPendingQueue,
  onExecuteSuggestedAction,
  onRejectSuggestedAction,
  onFocusPlanAction,
  onSendPlanActionFeedback,
  onGetFeedbackCommentDraft,
  onLoadPolicy,
  onExecutePolicyAction,
  onRetryFailedOutcome,
}: LeakPolicyPanelProps) {
  if (!nextBestActionHint && !(showPolicyInspector && policy)) {
    return null;
  }

  return (
    <>
      {nextBestActionHint && (
        <div className="mt-3 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs tracking-wide text-indigo-200/80 uppercase">
              Next Best Action ({nextBestActionHint.confidence})
            </div>
            <Badge
              className={
                policyDecisionState === "accepted"
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                  : policyDecisionState === "rejected"
                    ? "border-amber-500/20 bg-amber-500/10 text-amber-200"
                    : "border-white/10 bg-white/10 text-white/70"
              }
            >
              {policyDecisionState === "accepted"
                ? "Статус: принят"
                : policyDecisionState === "rejected"
                  ? "Статус: отклонён"
                  : "Статус: без ответа"}
            </Badge>
          </div>
          <div className="mt-1 text-sm text-indigo-100">{nextBestActionHint.reason}</div>
          {nextBestActionHint.factors && nextBestActionHint.factors.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {nextBestActionHint.factors.slice(0, 3).map((factor) => (
                <Badge
                  key={`${factor.key}-${factor.weight}`}
                  className="border-white/15 bg-black/15 text-indigo-100/90"
                >
                  {factor.key}: {Math.round(factor.weight * 100)}%
                </Badge>
              ))}
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {nextBestActionHint.type === "switch_mode" && nextBestActionHint.targetMode && (
              <Button
                size="sm"
                variant="outline"
                onClick={onExecuteSuggestedAction}
                disabled={isSelectingMode || isPolicyActionBusy}
                className="border-indigo-400/25 bg-indigo-500/10 text-indigo-100 hover:bg-indigo-500/15"
              >
                {isSelectingMode || isPolicyActionBusy
                  ? "Переключаю..."
                  : `Переключить: ${PLAN_MODE_LABELS[nextBestActionHint.targetMode]}`}
              </Button>
            )}
            {nextBestActionHint.type === "create_entity" &&
              nextBestActionHint.actionId &&
              selectedPlan && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onExecuteSuggestedAction}
                  disabled={isPolicyActionBusy}
                  className="border-indigo-400/25 bg-indigo-500/10 text-indigo-100 hover:bg-indigo-500/15"
                >
                  {isPolicyActionBusy ? "Выполняю..." : "Создать рекомендуемый шаг"}
                </Button>
              )}
            {nextBestActionHint.type === "give_feedback" && nextBestActionHint.actionId && (
              <Button
                size="sm"
                variant="outline"
                onClick={onExecuteSuggestedAction}
                disabled={isPolicyActionBusy}
                className="border-indigo-400/25 bg-indigo-500/10 text-indigo-100 hover:bg-indigo-500/15"
              >
                {isPolicyActionBusy ? "Выполняю..." : "Перейти к feedback"}
              </Button>
            )}
            {nextBestActionHint.type === "retry" && nextBestActionHint.actionId && (
              <Button
                size="sm"
                variant="outline"
                onClick={onExecuteSuggestedAction}
                disabled={isRetrying || isPolicyActionBusy}
                className="border-indigo-400/25 bg-indigo-500/10 text-indigo-100 hover:bg-indigo-500/15"
              >
                {isRetrying || isPolicyActionBusy ? "Обновляю..." : "Retry по рекомендации"}
              </Button>
            )}
            {(nextBestActionHint.type === "generate" ||
              nextBestActionHint.type === "regenerate_context") && (
              <Button
                size="sm"
                variant="outline"
                onClick={onExecuteSuggestedAction}
                disabled={isGeneratingPlans || isPolicyActionBusy}
                className="border-indigo-400/25 bg-indigo-500/10 text-indigo-100 hover:bg-indigo-500/15"
              >
                {isGeneratingPlans || isPolicyActionBusy ? "Собираю..." : "Пересобрать планы"}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={onExecuteSuggestedAction}
              disabled={isPolicyActionBusy}
              className="border-emerald-500/20 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15"
            >
              {isPolicyActionBusy ? "Фиксирую..." : "Принять совет"}
            </Button>
            {(
              [
                { key: "not_now", label: "Не сейчас" },
                { key: "too_hard", label: "Сложно сейчас" },
                { key: "not_relevant", label: "Не по контексту" },
              ] as const
            ).map((reject) => (
              <Button
                key={`reject-${reject.key}`}
                size="sm"
                variant="outline"
                disabled={isPolicyActionBusy}
                onClick={() => onRejectSuggestedAction(reject.key)}
                className="border-white/15 bg-white/5 text-white hover:bg-white/10"
              >
                {isPolicyActionBusy ? "Фиксирую..." : reject.label}
              </Button>
            ))}
          </div>
        </div>
      )}
      {showPolicyInspector && policy && (
        <div className="mt-3 rounded-xl border border-white/10 bg-black/15 px-3 py-2">
          <div className="text-xs tracking-wide text-white/55 uppercase">Policy inspector</div>
          <div className="mt-1 text-xs text-white/70">
            v{policy.policyVersion || 1}
            {policy.computedAt ? ` • ${formatDate(policy.computedAt)}` : ""}
            {policyComputedMinutes !== null ? ` • ${policyComputedMinutes}м назад` : ""}
          </div>

          {showFunnels && currentFunnel && (
            <div className="mt-2 rounded-xl border border-white/10 bg-black/10 px-2 py-2">
              <div className="text-[11px] text-white/55">
                Current funnel: {currentFunnel.correlationId}
              </div>
              <div className="mt-1 flex flex-wrap gap-2">
                <Badge
                  className={
                    currentFunnel.suggestedAt
                      ? "border-indigo-500/20 bg-indigo-500/10 text-indigo-200"
                      : "border-white/10 bg-white/10 text-white/60"
                  }
                >
                  Suggested
                </Badge>
                <Badge
                  className={
                    currentFunnel.acceptedAt
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                      : "border-white/10 bg-white/10 text-white/60"
                  }
                >
                  Accepted
                </Badge>
                <Badge
                  className={
                    currentFunnel.rejectedAt
                      ? "border-amber-500/20 bg-amber-500/10 text-amber-200"
                      : "border-white/10 bg-white/10 text-white/60"
                  }
                >
                  Rejected
                </Badge>
                <Badge className="border-indigo-500/20 bg-indigo-500/10 text-indigo-200">
                  Entities: {currentFunnel.entityCreatedCount}
                </Badge>
                <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-200">
                  Outcomes: {currentFunnel.outcomeCount}
                </Badge>
                <Badge className="border-white/10 bg-white/10 text-white/70">
                  Этап: {currentFunnelStageLabel}
                </Badge>
                <Badge
                  className={
                    currentFunnel.urgency === "high"
                      ? "border-rose-500/20 bg-rose-500/10 text-rose-200"
                      : currentFunnel.urgency === "medium"
                        ? "border-amber-500/20 bg-amber-500/10 text-amber-200"
                        : "border-white/10 bg-white/10 text-white/65"
                  }
                >
                  Срочность: {getPolicyUrgencyLabel(currentFunnel.urgency)}
                </Badge>
                <Badge className="border-white/10 bg-white/10 text-white/65">
                  Stuck score: {currentFunnel.stuckScore}
                </Badge>
                <Badge className="border-white/10 bg-white/10 text-white/60">
                  Сигнал: {getPolicyStuckSignalLabel(currentFunnel.primaryStuckSignal)}
                </Badge>
                {currentFunnel.recommendedNudge !== "none" && (
                  <Badge className="border-rose-500/20 bg-rose-500/10 text-rose-200">
                    Nudge: {getPolicyNudgeLabel(currentFunnel.recommendedNudge)}
                  </Badge>
                )}
                {currentFunnel.pendingOutcomeActionIds.length > 0 && (
                  <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-200">
                    Pending outcome: {currentFunnel.pendingOutcomeActionIds.length}
                  </Badge>
                )}
                {nextPendingFunnelActionId && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onFocusPlanAction(nextPendingFunnelActionId)}
                    className="h-6 border-amber-500/20 bg-amber-500/10 px-2 text-[11px] text-amber-200 hover:bg-amber-500/15"
                  >
                    {nextPendingFunnelActionTitle
                      ? `К pending: ${nextPendingFunnelActionTitle}`
                      : "К pending шагу"}
                  </Button>
                )}
                {nextPendingFunnelActionId && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onSendPlanActionFeedback(
                        nextPendingFunnelActionId,
                        "partially",
                        onGetFeedbackCommentDraft(nextPendingFunnelActionId),
                        { silent: false }
                      )
                    }
                    disabled={savingFeedbackActionId === nextPendingFunnelActionId}
                    className="h-6 border-indigo-500/20 bg-indigo-500/10 px-2 text-[11px] text-indigo-200 hover:bg-indigo-500/15"
                  >
                    {savingFeedbackActionId === nextPendingFunnelActionId
                      ? "Сохраняю..."
                      : "Quick feedback"}
                  </Button>
                )}
              </div>
              <div className="mt-1 text-[11px] text-white/60">
                {currentFunnel.urgencyReason}. {currentFunnel.recommendedNudgeReason}.
              </div>
              <div className="mt-1 flex flex-wrap gap-2">
                {currentFunnel.suggestedAgeMinutes !== null && (
                  <Badge className="border-white/10 bg-white/10 text-white/60">
                    Suggested age: {currentFunnel.suggestedAgeMinutes}m
                  </Badge>
                )}
                {currentFunnel.acceptedAgeMinutes !== null && (
                  <Badge className="border-white/10 bg-white/10 text-white/60">
                    Accepted age: {currentFunnel.acceptedAgeMinutes}m
                  </Badge>
                )}
                {currentFunnel.maxPendingOutcomeAgeMinutes !== null && (
                  <Badge
                    className={
                      currentFunnel.maxPendingOutcomeAgeMinutes >= 180
                        ? "border-rose-500/20 bg-rose-500/10 text-rose-200"
                        : "border-white/10 bg-white/10 text-white/60"
                    }
                  >
                    Pending age: {currentFunnel.maxPendingOutcomeAgeMinutes}m
                  </Badge>
                )}
                {currentFunnel.oldestPendingOutcomeActionId && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onFocusPlanAction(currentFunnel.oldestPendingOutcomeActionId || "")
                    }
                    className="h-6 border-rose-500/20 bg-rose-500/10 px-2 text-[11px] text-rose-200 hover:bg-rose-500/15"
                  >
                    {currentFunnel.oldestPendingOutcomeActionTitle
                      ? `Самый старый: ${currentFunnel.oldestPendingOutcomeActionTitle}`
                      : "К самому старому pending"}
                  </Button>
                )}
              </div>

              {(currentFunnel.stuckSignals.noDecision ||
                currentFunnel.stuckSignals.noEntityAfterAccept ||
                currentFunnel.stuckSignals.pendingFeedback ||
                currentFunnel.stuckSignals.noOutcomeAfterCreate) && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {currentFunnel.stuckSignals.noDecision && (
                    <Badge className="border-rose-500/20 bg-rose-500/10 text-rose-200">
                      Нет решения по совету
                    </Badge>
                  )}
                  {currentFunnel.stuckSignals.noEntityAfterAccept && (
                    <Badge className="border-rose-500/20 bg-rose-500/10 text-rose-200">
                      После принятия не создано сущностей
                    </Badge>
                  )}
                  {currentFunnel.stuckSignals.pendingFeedback && (
                    <Badge className="border-rose-500/20 bg-rose-500/10 text-rose-200">
                      Feedback слишком долго не закрыт
                    </Badge>
                  )}
                  {currentFunnel.stuckSignals.noOutcomeAfterCreate && (
                    <Badge className="border-rose-500/20 bg-rose-500/10 text-rose-200">
                      Создано, но нет outcome
                    </Badge>
                  )}
                </div>
              )}

              {currentFunnel.recommendedNudge !== "none" && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {currentFunnel.recommendedNudge === "collect_feedback" &&
                    currentFunnel.nextPendingOutcomeActionId && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          onSendPlanActionFeedback(
                            currentFunnel.nextPendingOutcomeActionId || "",
                            "partially",
                            onGetFeedbackCommentDraft(
                              currentFunnel.nextPendingOutcomeActionId || ""
                            )
                          )
                        }
                        disabled={
                          savingFeedbackActionId === currentFunnel.nextPendingOutcomeActionId
                        }
                        className="border-amber-500/20 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15"
                      >
                        Быстрый outcome
                      </Button>
                    )}
                  {currentFunnel.recommendedNudge === "create_entity" &&
                    nextBestActionHint &&
                    nextBestActionHint.type === "create_entity" &&
                    selectedPlan &&
                    nextBestActionHint.actionId && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={onExecuteSuggestedAction}
                        disabled={isPolicyActionBusy}
                        className="border-indigo-500/20 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/15"
                      >
                        Создать следующий шаг
                      </Button>
                    )}
                  {currentFunnel.recommendedNudge === "accept_or_reject" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onLoadPolicy}
                      className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                    >
                      Освежить совет
                    </Button>
                  )}
                </div>
              )}

              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-indigo-400/80"
                  style={{
                    width: `${Math.min(
                      100,
                      (currentFunnel.suggestedAt ? 25 : 0) +
                        (currentFunnel.acceptedAt ? 25 : 0) +
                        (currentFunnel.entityCreatedCount > 0 ? 25 : 0) +
                        (currentFunnel.outcomeCount > 0 ? 25 : 0)
                    )}%`,
                  }}
                />
              </div>
              <div className="mt-2 grid gap-1 md:grid-cols-2">
                <div className="text-[11px] text-white/55">
                  Suggested:{" "}
                  {currentFunnel.suggestedAt ? formatDate(currentFunnel.suggestedAt) : "—"}
                </div>
                <div className="text-[11px] text-white/55">
                  Accepted: {currentFunnel.acceptedAt ? formatDate(currentFunnel.acceptedAt) : "—"}
                </div>
                <div className="text-[11px] text-white/55">
                  Rejected: {currentFunnel.rejectedAt ? formatDate(currentFunnel.rejectedAt) : "—"}
                </div>
                <div className="text-[11px] text-white/55">
                  Last outcome:{" "}
                  {currentFunnel.lastOutcomeAt ? formatDate(currentFunnel.lastOutcomeAt) : "—"}
                </div>
              </div>
            </div>
          )}

          {showFunnels && recentFunnels.length > 0 && (
            <div className="mt-2 space-y-1">
              <div className="text-[11px] text-white/55">Recent funnels</div>
              {recentFunnels.map((funnel) => {
                const targetPendingActionId =
                  funnel.oldestPendingOutcomeActionId || funnel.nextPendingOutcomeActionId || "";

                return (
                  <div
                    key={`recent-funnel-${funnel.correlationId}`}
                    className="rounded-lg border border-white/10 bg-black/10 px-2 py-1.5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="border-white/10 bg-white/10 text-white/65">
                        {funnel.correlationId}
                      </Badge>
                      <Badge className="border-white/10 bg-white/10 text-white/65">
                        Этап: {getFunnelStageLabel(funnel.stage)}
                      </Badge>
                      <Badge
                        className={
                          funnel.urgency === "high"
                            ? "border-rose-500/20 bg-rose-500/10 text-rose-200"
                            : funnel.urgency === "medium"
                              ? "border-amber-500/20 bg-amber-500/10 text-amber-200"
                              : "border-white/10 bg-white/10 text-white/60"
                        }
                      >
                        Срочность: {getPolicyUrgencyLabel(funnel.urgency)}
                      </Badge>
                      <Badge className="border-white/10 bg-white/10 text-white/60">
                        Stuck score: {funnel.stuckScore}
                      </Badge>
                      <Badge className="border-indigo-500/20 bg-indigo-500/10 text-indigo-200">
                        E:{funnel.entityCreatedCount}
                      </Badge>
                      <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-200">
                        O:{funnel.outcomeCount}
                      </Badge>
                      {funnel.pendingOutcomeActionIds.length > 0 && (
                        <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-200">
                          pending {funnel.pendingOutcomeActionIds.length}
                        </Badge>
                      )}
                      {funnel.maxPendingOutcomeAgeMinutes !== null && (
                        <Badge className="border-white/10 bg-white/10 text-white/60">
                          age {funnel.maxPendingOutcomeAgeMinutes}m
                        </Badge>
                      )}
                      {funnel.recommendedNudge !== "none" && (
                        <Badge className="border-rose-500/20 bg-rose-500/10 text-rose-200">
                          Nudge: {getPolicyNudgeLabel(funnel.recommendedNudge)}
                        </Badge>
                      )}
                      <Badge className="border-white/10 bg-white/10 text-white/60">
                        Сигнал: {getPolicyStuckSignalLabel(funnel.primaryStuckSignal)}
                      </Badge>
                      {targetPendingActionId && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onFocusPlanAction(targetPendingActionId)}
                          className="h-6 border-amber-500/20 bg-amber-500/10 px-2 text-[11px] text-amber-200 hover:bg-amber-500/15"
                        >
                          К pending
                        </Button>
                      )}
                      {funnel.recommendedNudge === "collect_feedback" && targetPendingActionId && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            onSendPlanActionFeedback(
                              targetPendingActionId,
                              "partially",
                              onGetFeedbackCommentDraft(targetPendingActionId)
                            )
                          }
                          disabled={savingFeedbackActionId === targetPendingActionId}
                          className="h-6 border-indigo-500/20 bg-indigo-500/10 px-2 text-[11px] text-indigo-200 hover:bg-indigo-500/15"
                        >
                          Quick outcome
                        </Button>
                      )}
                    </div>
                    <div className="mt-1 text-[11px] text-white/55">
                      {funnel.urgencyReason}. {funnel.recommendedNudgeReason}.
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {policyStuckOverview.totalFunnels > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge className="border-white/10 bg-white/10 text-white/70">
                Funnels: {policyStuckOverview.totalFunnels}
              </Badge>
              <Badge className="border-rose-500/20 bg-rose-500/10 text-rose-200">
                High: {policyStuckOverview.high}
              </Badge>
              <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-200">
                Medium: {policyStuckOverview.medium}
              </Badge>
              <Badge className="border-white/10 bg-white/10 text-white/65">
                Low: {policyStuckOverview.low}
              </Badge>
              <Badge className="border-white/10 bg-white/10 text-white/65">
                Blocked: {policyStuckOverview.blockedFunnels}
              </Badge>
              <Badge className="border-white/10 bg-white/10 text-white/65">
                Max score: {policyStuckOverview.maxStuckScore}
              </Badge>
            </div>
          )}

          {showPriorityPendingQueue && priorityPendingQueue.length > 0 && (
            <div className="mt-2 space-y-1 rounded-xl border border-white/10 bg-black/10 px-2 py-2">
              <div className="text-[11px] text-white/55">Priority pending queue</div>
              {priorityPendingQueue.slice(0, 3).map((item) => {
                const targetActionId =
                  item.oldestPendingOutcomeActionId || item.nextPendingOutcomeActionId || "";

                return (
                  <div
                    key={`priority-${item.correlationId}`}
                    className="rounded-lg border border-white/10 bg-black/10 px-2 py-1.5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="border-white/10 bg-white/10 text-white/65">
                        {item.correlationId}
                      </Badge>
                      <Badge
                        className={
                          item.urgency === "high"
                            ? "border-rose-500/20 bg-rose-500/10 text-rose-200"
                            : item.urgency === "medium"
                              ? "border-amber-500/20 bg-amber-500/10 text-amber-200"
                              : "border-white/10 bg-white/10 text-white/60"
                        }
                      >
                        {getPolicyUrgencyLabel(item.urgency)} • {item.stuckScore}
                      </Badge>
                      {item.maxPendingOutcomeAgeMinutes !== null && (
                        <Badge className="border-white/10 bg-white/10 text-white/60">
                          {item.maxPendingOutcomeAgeMinutes}m
                        </Badge>
                      )}
                      <Badge className="border-white/10 bg-white/10 text-white/60">
                        {getPolicyStuckSignalLabel(item.primaryStuckSignal)}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onFocusPlanAction(targetActionId)}
                        className="h-6 border-amber-500/20 bg-amber-500/10 px-2 text-[11px] text-amber-200 hover:bg-amber-500/15"
                      >
                        Фокус
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          onSendPlanActionFeedback(
                            targetActionId,
                            "partially",
                            onGetFeedbackCommentDraft(targetActionId)
                          )
                        }
                        disabled={savingFeedbackActionId === targetActionId}
                        className="h-6 border-indigo-500/20 bg-indigo-500/10 px-2 text-[11px] text-indigo-200 hover:bg-indigo-500/15"
                      >
                        Outcome
                      </Button>
                    </div>
                    <div className="mt-1 text-[11px] text-white/55">
                      {item.urgencyReason}. {item.recommendedNudgeReason}.
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-2 flex flex-wrap gap-2">
            <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-200">
              Принято: {policyAcceptedCount}
            </Badge>
            <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-200">
              Отклонено: {policyRejectedCount}
            </Badge>
            <Badge className="border-indigo-500/20 bg-indigo-500/10 text-indigo-200">
              Outcome: {policyOutcomeCount}
            </Badge>
            <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-200">
              Worked: {policyOutcomeWorked}
            </Badge>
            <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-200">
              Partial: {policyOutcomePartial}
            </Badge>
            <Badge className="border-rose-500/20 bg-rose-500/10 text-rose-200">
              Failed: {policyOutcomeFailed}
            </Badge>
            <Badge className="border-indigo-500/20 bg-indigo-500/10 text-indigo-200">
              Created by policy: {policyLinkedCreatedCount}
            </Badge>
            {policyAcceptRate !== null && (
              <Badge className="border-white/10 bg-white/10 text-white/75">
                Accept rate: {policyAcceptRate}%
              </Badge>
            )}
            {policyWorkedRate !== null && (
              <Badge className="border-white/10 bg-white/10 text-white/75">
                Worked rate: {policyWorkedRate}%
              </Badge>
            )}
          </div>

          {learningSignals.recentFeedbackCount > 0 && (
            <div className="mt-2 space-y-2 rounded-xl border border-white/10 bg-black/10 px-2 py-2">
              <div className="flex flex-wrap gap-2">
                <Badge
                  className={
                    learningSignals.loopHealth >= 70
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                      : learningSignals.loopHealth >= 45
                        ? "border-amber-500/20 bg-amber-500/10 text-amber-200"
                        : "border-rose-500/20 bg-rose-500/10 text-rose-200"
                  }
                >
                  Loop health: {learningSignals.loopHealth}
                </Badge>
                <Badge className="border-white/10 bg-white/10 text-white/70">
                  Recent feedback: {learningSignals.recentFeedbackCount}
                </Badge>
                <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-200">
                  Worked {learningSignals.recentWorkedCount}
                </Badge>
                <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-200">
                  Partial {learningSignals.recentPartialCount}
                </Badge>
                <Badge className="border-rose-500/20 bg-rose-500/10 text-rose-200">
                  Failed {learningSignals.recentFailedCount}
                </Badge>
              </div>

              {learningSignals.topFailureReasons.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {learningSignals.topFailureReasons.map((item) => (
                    <Badge
                      key={`failure-reason-${item.text}`}
                      className="border-amber-500/20 bg-amber-500/10 text-amber-200"
                    >
                      {item.text} ({item.count})
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Badge className="border-white/10 bg-white/10 text-white/70">
                  Bucket: time {learningSignals.failureBuckets.time}
                </Badge>
                <Badge className="border-white/10 bg-white/10 text-white/70">
                  energy {learningSignals.failureBuckets.energy}
                </Badge>
                <Badge className="border-white/10 bg-white/10 text-white/70">
                  context {learningSignals.failureBuckets.context}
                </Badge>
                <Badge className="border-white/10 bg-white/10 text-white/70">
                  complexity {learningSignals.failureBuckets.complexity}
                </Badge>
                <Badge className="border-white/10 bg-white/10 text-white/70">
                  unknown {learningSignals.failureBuckets.unknown}
                </Badge>
                <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-200">
                  Dominant: {learningSignals.dominantFailureBucket}
                </Badge>
              </div>

              {learningSignals.repeatedActions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {learningSignals.repeatedActions.slice(0, 3).map((item) => (
                    <Badge
                      key={`repeat-action-${item.actionId}`}
                      className="border-white/10 bg-white/10 text-white/70"
                    >
                      Retry: {item.actionTitle} ({item.attempt})
                    </Badge>
                  ))}
                </div>
              )}

              {learningSignals.unstableActions.length > 0 && (
                <div className="space-y-1">
                  {learningSignals.unstableActions.slice(0, 3).map((item) => (
                    <div
                      key={`unstable-action-${item.actionId}`}
                      className="rounded-lg border border-white/10 bg-black/10 px-2 py-1.5"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="border-white/10 bg-white/10 text-white/70">
                          {item.actionTitle}
                        </Badge>
                        <Badge className="border-rose-500/20 bg-rose-500/10 text-rose-200">
                          Fail {item.failures}
                        </Badge>
                        <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-200">
                          Partial {item.partials}
                        </Badge>
                        <Badge className="border-white/10 bg-white/10 text-white/70">
                          Attempts {item.attempts}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onFocusPlanAction(item.actionId)}
                          className="h-6 border-white/15 bg-white/5 px-2 text-[11px] text-white hover:bg-white/10"
                        >
                          К шагу
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {learningSignals.loopHealth < 45 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onExecutePolicyAction({
                        actionType: "regenerate_context",
                        reason: "low_loop_health",
                      })
                    }
                    disabled={isPolicyActionBusy}
                    className="border-rose-500/20 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15"
                  >
                    Обновить контекст
                  </Button>
                )}
                {learningSignals.dominantFailureBucket === "complexity" &&
                  selectedPlan &&
                  selectedPlan.mode !== "minimum" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        onExecutePolicyAction({
                          actionType: "switch_mode",
                          targetMode: "minimum",
                          reason: "dominant_complexity_failure",
                        })
                      }
                      disabled={isPolicyActionBusy}
                      className="border-amber-500/20 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15"
                    >
                      Упростить режим
                    </Button>
                  )}
                {learningSignals.dominantFailureBucket === "context" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onExecutePolicyAction({
                        actionType: "regenerate_context",
                        reason: "dominant_context_failure",
                      })
                    }
                    disabled={isPolicyActionBusy}
                    className="border-indigo-500/20 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/15"
                  >
                    Пересобрать с новым контекстом
                  </Button>
                )}
                {learningSignals.repeatedActions.length > 0 &&
                  selectedPlan &&
                  selectedPlan.mode !== "minimum" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        onExecutePolicyAction({
                          actionType: "switch_mode",
                          targetMode: "minimum",
                          reason: "repeat_action_pressure",
                        })
                      }
                      disabled={isPolicyActionBusy}
                      className="border-amber-500/20 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15"
                    >
                      Переключить на minimum
                    </Button>
                  )}
              </div>
            </div>
          )}

          {Object.keys(policyRejectReasonCounts).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(policyRejectReasonCounts).map(([reason, count]) => (
                <Badge
                  key={`reject-reason-${reason}`}
                  className="border-white/10 bg-white/10 text-white/70"
                >
                  reject:{" "}
                  {reason === "not_now"
                    ? "не сейчас"
                    : reason === "too_hard"
                      ? "сложно сейчас"
                      : reason === "not_relevant"
                        ? "не по контексту"
                        : reason}{" "}
                  ({count})
                </Badge>
              ))}
            </div>
          )}

          {policyEvents.length > 0 && (
            <div className="mt-2 space-y-1">
              {policyEvents.slice(0, 4).map((event) => (
                <div
                  key={`${event.type}-${event.at}-${event.policyCorrelationId || ""}`}
                  className="flex flex-wrap items-center gap-2 text-xs text-white/65"
                >
                  <span>
                    {getPolicyEventLabel(event.type)} • {formatDate(event.at)}
                    {event.policyActionType
                      ? ` • ${getPolicyActionLabel(event.policyActionType)}`
                      : ""}
                    {event.result ? ` • ${getPolicyResultLabel(event.result)}` : ""}
                    {event.attempt ? ` • attempt ${event.attempt}` : ""}
                    {event.actor ? ` • ${event.actor}` : ""}
                    {event.note ? ` • ${event.note}` : ""}
                    {event.actionTitle ? ` • ${event.actionTitle}` : ""}
                    {event.factors && event.factors.length > 0
                      ? ` • factors: ${event.factors
                          .slice(0, 2)
                          .map((item) => item.key)
                          .join(", ")}`
                      : ""}
                  </span>
                  {event.actionId && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onFocusPlanAction(event.actionId || "")}
                      className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                    >
                      К шагу
                    </Button>
                  )}
                  {event.type === "policy_outcome" &&
                    event.result === "not_worked" &&
                    event.actionId && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRetryFailedOutcome(event)}
                        disabled={isPolicyActionBusy || isRetrying}
                        className="border-amber-500/20 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15"
                      >
                        Retry
                      </Button>
                    )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
