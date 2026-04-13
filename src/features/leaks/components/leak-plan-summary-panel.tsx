import { Badge } from "@/components/ui/badge";
import {
  PLAN_CONFIDENCE_STYLES,
  PLAN_MODE_LABELS,
  PLAN_MODE_STYLES,
} from "@/features/leaks/lib/leak-constants";
import { getConfidenceLabelText } from "@/features/leaks/lib/leak-formatters";
import type { LeakSolutionPlan } from "@/features/leaks/types";

interface LeakPlanSummaryPanelProps {
  leakTitle: string;
  selectedPlan: LeakSolutionPlan;
  createdActions: number;
  totalActions: number;
  feedbackActions: number;
  selectedModeFromSnapshot: LeakSolutionPlan["mode"] | null;
  lastStableMode: LeakSolutionPlan["mode"] | null;
}

export function LeakPlanSummaryPanel({
  leakTitle,
  selectedPlan,
  createdActions,
  totalActions,
  feedbackActions,
  selectedModeFromSnapshot,
  lastStableMode,
}: LeakPlanSummaryPanelProps) {
  return (
    <>
      <div className="text-xs tracking-wide text-white/40 uppercase">Цепочка выполнения</div>
      <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
          <Badge variant="outline" className="border-white/10 text-white/70">
            Leak: {leakTitle}
          </Badge>
          <span className="text-white/35">→</span>
          <Badge className={PLAN_MODE_STYLES[selectedPlan.mode]}>
            Режим: {PLAN_MODE_LABELS[selectedPlan.mode]}
          </Badge>
          <span className="text-white/35">→</span>
          <Badge className="border-white/10 bg-white/10 text-white/75">
            Создано: {createdActions}/{totalActions}
          </Badge>
          <span className="text-white/35">→</span>
          <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-200">
            Feedback: {feedbackActions}/{totalActions}
          </Badge>
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-white/10 bg-black/10 px-3 py-2">
        <div className="flex flex-wrap gap-2">
          <Badge className={PLAN_MODE_STYLES[selectedPlan.mode]}>
            Режим: {PLAN_MODE_LABELS[selectedPlan.mode]}
          </Badge>
          {selectedModeFromSnapshot && (
            <Badge variant="outline" className="border-white/15 text-white/70">
              Последний выбор: {PLAN_MODE_LABELS[selectedModeFromSnapshot]}
            </Badge>
          )}
          {lastStableMode && (
            <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-200">
              Стабильный режим: {PLAN_MODE_LABELS[lastStableMode]}
            </Badge>
          )}
          <Badge className={PLAN_CONFIDENCE_STYLES[selectedPlan.confidenceLabel]}>
            Уверенность: {getConfidenceLabelText(selectedPlan.confidenceLabel)}
          </Badge>
        </div>
        {selectedPlan.confidenceReason && (
          <p className="text-xs text-white/60">{selectedPlan.confidenceReason}</p>
        )}
      </div>
    </>
  );
}
