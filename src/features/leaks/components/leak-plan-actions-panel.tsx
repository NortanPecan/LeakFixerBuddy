import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PLAN_KIND_LABELS,
  PLAN_MODE_LABELS,
  PLAN_MODE_STYLES,
} from "@/features/leaks/lib/leak-constants";
import { getPlanActionAnchorId } from "@/features/leaks/lib/leak-guidance";
import { getActionLabel, getFeedbackResultLabel } from "@/features/leaks/lib/leak-formatters";
import { getLinkedEntityForPlanAction } from "@/features/leaks/lib/leak-selectors";
import type {
  LeakEntity,
  LeakPlanAction,
  LeakPlanFeedback,
  LeakSolutionPlan,
} from "@/features/leaks/types";

interface LeakPlanActionsPanelProps {
  leak: LeakEntity;
  selectedPlan: LeakSolutionPlan;
  feedbackByActionId: Map<string, LeakPlanFeedback>;
  focusedPlanActionId: string | null;
  applyingPlanActionId: string | null;
  applyingPlanLeakId: string | null;
  savingFeedbackLeakId: string | null;
  savingFeedbackActionId: string | null;
  retryingLeakId: string | null;
  getFeedbackCommentDraft: (action: LeakPlanAction | null | undefined) => string;
  isPlanActionConverted: (action: LeakPlanAction) => boolean;
  onApplyBulkFeedback: (result: LeakPlanFeedback["result"]) => void;
  onApplySinglePlanAction: (action: LeakPlanAction) => void;
  onOpenEntity: (
    entityType: "task" | "ritual" | "challenge" | "content" | "skill" | "trait"
  ) => void;
  onSendPlanActionFeedback: (
    actionId: string,
    result: LeakPlanFeedback["result"],
    comment: string
  ) => void;
  onRetryPlanAction: (action: LeakPlanAction, failureReason: string | null) => void;
}

