import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PLAN_CONFIDENCE_STYLES,
  PLAN_KIND_LABELS,
  PLAN_MODE_LABELS,
  PLAN_MODE_STYLES,
} from "@/features/leaks/lib/leak-constants";
import { formatDate, getConfidenceLabelText } from "@/features/leaks/lib/leak-formatters";
import { getLatestPlanFeedback } from "@/features/leaks/lib/leak-selectors";
import type {
  LeakActionLink,
  LeakEntity,
  LeakPlanAction,
  LeakPlanFeedback,
  LeakSolutionPlan,
} from "@/features/leaks/types";

interface LeakPlansPanelProps {
  leak: LeakEntity;
  plans: LeakSolutionPlan[];
  loadingPlansLeakId: string | null;
  generatingPlansLeakId: string | null;
  selectingPlanLeakId: string | null;
  applyingPlanLeakId: string | null;
  applyingPlanActionId: string | null;
  savingFeedbackActionId: string | null;
  retryingLeakId: string | null;
  updatingLeakId: string | null;
  getFeedbackCommentDraft: (action: LeakPlanAction | null | undefined) => string;
  isPlanActionConverted: (action: LeakPlanAction) => boolean;
  onFeedbackCommentChange: (actionId: string, value: string) => void;
  onGeneratePlans: (rebuild: boolean) => void;
  onSelectPlanMode: (mode: LeakSolutionPlan["mode"]) => void;
  onApplySelectedPlan: (mode: LeakSolutionPlan["mode"]) => void;
  onOpenConvertedEntity: (entityType: LeakActionLink["entityType"]) => void;
  onApplySinglePlanAction: (mode: LeakSolutionPlan["mode"], action: LeakPlanAction) => void;
  onSendPlanActionFeedback: (
    actionId: string,
    result: LeakPlanFeedback["result"],
    comment: string
  ) => void;
  onRetryPlanAction: (action: LeakPlanAction, failureReason: string | null) => void;
  onResolveLeak: () => void;
}

