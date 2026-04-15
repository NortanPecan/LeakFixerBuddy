import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PLAN_MODE_LABELS } from "@/features/leaks/lib/leak-constants";
import type { LeakPolicyPanelProps } from "./leak-policy-types";

type LeakPolicySuggestionPanelProps = Pick<
  LeakPolicyPanelProps,
  | "nextBestActionHint"
  | "policyDecisionState"
  | "selectedPlan"
  | "isSelectingMode"
  | "isPolicyActionBusy"
  | "isGeneratingPlans"
  | "isRetrying"
  | "onExecuteSuggestedAction"
  | "onRejectSuggestedAction"
>;

export function LeakPolicySuggestionPanel({
  nextBestActionHint,
  policyDecisionState,
  selectedPlan,
  isSelectingMode,
  isPolicyActionBusy,
  isGeneratingPlans,
  isRetrying,
  onExecuteSuggestedAction,
  onRejectSuggestedAction,
}: LeakPolicySuggestionPanelProps) {
  if (!nextBestActionHint) return null;

  return (
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
  );
}
