import type { ComponentProps } from "react";
import { LeakCreatedActionsPanel } from "@/features/leaks/components/leak-created-actions-panel";
import { LeakFeedbackHistoryPanel } from "@/features/leaks/components/leak-feedback-history-panel";
import { LeakLearningPanel } from "@/features/leaks/components/leak-learning-panel";
import { LeakOverviewPanel } from "@/features/leaks/components/leak-overview-panel";
import { LeakPlanActionsPanel } from "@/features/leaks/components/leak-plan-actions-panel";
import { LeakPlansPanel } from "@/features/leaks/components/leak-plans-panel";
import { LeakPlanSummaryPanel } from "@/features/leaks/components/leak-plan-summary-panel";
import { LeakQuickConvertPanel } from "@/features/leaks/components/leak-quick-convert-panel";

interface LeakDetailsPanelProps {
  overviewPanel: ComponentProps<typeof LeakOverviewPanel>;
  learningPanel: ComponentProps<typeof LeakLearningPanel> | null;
  planSummaryPanel: ComponentProps<typeof LeakPlanSummaryPanel> | null;
  planActionsPanel: ComponentProps<typeof LeakPlanActionsPanel> | null;
  feedbackHistoryPanel: ComponentProps<typeof LeakFeedbackHistoryPanel> | null;
  createdActionsPanel: ComponentProps<typeof LeakCreatedActionsPanel>;
  quickConvertPanel: ComponentProps<typeof LeakQuickConvertPanel>;
  plansPanel: ComponentProps<typeof LeakPlansPanel>;
}

export function LeakDetailsPanel({
  overviewPanel,
  learningPanel,
  planSummaryPanel,
  planActionsPanel,
  feedbackHistoryPanel,
  createdActionsPanel,
  quickConvertPanel,
  plansPanel,
}: LeakDetailsPanelProps) {
  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <LeakOverviewPanel {...overviewPanel} />

      {learningPanel && <LeakLearningPanel {...learningPanel} />}

      {planSummaryPanel && planActionsPanel && (
        <div className="space-y-2">
          <LeakPlanSummaryPanel {...planSummaryPanel} />
          <LeakPlanActionsPanel {...planActionsPanel} />
        </div>
      )}

      {feedbackHistoryPanel && <LeakFeedbackHistoryPanel {...feedbackHistoryPanel} />}

      <LeakCreatedActionsPanel {...createdActionsPanel} />
      <LeakQuickConvertPanel {...quickConvertPanel} />
      <LeakPlansPanel {...plansPanel} />
    </div>
  );
}
