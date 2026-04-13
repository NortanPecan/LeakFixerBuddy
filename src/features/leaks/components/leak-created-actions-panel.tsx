import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PLAN_CONFIDENCE_STYLES, PLAN_MODE_LABELS } from "@/features/leaks/lib/leak-constants";
import {
  formatDate,
  getActionLabel,
  getConfidenceLabelText,
  getFeedbackResultLabel,
} from "@/features/leaks/lib/leak-formatters";
import { getLeakActionMetadata } from "@/features/leaks/lib/leak-selectors";
import type {
  LeakActionLink,
  LeakEntity,
  LeakPlanAction,
  LeakPlanFeedback,
  LeakSolutionPlan,
} from "@/features/leaks/types";

interface LeakCreatedActionsPanelProps {
  leak: LeakEntity;
  feedbackByActionId: Map<string, LeakPlanFeedback>;
  planActionsById: Map<string, LeakPlanAction>;
  savingFeedbackActionId: string | null;
  retryingLeakId: string | null;
  getFeedbackCommentDraftByActionId: (actionId: string) => string;
  onOpenEntity: (entityType: LeakActionLink["entityType"]) => void;
  onFocusPlanAction: (actionId: string) => void;
  onSendPlanActionFeedback: (
    actionId: string,
    result: LeakPlanFeedback["result"],
    comment: string
  ) => void;
  onRetryFromCreatedAction: (action: LeakPlanAction | null, failureReason: string | null) => void;
}

export function LeakCreatedActionsPanel({
  leak,
  feedbackByActionId,
  planActionsById,
  savingFeedbackActionId,
  retryingLeakId,
  getFeedbackCommentDraftByActionId,
  onOpenEntity,
  onFocusPlanAction,
  onSendPlanActionFeedback,
  onRetryFromCreatedAction,
}: LeakCreatedActionsPanelProps) {
  return (
    <div className="space-y-2">
      <div className="text-xs tracking-wide text-white/40 uppercase">Что уже создано из лика</div>
      {leak.actions.length === 0 ? (
        <p className="text-sm text-white/55">
          Пока ничего. Можно превратить лик в задачу, ритуал или AI-челлендж.
        </p>
      ) : (
        <div className="space-y-2">
          {leak.actions.map((action) => {
            const metadata = getLeakActionMetadata(action);
            const sourceActionId =
              typeof metadata?.sourceActionId === "string" ? metadata.sourceActionId : null;
            const sourceActionTitle =
              typeof metadata?.sourceActionTitle === "string" ? metadata.sourceActionTitle : null;
            const sourcePlanMode =
              typeof metadata?.sourcePlanMode === "string" ? metadata.sourcePlanMode : null;
            const sourcePlanConfidenceLabel =
              typeof metadata?.sourcePlanConfidenceLabel === "string"
                ? metadata.sourcePlanConfidenceLabel
                : null;
            const sourcePlanConfidenceReason =
              typeof metadata?.sourcePlanConfidenceReason === "string"
                ? metadata.sourcePlanConfidenceReason
                : null;
            const sourcePlanSummary =
              typeof metadata?.sourcePlanSummary === "string" ? metadata.sourcePlanSummary : null;
            const sourcePolicyCorrelationId =
              typeof metadata?.policyCorrelationId === "string"
                ? metadata.policyCorrelationId
                : null;
            const feedback = sourceActionId ? feedbackByActionId.get(sourceActionId) : null;
            const sourcePlanAction = sourceActionId
              ? planActionsById.get(sourceActionId) || null
              : null;

            return (
              <div
                key={action.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
              >
                <div className="space-y-1">
                  <div className="text-sm text-white">
                    {getActionLabel(action.entityType)}: {action.label}
                  </div>
                  <div className="text-xs text-white/40">
                    Создано: {formatDate(action.createdAt)}
                  </div>
                  {(sourceActionTitle || sourcePlanMode || feedback) && (
                    <div className="flex flex-wrap gap-2">
                      {sourcePlanMode && (
                        <Badge className="border-white/10 bg-white/10 text-white/65">
                          Режим:{" "}
                          {sourcePlanMode in PLAN_MODE_LABELS
                            ? PLAN_MODE_LABELS[sourcePlanMode as LeakSolutionPlan["mode"]]
                            : sourcePlanMode}
                        </Badge>
                      )}
                      {sourcePlanConfidenceLabel &&
                        (sourcePlanConfidenceLabel === "low" ||
                          sourcePlanConfidenceLabel === "medium" ||
                          sourcePlanConfidenceLabel === "high") && (
                          <Badge className={PLAN_CONFIDENCE_STYLES[sourcePlanConfidenceLabel]}>
                            Уверенность: {getConfidenceLabelText(sourcePlanConfidenceLabel)}
                          </Badge>
                        )}
                      {sourceActionTitle && (
                        <Badge className="border-white/10 bg-white/10 text-white/65">
                          Действие: {sourceActionTitle}
                        </Badge>
                      )}
                      {sourcePolicyCorrelationId && (
                        <Badge className="border-indigo-500/20 bg-indigo-500/10 text-indigo-200">
                          Policy-linked
                        </Badge>
                      )}
                      {sourcePolicyCorrelationId && !feedback && (
                        <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-200">
                          Без feedback
                        </Badge>
                      )}
                      {feedback && (
                        <Badge
                          className={
                            feedback.result === "worked"
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                              : feedback.result === "partially"
                                ? "border-amber-500/20 bg-amber-500/10 text-amber-200"
                                : "border-rose-500/20 bg-rose-500/10 text-rose-200"
                          }
                        >
                          Feedback: {getFeedbackResultLabel(feedback.result)}
                        </Badge>
                      )}
                    </div>
                  )}
                  {feedback?.comment && (
                    <div className="text-xs text-white/55">{feedback.comment}</div>
                  )}
                  {sourcePlanConfidenceReason && (
                    <div className="text-xs text-white/55">{sourcePlanConfidenceReason}</div>
                  )}
                  {sourcePlanSummary && (
                    <div className="text-xs text-white/55">План: {sourcePlanSummary}</div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onOpenEntity(action.entityType)}
                    className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                  >
                    Открыть
                  </Button>
                  {sourceActionId && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onFocusPlanAction(sourceActionId)}
                      className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                    >
                      К шагу
                    </Button>
                  )}
                  {sourceActionId &&
                    !feedback &&
                    (["worked", "partially", "not_worked"] as const).map((result) => (
                      <Button
                        key={`${action.id}-${result}`}
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          onSendPlanActionFeedback(
                            sourceActionId,
                            result,
                            getFeedbackCommentDraftByActionId(sourceActionId)
                          )
                        }
                        disabled={savingFeedbackActionId === sourceActionId}
                        className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                      >
                        {result === "worked"
                          ? "Сработало"
                          : result === "partially"
                            ? "Частично"
                            : "Не помогло"}
                      </Button>
                    ))}
                  {feedback && feedback.result !== "worked" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        onRetryFromCreatedAction(sourcePlanAction, feedback.comment || null)
                      }
                      disabled={retryingLeakId === leak.id}
                      className="border-amber-500/20 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15"
                    >
                      {retryingLeakId === leak.id ? "Обновляю..." : "Retry"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
