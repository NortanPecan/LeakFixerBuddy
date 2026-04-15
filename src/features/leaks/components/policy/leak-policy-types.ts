import type {
  LeakEntity,
  LeakPlanFeedback,
  LeakPolicyActionRequest,
  LeakPolicyFunnel,
  LeakPolicyHint,
  LeakPolicyJournalEvent,
  LeakPolicyLearningSignals,
  LeakPolicyStuckOverview,
  LeakSolutionPlan,
  NextBestActionHint,
} from "@/features/leaks/types";

export type PolicyDecisionState = "accepted" | "rejected" | "pending";

export interface SendPlanActionFeedbackOptions {
  additionalActionIds?: string[];
  silent?: boolean;
}

export interface LeakPolicyPanelProps {
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