export function LeakPlanActionsPanel({
  leak,
  selectedPlan,
  feedbackByActionId,
  focusedPlanActionId,
  applyingPlanActionId,
  applyingPlanLeakId,
  savingFeedbackLeakId,
  savingFeedbackActionId,
  retryingLeakId,
  getFeedbackCommentDraft,
  isPlanActionConverted,
  onApplyBulkFeedback,
  onApplySinglePlanAction,
  onOpenEntity,
  onSendPlanActionFeedback,
  onRetryPlanAction,
}: LeakPlanActionsPanelProps) {
  const pendingCreatedNoFeedback = selectedPlan.actions.filter(
    (action) => isPlanActionConverted(action) && !feedbackByActionId.has(action.id)
  );
  const sampleComment =
    pendingCreatedNoFeedback.length > 0 ? getFeedbackCommentDraft(pendingCreatedNoFeedback[0]) : "";

  return (
    <>
      {pendingCreatedNoFeedback.length >= 2 && (
        <div className="space-y-2 rounded-xl border border-white/10 bg-black/10 px-3 py-2">
          <div className="text-xs text-white/60">
            Быстрый feedback: {pendingCreatedNoFeedback.length} созданных шагов пока без оценки.
          </div>
          <div className="flex flex-wrap gap-2">
            {(["worked", "partially", "not_worked"] as LeakPlanFeedback["result"][]).map(
              (result) => (
                <Button
                  key={`bulk-feedback-${leak.id}-${result}`}
                  size="sm"
                  variant="outline"
                  onClick={() => onApplyBulkFeedback(result)}
                  disabled={savingFeedbackLeakId === leak.id}
                  className={
                    result === "worked"
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15"
                      : result === "partially"
                        ? "border-amber-500/20 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15"
                        : "border-rose-500/20 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15"
                  }
                >
                  {savingFeedbackLeakId === leak.id
                    ? "Сохраняю..."
                    : result === "worked"
                      ? "Отметить все как сработало"
                      : result === "partially"
                        ? "Отметить все как частично"
                        : "Отметить все как не помогло"}
                </Button>
              )
            )}
          </div>
          {sampleComment && (
            <div className="text-xs text-white/45">
              Комментарий для bulk возьмётся из первого шага: «{sampleComment}»
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        {selectedPlan.actions.map((planAction, index) => {
          const linkedEntity = getLinkedEntityForPlanAction(leak, planAction);
          const feedback = feedbackByActionId.get(planAction.id);
          const actionStage:
            | "plan"
            | "entity"
            | "feedback_worked"
            | "feedback_partial"
            | "feedback_failed" = !linkedEntity
            ? "plan"
            : !feedback
              ? "entity"
              : feedback.result === "worked"
                ? "feedback_worked"
                : feedback.result === "partially"
                  ? "feedback_partial"
                  : "feedback_failed";

          return (
            <div
              key={planAction.id}
              id={getPlanActionAnchorId(leak.id, planAction.id)}
              className={`rounded-xl border bg-white/[0.03] px-3 py-2 transition-colors ${
                focusedPlanActionId === planAction.id
                  ? "border-indigo-400/40 shadow-[0_0_0_1px_rgba(99,102,241,0.35)]"
                  : "border-white/10"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-white/10 text-white/55">
                  {index + 1}
                </Badge>
                <Badge variant="outline" className="border-white/10 text-white/55">
                  {PLAN_KIND_LABELS[planAction.kind]}
                </Badge>
                <div className="text-sm text-white">{planAction.title}</div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                <Badge
                  className={
                    actionStage === "plan"
                      ? "border-indigo-500/20 bg-indigo-500/10 text-indigo-200"
                      : "border-white/10 bg-white/10 text-white/50"
                  }
                >
                  1. План
                </Badge>
                <span className="text-white/25">→</span>
                <Badge
                  className={
                    actionStage === "entity" || actionStage.startsWith("feedback")
                      ? "border-indigo-500/20 bg-indigo-500/10 text-indigo-200"
                      : "border-white/10 bg-white/10 text-white/50"
                  }
                >
                  2. Сущность
                </Badge>
                <span className="text-white/25">→</span>
                <Badge
                  className={
                    actionStage === "feedback_worked"
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                      : actionStage === "feedback_partial"
                        ? "border-amber-500/20 bg-amber-500/10 text-amber-200"
                        : actionStage === "feedback_failed"
                          ? "border-rose-500/20 bg-rose-500/10 text-rose-200"
                          : "border-white/10 bg-white/10 text-white/50"
                  }
                >
                  3. Feedback
                </Badge>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <Badge className={PLAN_MODE_STYLES[selectedPlan.mode]}>
                  {PLAN_MODE_LABELS[selectedPlan.mode]}
                </Badge>
                {linkedEntity ? (
                  <Badge className="border-indigo-500/20 bg-indigo-500/10 text-indigo-200">
                    Сущность: {getActionLabel(linkedEntity.entityType)} • {linkedEntity.label}
                  </Badge>
                ) : (
                  <Badge className="border-white/10 bg-white/10 text-white/60">
                    Сущность ещё не создана
                  </Badge>
                )}
                {feedback ? (
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
                ) : (
                  <Badge className="border-white/10 bg-white/10 text-white/60">
                    Feedback ещё не получен
                  </Badge>
                )}
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                {!linkedEntity ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onApplySinglePlanAction(planAction)}
                    disabled={
                      applyingPlanActionId === planAction.id || applyingPlanLeakId === leak.id
                    }
                    className="border-indigo-500/20 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/15"
                  >
                    {applyingPlanActionId === planAction.id ? "Создаю..." : "Создать шаг"}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onOpenEntity(linkedEntity.entityType)}
                    className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                  >
                    Открыть сущность
                  </Button>
                )}

                {linkedEntity &&
                  !feedback &&
                  (["worked", "partially", "not_worked"] as const).map((result) => (
                    <Button
                      key={result}
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        onSendPlanActionFeedback(
                          planAction.id,
                          result,
                          getFeedbackCommentDraft(planAction)
                        )
                      }
                      disabled={savingFeedbackActionId === planAction.id}
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
                    onClick={() => onRetryPlanAction(planAction, feedback.comment || null)}
                    disabled={retryingLeakId === leak.id}
                    className="border-amber-500/20 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15"
                  >
                    {retryingLeakId === leak.id
                      ? "Обновляю..."
                      : leak.status === "resolved" || leak.status === "archived"
                        ? "Reopen и retry"
                        : "Retry по шагу"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
