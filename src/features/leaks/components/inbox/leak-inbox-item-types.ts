import type { Screen } from "@/lib/store";
import type {
  FeedbackHistoryFilter,
  LeakActionLink,
  LeakDraft,
  LeakEntity,
  LeakGuidanceAction,
  LeakPattern,
  LeakPlanAction,
  LeakPlanFeedback,
  LeakPolicyActionRequest,
  LeakPolicyHint,
  LeakSolutionPlan,
  NextBestActionHint,
} from "@/features/leaks/types";

export interface SendPlanActionFeedbackOptions {
  additionalActionIds?: string[];
  silent?: boolean;
}

export interface RetryLeakPlanningOptions {
  action: LeakPlanAction | null;
  failureReason: string | null;
}

export interface LeakInboxItemViewState {
  expandedLeakId: string | null;
  updatingLeakId: string | null;
  editingLeakId: string | null;
  editingLeakTitle: string;
  editingLeakDescription: string;
  actionLeakId: string | null;
  loadingPlansLeakId: string | null;
  generatingPlansLeakId: string | null;
  selectingPlanLeakId: string | null;
  applyingPlanLeakId: string | null;
  applyingPlanActionId: string | null;
  savingFeedbackLeakId: string | null;
  savingFeedbackActionId: string | null;
  retryingLeakId: string | null;
  focusedPlanActionId: string | null;
  executingPolicyLeakId: string | null;
  feedbackHistoryFilter: FeedbackHistoryFilter;
}

export interface LeakInboxItemCallbacks {
  onSetScreen: (screen: Screen) => void;
  onUpdateLeakStatus: (leakId: string, status: LeakEntity["status"]) => void | Promise<void>;
  onToggleLeakFocus: (leak: LeakEntity) => void | Promise<void>;
  onToggleLeakDetails: (leakId: string) => void;
  onSetSelectedDraft: (draft: LeakDraft) => void;
  onStartEditingLeak: (leak: LeakEntity) => void;
  onSaveLeakEdits: (leakId: string) => void | Promise<void>;
  onCancelEditingLeak: () => void;
  onUpdateLeakSphere: (leakId: string, sphere: string | null) => void | Promise<void>;
  onSetActiveTab: (tab: "inbox" | "signals" | "patterns") => void;
  onSyncLeakTitleWithPattern: (leak: LeakEntity, pattern: LeakPattern) => void | Promise<void>;
  onFocusPlanAction: (actionId: string) => void;
  onRunGuidanceAction: (
    leak: LeakEntity,
    action: Exclude<LeakGuidanceAction, null>
  ) => void | Promise<void>;
  onApplyBulkFeedbackForPendingCreated: (
    leak: LeakEntity,
    plan: LeakSolutionPlan,
    result: LeakPlanFeedback["result"]
  ) => void | Promise<void>;
  onApplySinglePlanAction: (
    leak: LeakEntity,
    mode: LeakSolutionPlan["mode"],
    action: LeakPlanAction
  ) => void | Promise<void>;
  onSendPlanActionFeedback: (
    leakId: string,
    actionId: string,
    result: LeakPlanFeedback["result"],
    comment?: string,
    options?: SendPlanActionFeedbackOptions
  ) => void | Promise<void>;
  onRetryLeakPlanning: (
    leak: LeakEntity,
    options: RetryLeakPlanningOptions
  ) => void | Promise<void>;
  onExecuteSuggestedPolicyAction: (
    leak: LeakEntity,
    nextBestActionHint: NextBestActionHint,
    selectedPlan: LeakSolutionPlan | null,
    planActionsById: Map<string, LeakPlanAction>
  ) => void | Promise<void>;
  onExecutePolicyAction: (
    leak: LeakEntity,
    request: LeakPolicyActionRequest
  ) => void | Promise<void>;
  onLoadPolicyForLeak: (leakId: string) => void | Promise<void>;
  onConvertLeakToTask: (leak: LeakEntity) => void | Promise<void>;
  onConvertLeakToRitual: (leak: LeakEntity) => void | Promise<void>;
  onConvertLeakToChallenge: (leak: LeakEntity) => void | Promise<void>;
  onGeneratePlansForLeak: (leakId: string, rebuild: boolean) => void | Promise<void>;
  onSelectPlanMode: (leakId: string, mode: LeakSolutionPlan["mode"]) => void | Promise<void>;
  onApplySelectedPlan: (leak: LeakEntity, mode: LeakSolutionPlan["mode"]) => void | Promise<void>;
  onFeedbackHistoryFilterChange: (leakId: string, value: FeedbackHistoryFilter) => void;
  onFeedbackCommentChange: (actionId: string, value: string) => void;
  onEditingLeakTitleChange: (value: string) => void;
  onEditingLeakDescriptionChange: (value: string) => void;
  getFeedbackCommentDraft: (action: LeakPlanAction | null | undefined) => string;
  getFeedbackCommentDraftByActionId: (actionId: string) => string;
  hasActionType: (leak: LeakEntity, entityType: LeakActionLink["entityType"]) => boolean;
}

export interface LeakInboxItemProps {
  leak: LeakEntity;
  leakPlans: LeakSolutionPlan[];
  policy: LeakPolicyHint | null;
  patterns: LeakPattern[];
  viewState: LeakInboxItemViewState;
  callbacks: LeakInboxItemCallbacks;
}
