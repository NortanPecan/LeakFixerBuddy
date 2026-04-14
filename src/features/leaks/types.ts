export type LeakSource = "manual" | "signal" | "imported" | "ai_suggested";

export type LeakStatus = "new" | "in_progress" | "resolved" | "archived";

export type LeakSeverity = "info" | "warning" | "critical";

export type LeakActionEntityType = "task" | "ritual" | "challenge" | "content" | "skill" | "trait";

export type LeakPlanActionKind = "task" | "ritual" | "skill" | "trait" | "challenge" | "content";

export type LeakPlanFeedbackResult = "worked" | "partially" | "not_worked";

export type LeakPlanMode = "minimum" | "base" | "maximum";

export type LeakConfidenceLabel = "low" | "medium" | "high";

export interface LeakActionLink {
  id: string;
  entityType: LeakActionEntityType;
  entityId: string;
  label: string;
  status: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeakEntity {
  id: string;
  title: string;
  description: string | null;
  source: LeakSource;
  status: LeakStatus;
  severity: LeakSeverity;
  sphere: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  contextSnapshot?: Record<string, unknown> | null;
  actions: LeakActionLink[];
}

export interface LeakPlanFeedback {
  id: string;
  leakId: string;
  solutionActionId: string;
  result: LeakPlanFeedbackResult;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeakPlanAction {
  id: string;
  kind: LeakPlanActionKind;
  title: string;
  description: string | null;
  payload?: Record<string, unknown> | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  feedbacks: LeakPlanFeedback[];
}

export interface LeakSolutionPlan {
  id: string;
  leakId: string;
  mode: LeakPlanMode;
  summary: string;
  confidenceLabel: LeakConfidenceLabel;
  confidenceReason: string | null;
  isSelected: boolean;
  source: string;
  createdAt: string;
  updatedAt: string;
  actions: LeakPlanAction[];
}

export interface LeakHint {
  type: string;
  severity: LeakSeverity;
  message: string;
  emoji: string;
  days?: string[];
}

export interface LeakPatternSolution {
  text: string;
  worked: boolean | null;
  result?: LeakPlanFeedbackResult;
  comment?: string | null;
  updatedAt?: string | null;
  sourceActionKind?: string | null;
  sourcePlanMode?: string | null;
  linkedEntityType?: string | null;
  linkedEntityLabel?: string | null;
}

export interface LeakPatternActiveLeak {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  matchType?: "exact" | "fuzzy";
}

export interface LeakPattern {
  leakType: string;
  analysisCount: number;
  whatWorked: string[];
  clusterKey?: string;
  clusterLabel?: string;
  clusterSize?: number;
  clusterConfidence?: number;
  clusterRawConfidence?: number;
  clusterConflict?: "none" | "mixed" | "high";
  clusterConflictRatio?: number;
  clusterWorkedCount?: number;
  clusterPartialCount?: number;
  clusterFailedCount?: number;
  clusterLeakTypes?: string[];
  clusterWorkedExamples?: string[];
  clusterFailedExamples?: string[];
  linkType?: "exact" | "fuzzy" | "none";
  triedSolutions?: LeakPatternSolution[];
  workedCount?: number;
  partialCount?: number;
  failedCount?: number;
  workedExamples?: LeakPatternSolution[];
  updatedAt: string;
  activeLeakCount?: number;
  activeLeaks?: LeakPatternActiveLeak[];
}

export interface NextBestActionFactor {
  key: string;
  weight: number;
  detail?: string;
}

export interface NextBestActionHint {
  type:
    | "generate"
    | "create_entity"
    | "give_feedback"
    | "retry"
    | "switch_mode"
    | "regenerate_context";
  reason: string;
  actionId?: string | null;
  targetMode?: LeakPlanMode | null;
  confidence: LeakConfidenceLabel;
  correlationId?: string | null;
  factors?: NextBestActionFactor[];
}

export interface ContextDriftMetric {
  key: string;
  before: number;
  now: number;
  deltaPct: number;
}

export interface ContextDriftHint {
  isStale: boolean;
  score: number;
  generatedAt: string | null;
  checkedAt: string;
  changedMetrics: ContextDriftMetric[];
}

export interface ExecutionScoreHint {
  value: number;
  breakdown: {
    createdCoverage: number;
    feedbackCoverage: number;
    workedShare: number;
    attemptsPenalty: number;
    driftPenalty: number;
  };
}

export interface AdaptiveModeHint {
  targetMode: LeakPlanMode;
  reason: string;
}

export interface LeakPolicyJournalEvent {
  type: string;
  at: string;
  actionId?: string | null;
  actionKind?: string | null;
  note?: string | null;
  policyCorrelationId?: string | null;
  policyActionType?: string | null;
  actionTitle?: string | null;
  result?: string | null;
  actor?: string | null;
  decision?: string | null;
  attempt?: number | null;
  factors?: NextBestActionFactor[];
}

export interface LeakPolicyFunnel {
  correlationId: string;
  suggestedAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  entityCreatedCount: number;
  outcomeCount: number;
  outcomeWorked: number;
  outcomePartial: number;
  outcomeFailed: number;
  lastOutcomeAt: string | null;
  pendingOutcomeActionIds: string[];
  pendingOutcomeActionTitles: string[];
  nextPendingOutcomeActionId: string | null;
  nextPendingOutcomeActionTitle: string | null;
  stage: "suggested" | "accepted" | "awaiting_feedback" | "learning" | "completed" | "rejected";
  suggestedAgeMinutes: number | null;
  acceptedAgeMinutes: number | null;
  lastOutcomeAgeMinutes: number | null;
  maxPendingOutcomeAgeMinutes: number | null;
  oldestPendingOutcomeActionId: string | null;
  oldestPendingOutcomeActionTitle: string | null;
  oldestPendingOutcomeAgeMinutes: number | null;
  stuckSignals: {
    noDecision: boolean;
    noEntityAfterAccept: boolean;
    pendingFeedback: boolean;
    noOutcomeAfterCreate: boolean;
  };
  primaryStuckSignal: "pending_feedback" | "no_entity_after_accept" | "no_decision" | "none";
  stuckScore: number;
  urgency: "low" | "medium" | "high";
  urgencyReason: string;
  recommendedNudge: "accept_or_reject" | "create_entity" | "collect_feedback" | "none";
  recommendedNudgeReason: string;
  isCurrent?: boolean;
}

export interface LeakPolicyLearningSignals {
  loopHealth: number;
  recentFeedbackCount: number;
  recentWorkedCount: number;
  recentPartialCount: number;
  recentFailedCount: number;
  topFailureReasons: Array<{ text: string; count: number }>;
  failureBuckets: {
    time: number;
    energy: number;
    context: number;
    complexity: number;
    unknown: number;
  };
  dominantFailureBucket: "time" | "energy" | "context" | "complexity" | "unknown";
  repeatedActions: Array<{ actionId: string; actionTitle: string; attempt: number }>;
  unstableActions: Array<{
    actionId: string;
    actionTitle: string;
    attempts: number;
    failures: number;
    partials: number;
    worked: number;
    lastResult: "worked" | "partially" | "not_worked" | "unknown";
    lastUpdatedAt: string | null;
  }>;
}

export interface LeakPolicyStuckOverview {
  totalFunnels: number;
  high: number;
  medium: number;
  low: number;
  blockedFunnels: number;
  maxStuckScore: number;
}

export interface LeakPolicySummary {
  accepted: number;
  rejected: number;
  outcomes: number;
  outcomeWorked: number;
  outcomePartial: number;
  outcomeFailed: number;
  rejectReasons: Record<string, number>;
  currentFunnel?: LeakPolicyFunnel | null;
  recentFunnels?: LeakPolicyFunnel[];
  learningSignals?: LeakPolicyLearningSignals;
  stuckOverview?: LeakPolicyStuckOverview;
}

export interface LeakPolicyHint {
  policyVersion?: number;
  computedAt?: string;
  selectedMode: LeakPlanMode | null;
  nextBestAction: NextBestActionHint | null;
  contextDrift: ContextDriftHint | null;
  executionScore: ExecutionScoreHint | null;
  adaptiveModeSuggestion: AdaptiveModeHint | null;
  runJournal?: LeakPolicyJournalEvent[];
  summary?: LeakPolicySummary;
}

export interface LeakPolicyActionRequest {
  actionType: "switch_mode" | "retry" | "regenerate_context" | "focus_action";
  decision?: "accepted" | "rejected";
  reason?: string | null;
  correlationId?: string | null;
  targetMode?: LeakPlanMode;
  actionId?: string | null;
  actionTitle?: string | null;
  actionKind?: string | null;
  factors?: NextBestActionFactor[];
}

export interface LeakDraft {
  leakType: string;
  leakMessage: string;
  severity: LeakSeverity;
}

export type LeakGuidanceTone = "indigo" | "emerald" | "amber";

export type LeakGuidanceAction = "generate" | "retry" | "resolve" | "reopen" | null;

export interface LeakGuidance {
  tone: LeakGuidanceTone;
  title: string;
  description: string;
  action: LeakGuidanceAction;
  actionLabel: string;
  selectedPlan: LeakSolutionPlan | null;
  totalActions: number;
  createdActions: number;
  workedActions: number;
  partialActions: number;
  failedActions: number;
  pendingActions: number;
  feedbackActions: number;
  bottleneckText: string;
  bottleneckActionId: string | null;
}

export interface LeakRetryFocus {
  actionTitle: string | null;
  actionKind: string | null;
  failureReason: string | null;
  requestedAt: string | null;
}

export type LeakStatusFilter = "all" | LeakStatus;

export type LeakSourceFilter = "all" | LeakSource;

export type LeakSortOption = "updated_desc" | "created_desc" | "severity_desc";

export type LeakFocusFilter = "all" | "focus";

export type LeakGroupOption = "none" | "sphere" | "source";

export type PatternFilter = "all" | "linked";

export type FeedbackHistoryFilter = "all" | "problem";

export interface FeedbackLogItem {
  actionId: string | null;
  actionTitle: string;
  actionKind: string;
  mode: string | null;
  result: LeakPlanFeedbackResult;
  comment: string | null;
  policyCorrelationId?: string | null;
  feedbackSource?: "manual" | "policy";
  attempt?: number;
  updatedAt: string;
}