export function LeakPlansPanel({
  leak,
  plans,
  loadingPlansLeakId,
  generatingPlansLeakId,
  selectingPlanLeakId,
  applyingPlanLeakId,
  applyingPlanActionId,
  savingFeedbackActionId,
  retryingLeakId,
  updatingLeakId,
  getFeedbackCommentDraft,
  isPlanActionConverted,
  onFeedbackCommentChange,
  onGeneratePlans,
  onSelectPlanMode,
  onApplySelectedPlan,
  onOpenConvertedEntity,
  onApplySinglePlanAction,
  onSendPlanActionFeedback,
  onRetryPlanAction,
  onResolveLeak,
}: LeakPlansPanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs tracking-wide text-white/40 uppercase">Планы решения</div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onGeneratePlans(false)}
            disabled={generatingPlansLeakId === leak.id}
            className="border-indigo-500/20 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/15"
          >
            {generatingPlansLeakId === leak.id ? "Собираю..." : "Сделать 3 плана"}
          </Button>
          {plans.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onGeneratePlans(true)}
              disabled={generatingPlansLeakId === leak.id}
              className="border-white/15 bg-white/5 text-white hover:bg-white/10"
            >
              Пересобрать
            </Button>
          )}
        </div>
      </div>

      {loadingPlansLeakId === leak.id ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      ) : plans.length > 0 ? (
        <div className="space-y-3">
          <div className="space-y-2 rounded-xl border border-white/10 bg-black/10 p-3">
            <div className="text-xs tracking-wide text-white/40 uppercase">Сравнение режимов</div>
            <div className="grid gap-2 md:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={`compare-${plan.id}`}
                  className={`rounded-lg border p-2 ${
                    plan.isSelected
                      ? "border-indigo-500/30 bg-indigo-500/10"
                      : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge className={PLAN_MODE_STYLES[plan.mode]}>
                      {PLAN_MODE_LABELS[plan.mode]}
                    </Badge>
                    <Badge className={PLAN_CONFIDENCE_STYLES[plan.confidenceLabel]}>
                      {getConfidenceLabelText(plan.confidenceLabel)}
                    </Badge>
                  </div>
                  <div className="mt-2 line-clamp-3 text-xs text-white/60">{plan.summary}</div>
                  <div className="mt-2 text-xs text-white/40">Действий: {plan.actions.length}</div>
                </div>
              ))}
            </div>
          </div>

          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl border p-3 ${
                plan.isSelected
                  ? "border-emerald-500/30 bg-emerald-500/10"
                  : "border-white/10 bg-white/[0.03]"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={PLAN_MODE_STYLES[plan.mode]}>
                      {PLAN_MODE_LABELS[plan.mode]}
                    </Badge>
                    <Badge className={PLAN_CONFIDENCE_STYLES[plan.confidenceLabel]}>
                      Шанс: {plan.confidenceLabel}
                    </Badge>
                    {plan.isSelected && (
                      <Badge className="border-emerald-500/20 bg-emerald-500/15 text-emerald-200">
                        Выбран
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-white/85">{plan.summary}</p>
                  {plan.confidenceReason && (
                    <p className="text-xs text-white/50">{plan.confidenceReason}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onSelectPlanMode(plan.mode)}
                  disabled={selectingPlanLeakId === leak.id || plan.isSelected}
                  className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                >
                  {plan.isSelected ? "Текущий режим" : "Выбрать"}
                </Button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onApplySelectedPlan(plan.mode)}
                  disabled={
                    applyingPlanLeakId === leak.id ||
                    plan.actions.every((action) => isPlanActionConverted(action))
                  }
                  className="border-indigo-500/20 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/15"
                >
                  {applyingPlanLeakId === leak.id
                    ? "Применяю..."
                    : plan.actions.every((action) => isPlanActionConverted(action))
                      ? "Режим уже применён"
                      : "Применить режим"}
                </Button>
                {plan.isSelected && (
                  <Badge className="border-white/10 bg-white/10 text-white/70">
                    Активный режим для этого лика
                  </Badge>
                )}
              </div>

              <div className="mt-3 space-y-2">
                {plan.actions.map((action) => {
                  const feedback = getLatestPlanFeedback(action);
                  const convertedEntityType = action.payload?.convertedEntityType as
                    | LeakActionLink["entityType"]
                    | undefined;
                  const convertedEntityLabel =
                    typeof action.payload?.convertedEntityLabel === "string"
                      ? action.payload.convertedEntityLabel
                      : "";

                  return (
                    <div
                      key={action.id}
                      className="rounded-xl border border-white/10 bg-black/10 px-3 py-2"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="border-white/10 text-white/55">
                          {PLAN_KIND_LABELS[action.kind]}
                        </Badge>
                        <div className="text-sm text-white">{action.title}</div>
                        {isPlanActionConverted(action) && (
                          <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-200">
                            Создано
                          </Badge>
                        )}
                      </div>

                      {action.description && (
                        <p className="mt-1 text-xs text-white/55">{action.description}</p>
                      )}

                      {isPlanActionConverted(action) && convertedEntityType && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onOpenConvertedEntity(convertedEntityType)}
                            className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                          >
                            Открыть созданное
                          </Button>
                          <div className="self-center text-xs text-white/40">
                            {String(convertedEntityLabel || "")}
                          </div>
                        </div>
                      )}

                      {!isPlanActionConverted(action) && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onApplySinglePlanAction(plan.mode, action)}
                            disabled={
                              applyingPlanActionId === action.id || applyingPlanLeakId === leak.id
                            }
                            className="border-indigo-500/20 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/15"
                          >
                            {applyingPlanActionId === action.id ? "Создаю..." : "Создать отдельно"}
                          </Button>
                        </div>
                      )}

                      {isPlanActionConverted(action) && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Input
                            value={getFeedbackCommentDraft(action)}
                            onChange={(event) =>
                              onFeedbackCommentChange(action.id, event.target.value)
                            }
                            placeholder="Почему это сработало или не помогло"
                            className="h-9 min-w-[240px] border-white/10 bg-white/5 text-white placeholder:text-white/30"
                          />
                          {(["worked", "partially", "not_worked"] as const).map((result) => {
                            const isActive = feedback?.result === result;
                            const label =
                              result === "worked"
                                ? "Сработало"
                                : result === "partially"
                                  ? "Частично"
                                  : "Не помогло";

                            return (
                              <Button
                                key={result}
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  onSendPlanActionFeedback(
                                    action.id,
                                    result,
                                    getFeedbackCommentDraft(action)
                                  )
                                }
                                disabled={savingFeedbackActionId === action.id}
                                className={
                                  isActive
                                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                                    : "border-white/15 bg-white/5 text-white hover:bg-white/10"
                                }
                              >
                                {label}
                              </Button>
                            );
                          })}
                          {feedback && (
                            <div className="self-center text-xs text-white/40">
                              Последний фидбек: {formatDate(feedback.updatedAt)}
                            </div>
                          )}
                          {feedback?.result !== "worked" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onRetryPlanAction(action, feedback?.comment || null)}
                              disabled={retryingLeakId === leak.id}
                              className="border-amber-500/20 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15"
                            >
                              {retryingLeakId === leak.id ? "Обновляю..." : "Нужен другой подход"}
                            </Button>
                          )}
                          {feedback?.result === "worked" && leak.status !== "resolved" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={onResolveLeak}
                              disabled={updatingLeakId === leak.id}
                              className="border-emerald-500/20 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15"
                            >
                              Закрыть leak
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-white/55">
          Здесь появятся режимы `minimum / base / maximum`, чтобы выбрать реалистичный план под
          текущую жизнь.
        </p>
      )}
    </div>
  );
}
