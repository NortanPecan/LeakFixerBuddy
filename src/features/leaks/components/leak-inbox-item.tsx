import {
  SHOW_FUNNELS,
  SHOW_PATTERN_ANALYTICS,
  SHOW_POLICY_INSPECTOR,
  SHOW_PRIORITY_PENDING_QUEUE,
} from "@/features/leaks/lib/leak-constants";
import {
  buildContextHypotheses,
  getContextMetricNumber,
  getContextSnapshotItems,
  getMinutesSince,
  getRecentFeedbackTrend,
  getRetryFocus,
  getSnapshotHistory,
  getSnapshotMode,
} from "@/features/leaks/lib/leak-context";
import { buildLeakMessage, getActionScreen } from "@/features/leaks/lib/leak-formatters";
import { buildLeakGuidance } from "@/features/leaks/lib/leak-guidance";
import {
  getBestPatternForLeak,
  getFeedbackByActionId,
  getLeakActionMetadata,
  getLeakFeedbackByAction,
  getLinkedEntityForPlanAction,
  getLatestWorkedOutcome,
  getPatternLinkTypeForLeak,
  getPlanActionById,
  getSelectedPlan,
  isConvertedPlanAction,
  isFocusLeak,
  normalizeLookupValue,
} from "@/features/leaks/lib/leak-selectors";
import { LeakCard } from "@/features/leaks/components/leak-card";
import { LeakDetailsPanel } from "@/features/leaks/components/leak-details-panel";
import { LeakGuidancePanel } from "@/features/leaks/components/leak-guidance-panel";
import { LeakPolicyPanel } from "@/features/leaks/components/leak-policy-panel";
import type { LeakInboxItemProps } from "@/features/leaks/components/inbox/leak-inbox-item-types";

export function LeakInboxItem({
  leak,
  leakPlans,
  policy,
  patterns,
  viewState,
  callbacks,
}: LeakInboxItemProps) {
  const guidance = buildLeakGuidance(leak, leakPlans);
  const selectedPlan = getSelectedPlan(leakPlans);
  const bottleneckPlanAction =
    selectedPlan && guidance.bottleneckActionId
      ? selectedPlan.actions.find((action) => action.id === guidance.bottleneckActionId) || null
      : null;
  const bottleneckLinkedEntity = bottleneckPlanAction
    ? getLinkedEntityForPlanAction(leak, bottleneckPlanAction)
    : null;
  const feedbackByActionId = getFeedbackByActionId(leakPlans);
  const planActionsById = getPlanActionById(leakPlans);
  const feedbackByAction = getLeakFeedbackByAction(leak, leakPlans);
  const visibleFeedbackTimeline =
    viewState.feedbackHistoryFilter === "problem"
      ? feedbackByAction.filter((item) => item.result !== "worked")
      : feedbackByAction;
  const latestWorkedOutcome = getLatestWorkedOutcome(leak, leakPlans);
  const recentFeedbackTrend = getRecentFeedbackTrend(leak.contextSnapshot);
  const contextHypotheses = buildContextHypotheses(leak.contextSnapshot);
  const retryFocus = getRetryFocus(leak.contextSnapshot);
  const selectedModeFromSnapshot = getSnapshotMode(leak.contextSnapshot, "selectedPlanMode");
  const lastStableMode = getSnapshotMode(leak.contextSnapshot, "lastStableMode");
  const nextBestActionHint = policy?.nextBestAction || null;
  const policyEvents = (policy?.runJournal || []).filter((event) =>
    event.type.startsWith("policy_")
  );
  const policyAcceptedCount =
    typeof policy?.summary?.accepted === "number"
      ? policy.summary.accepted
      : policyEvents.filter((event) => event.type === "policy_accepted").length;
  const policyRejectedCount =
    typeof policy?.summary?.rejected === "number"
      ? policy.summary.rejected
      : policyEvents.filter((event) => event.type === "policy_rejected").length;
  const policyOutcomeCount =
    typeof policy?.summary?.outcomes === "number"
      ? policy.summary.outcomes
      : policyEvents.filter((event) => event.type === "policy_outcome").length;
  const policyOutcomeWorked =
    typeof policy?.summary?.outcomeWorked === "number"
      ? policy.summary.outcomeWorked
      : policyEvents.filter((event) => event.type === "policy_outcome" && event.result === "worked")
          .length;
  const policyOutcomePartial =
    typeof policy?.summary?.outcomePartial === "number"
      ? policy.summary.outcomePartial
      : policyEvents.filter(
          (event) => event.type === "policy_outcome" && event.result === "partially"
        ).length;
  const policyOutcomeFailed =
    typeof policy?.summary?.outcomeFailed === "number"
      ? policy.summary.outcomeFailed
      : policyEvents.filter(
          (event) => event.type === "policy_outcome" && event.result === "not_worked"
        ).length;
  const policySuggestionCorrelationId = nextBestActionHint?.correlationId || null;
  const latestPolicyDecision = policySuggestionCorrelationId
    ? policyEvents.find(
        (event) =>
          (event.type === "policy_accepted" || event.type === "policy_rejected") &&
          event.policyCorrelationId === policySuggestionCorrelationId
      ) || null
    : null;
  const policyDecisionState = latestPolicyDecision
    ? latestPolicyDecision.type === "policy_accepted"
      ? "accepted"
      : "rejected"
    : "pending";
  const policyComputedMinutes = getMinutesSince(policy?.computedAt);
  const policyAcceptRate =
    policyAcceptedCount + policyRejectedCount > 0
      ? Math.round((policyAcceptedCount / (policyAcceptedCount + policyRejectedCount)) * 100)
      : null;
  const policyWorkedRate =
    policyOutcomeCount > 0 ? Math.round((policyOutcomeWorked / policyOutcomeCount) * 100) : null;
  const policyRejectReasonCounts =
    policy?.summary?.rejectReasons && Object.keys(policy.summary.rejectReasons).length > 0
      ? policy.summary.rejectReasons
      : policyEvents
          .filter((event) => event.type === "policy_rejected" && event.note)
          .reduce<Record<string, number>>((acc, event) => {
            const key = event.note || "unknown";
            acc[key] = (acc[key] || 0) + 1;
            return acc;
          }, {});
  const learningSignals = policy?.summary?.learningSignals || {
    loopHealth: 0,
    recentFeedbackCount: 0,
    recentWorkedCount: 0,
    recentPartialCount: 0,
    recentFailedCount: 0,
    topFailureReasons: [],
    failureBuckets: { time: 0, energy: 0, context: 0, complexity: 0, unknown: 0 },
    dominantFailureBucket: "unknown" as const,
    repeatedActions: [],
    unstableActions: [],
  };
  const policyStuckOverview = policy?.summary?.stuckOverview || {
    totalFunnels: 0,
    high: 0,
    medium: 0,
    low: 0,
    blockedFunnels: 0,
    maxStuckScore: 0,
  };
  const contextDriftHint = policy?.contextDrift || null;
  const executionScore = policy?.executionScore || {
    value: 0,
    breakdown: {
      createdCoverage: 0,
      feedbackCoverage: 0,
      workedShare: 0,
      attemptsPenalty: 0,
      driftPenalty: 0,
    },
  };
  const adaptiveModeSuggestion = policy?.adaptiveModeSuggestion || null;
  const policyActionBusy = viewState.executingPolicyLeakId === leak.id;
  const selectedModeForChain =
    policy?.selectedMode || selectedPlan?.mode || selectedModeFromSnapshot || null;
  const createdEntityCountForChain = leak.actions.length;
  const policyLinkedCreatedCount = leak.actions.filter((item) => {
    const metadata = getLeakActionMetadata(item);
    return (
      typeof metadata?.policyCorrelationId === "string" && metadata.policyCorrelationId.length > 0
    );
  }).length;
  const feedbackCountForChain = feedbackByAction.length;
  const workedCountForChain = feedbackByAction.filter((item) => item.result === "worked").length;
  const recentFeedbackWindow = feedbackByAction.slice(0, 6);
  const recentWorkedCount = recentFeedbackWindow.filter((item) => item.result === "worked").length;
  const recentPartialCount = recentFeedbackWindow.filter(
    (item) => item.result === "partially"
  ).length;
  const recentFailedCount = recentFeedbackWindow.filter(
    (item) => item.result === "not_worked"
  ).length;
  const policyLinkedCreatedWithoutFeedback = leak.actions.filter((item) => {
    const metadata = getLeakActionMetadata(item);
    if (!metadata) return false;
    const policyCorrelationId =
      typeof metadata.policyCorrelationId === "string" ? metadata.policyCorrelationId : null;
    if (!policyCorrelationId) return false;
    const sourceActionId =
      typeof metadata.sourceActionId === "string" ? metadata.sourceActionId : null;
    if (!sourceActionId) return true;
    return !feedbackByActionId.has(sourceActionId);
  }).length;
  const firstPolicyLinkedWithoutFeedbackMetadata = leak.actions
    .map((item) => getLeakActionMetadata(item))
    .find((metadata) => {
      if (!metadata) return false;
      const policyCorrelationId =
        typeof metadata.policyCorrelationId === "string" ? metadata.policyCorrelationId : null;
      if (!policyCorrelationId) return false;
      const sourceActionId =
        typeof metadata.sourceActionId === "string" ? metadata.sourceActionId : null;
      return Boolean(sourceActionId && !feedbackByActionId.has(sourceActionId));
    });
  const firstPolicyLinkedWithoutFeedbackActionId =
    firstPolicyLinkedWithoutFeedbackMetadata &&
    typeof firstPolicyLinkedWithoutFeedbackMetadata.sourceActionId === "string"
      ? firstPolicyLinkedWithoutFeedbackMetadata.sourceActionId
      : null;
  const latestPolicyFailedOutcome =
    policyEvents.find(
      (event) => event.type === "policy_outcome" && event.result === "not_worked"
    ) || null;
  const currentFunnel = policy?.summary?.currentFunnel || null;
  const currentFunnelStageLabel =
    currentFunnel?.stage === "suggested"
      ? "Совет сформирован"
      : currentFunnel?.stage === "accepted"
        ? "Совет принят"
        : currentFunnel?.stage === "awaiting_feedback"
          ? "Ждёт feedback"
          : currentFunnel?.stage === "learning"
            ? "Обучение на outcome"
            : currentFunnel?.stage === "completed"
              ? "Контур завершён"
              : currentFunnel?.stage === "rejected"
                ? "Совет отклонён"
                : "Нет этапа";
  const nextPendingFunnelActionId =
    currentFunnel?.oldestPendingOutcomeActionId ||
    currentFunnel?.nextPendingOutcomeActionId ||
    null;
  const nextPendingFunnelActionTitle =
    currentFunnel?.oldestPendingOutcomeActionTitle ||
    currentFunnel?.nextPendingOutcomeActionTitle ||
    currentFunnel?.pendingOutcomeActionTitles?.[0] ||
    null;
  const recentFunnels = (policy?.summary?.recentFunnels || [])
    .filter((item) => item.correlationId !== currentFunnel?.correlationId)
    .sort((a, b) => {
      const urgencyRank = (value: "low" | "medium" | "high") =>
        value === "high" ? 3 : value === "medium" ? 2 : 1;
      const rankDiff = urgencyRank(b.urgency) - urgencyRank(a.urgency);
      if (rankDiff !== 0) return rankDiff;
      return (b.stuckScore || 0) - (a.stuckScore || 0);
    })
    .slice(0, 3);
  const priorityPendingQueue = [currentFunnel, ...recentFunnels]
    .filter((item): item is NonNullable<typeof currentFunnel> => Boolean(item))
    .filter((item) => Boolean(item.oldestPendingOutcomeActionId || item.nextPendingOutcomeActionId))
    .sort((a, b) => {
      const urgencyRank = (value: "low" | "medium" | "high") =>
        value === "high" ? 3 : value === "medium" ? 2 : 1;
      const rankDiff = urgencyRank(b.urgency) - urgencyRank(a.urgency);
      if (rankDiff !== 0) return rankDiff;
      const ageA = a.maxPendingOutcomeAgeMinutes || 0;
      const ageB = b.maxPendingOutcomeAgeMinutes || 0;
      if (ageB !== ageA) return ageB - ageA;
      return b.stuckScore - a.stuckScore;
    })
    .slice(0, 5);
  const contextPulse = {
    energyAvg: getContextMetricNumber(leak.contextSnapshot, "energyAvg"),
    stressAvg: getContextMetricNumber(leak.contextSnapshot, "stressAvg"),
    sleepHoursAvg: getContextMetricNumber(leak.contextSnapshot, "sleepHoursAvg"),
    openTasks: getContextMetricNumber(leak.contextSnapshot, "openTasks"),
  };
  const contextPulseRisk =
    (contextPulse.stressAvg !== null && contextPulse.stressAvg >= 7) ||
    (contextPulse.energyAvg !== null && contextPulse.energyAvg <= 5) ||
    (contextPulse.sleepHoursAvg !== null && contextPulse.sleepHoursAvg < 6.5) ||
    (contextPulse.openTasks !== null && contextPulse.openTasks >= 18)
      ? "high"
      : "normal";
  const snapshotHistory = getSnapshotHistory(leak.contextSnapshot);
  const contextSnapshotItems = getContextSnapshotItems(leak.contextSnapshot);
  const matchedPattern = getBestPatternForLeak(patterns, leak);
  const matchedPatternLinkType = matchedPattern
    ? getPatternLinkTypeForLeak(matchedPattern, leak)
    : "none";

  const renderPolicyPanel = () => (
    <LeakPolicyPanel
      leak={leak}
      policy={policy}
      selectedPlan={selectedPlan}
      nextBestActionHint={nextBestActionHint}
      policyDecisionState={policyDecisionState}
      policyComputedMinutes={policyComputedMinutes}
      currentFunnel={currentFunnel}
      currentFunnelStageLabel={currentFunnelStageLabel}
      nextPendingFunnelActionId={nextPendingFunnelActionId}
      nextPendingFunnelActionTitle={nextPendingFunnelActionTitle}
      recentFunnels={recentFunnels}
      priorityPendingQueue={priorityPendingQueue}
      policyStuckOverview={policyStuckOverview}
      policyAcceptedCount={policyAcceptedCount}
      policyRejectedCount={policyRejectedCount}
      policyOutcomeCount={policyOutcomeCount}
      policyOutcomeWorked={policyOutcomeWorked}
      policyOutcomePartial={policyOutcomePartial}
      policyOutcomeFailed={policyOutcomeFailed}
      policyLinkedCreatedCount={policyLinkedCreatedCount}
      policyAcceptRate={policyAcceptRate}
      policyWorkedRate={policyWorkedRate}
      learningSignals={learningSignals}
      policyRejectReasonCounts={policyRejectReasonCounts}
      policyEvents={policyEvents}
      savingFeedbackActionId={viewState.savingFeedbackActionId}
      isPolicyActionBusy={policyActionBusy}
      isSelectingMode={viewState.selectingPlanLeakId === leak.id}
      isGeneratingPlans={viewState.generatingPlansLeakId === leak.id}
      isRetrying={viewState.retryingLeakId === leak.id}
      showPolicyInspector={SHOW_POLICY_INSPECTOR}
      showFunnels={SHOW_FUNNELS}
      showPriorityPendingQueue={SHOW_PRIORITY_PENDING_QUEUE}
      onExecuteSuggestedAction={() => {
        if (!nextBestActionHint) return;
        void callbacks.onExecuteSuggestedPolicyAction(
          leak,
          nextBestActionHint,
          selectedPlan || null,
          planActionsById
        );
      }}
      onRejectSuggestedAction={(reason) => {
        if (!nextBestActionHint) return;
        void callbacks.onExecutePolicyAction(leak, {
          actionType:
            nextBestActionHint.type === "switch_mode"
              ? "switch_mode"
              : nextBestActionHint.type === "retry"
                ? "retry"
                : nextBestActionHint.type === "regenerate_context"
                  ? "regenerate_context"
                  : "focus_action",
          decision: "rejected",
          reason,
          correlationId: nextBestActionHint.correlationId || null,
          targetMode: nextBestActionHint.targetMode || undefined,
          actionId: nextBestActionHint.actionId || undefined,
          factors: nextBestActionHint.factors || [],
        });
      }}
      onFocusPlanAction={callbacks.onFocusPlanAction}
      onSendPlanActionFeedback={(actionId, result, comment, options) =>
        callbacks.onSendPlanActionFeedback(leak.id, actionId, result, comment, options)
      }
      onGetFeedbackCommentDraft={(actionId) =>
        callbacks.getFeedbackCommentDraft(planActionsById.get(actionId) || null)
      }
      onLoadPolicy={() => callbacks.onLoadPolicyForLeak(leak.id)}
      onExecutePolicyAction={(request) => {
        void callbacks.onExecutePolicyAction(leak, request);
      }}
      onRetryFailedOutcome={async (event) => {
        if (!event.actionId) return;
        const action = planActionsById.get(event.actionId) || null;
        await callbacks.onExecutePolicyAction(leak, {
          actionType: "retry",
          correlationId: event.policyCorrelationId || null,
          actionId: action?.id || event.actionId || null,
          actionTitle: action?.title || event.actionTitle || null,
          actionKind: action?.kind || event.actionKind || null,
          reason: event.note || "policy_outcome_failed",
        });
        await callbacks.onRetryLeakPlanning(leak, {
          action,
          failureReason: event.note || null,
        });
      }}
    />
  );

  const mainActionBlock =
    viewState.expandedLeakId === leak.id ? (
      <LeakGuidancePanel
        guidance={guidance}
        retryFocus={retryFocus}
        latestWorkedOutcome={latestWorkedOutcome}
        selectedPlan={selectedPlan}
        executionScore={executionScore}
        recentFeedbackTrend={recentFeedbackTrend}
        selectedModeForChain={selectedModeForChain}
        createdEntityCountForChain={createdEntityCountForChain}
        feedbackCountForChain={feedbackCountForChain}
        workedCountForChain={workedCountForChain}
        policyLinkedCreatedCount={policyLinkedCreatedCount}
        policyLinkedCreatedWithoutFeedback={policyLinkedCreatedWithoutFeedback}
        firstPolicyLinkedWithoutFeedbackActionId={firstPolicyLinkedWithoutFeedbackActionId}
        latestPolicyFailedOutcome={latestPolicyFailedOutcome}
        contextDriftHint={contextDriftHint}
        adaptiveModeSuggestion={adaptiveModeSuggestion}
        bottleneckPlanAction={bottleneckPlanAction}
        bottleneckLinkedEntity={bottleneckLinkedEntity}
        policyPanel={renderPolicyPanel()}
        isUpdating={viewState.updatingLeakId === leak.id}
        isRetrying={viewState.retryingLeakId === leak.id}
        isGeneratingPlans={viewState.generatingPlansLeakId === leak.id}
        isSelectingMode={viewState.selectingPlanLeakId === leak.id}
        isPolicyActionBusy={policyActionBusy}
        applyingPlanActionId={viewState.applyingPlanActionId}
        applyingPlanLeakId={viewState.applyingPlanLeakId}
        onOpenActionEntity={(entityType) => callbacks.onSetScreen(getActionScreen(entityType))}
        onFocusLatestWorkedAction={(actionTitle) => {
          const matchedAction = selectedPlan?.actions.find(
            (action) => action.title === actionTitle
          );
          if (matchedAction) {
            callbacks.onFocusPlanAction(matchedAction.id);
          }
        }}
        onRunGuidanceAction={(action) => callbacks.onRunGuidanceAction(leak, action)}
        onFocusAction={callbacks.onFocusPlanAction}
        onCreateBottleneckAction={(action) =>
          callbacks.onApplySinglePlanAction(leak, selectedPlan?.mode || "minimum", action)
        }
        onExecuteAdaptiveMode={(targetMode) =>
          callbacks.onExecutePolicyAction(leak, {
            actionType: "switch_mode",
            reason: "adaptive_mode_suggestion",
            targetMode,
          })
        }
        onRetryLatestPolicyFailure={async () => {
          if (!latestPolicyFailedOutcome) return;
          const action = latestPolicyFailedOutcome.actionId
            ? planActionsById.get(latestPolicyFailedOutcome.actionId) || null
            : null;
          await callbacks.onExecutePolicyAction(leak, {
            actionType: "retry",
            correlationId: latestPolicyFailedOutcome.policyCorrelationId || null,
            actionId: action?.id || latestPolicyFailedOutcome.actionId || null,
            actionTitle: action?.title || latestPolicyFailedOutcome.actionTitle || null,
            actionKind: action?.kind || latestPolicyFailedOutcome.actionKind || null,
            reason: latestPolicyFailedOutcome.note || "policy_outcome_failed",
          });
          await callbacks.onRetryLeakPlanning(leak, {
            action,
            failureReason: latestPolicyFailedOutcome.note || null,
          });
        }}
      />
    ) : null;

  return (
    <LeakCard
      leak={leak}
      updatingLeakId={viewState.updatingLeakId}
      expanded={viewState.expandedLeakId === leak.id}
      isFocus={isFocusLeak(leak)}
      mainActionBlock={mainActionBlock}
      onOpenActionEntity={(entityType) => callbacks.onSetScreen(getActionScreen(entityType))}
      onMoveToWork={() => callbacks.onUpdateLeakStatus(leak.id, "in_progress")}
      onResolve={() => callbacks.onUpdateLeakStatus(leak.id, "resolved")}
      onArchive={() => callbacks.onUpdateLeakStatus(leak.id, "archived")}
      onReturnToWork={() => callbacks.onUpdateLeakStatus(leak.id, "in_progress")}
      onToggleFocus={() => callbacks.onToggleLeakFocus(leak)}
      onToggleDetails={() => callbacks.onToggleLeakDetails(leak.id)}
      onAnalyze={() =>
        callbacks.onSetSelectedDraft({
          leakType: leak.title,
          leakMessage: buildLeakMessage(leak),
          severity: leak.severity,
        })
      }
      onEdit={() => callbacks.onStartEditingLeak(leak)}
    >
      {viewState.expandedLeakId === leak.id && (
        <LeakDetailsPanel
          overviewPanel={{
            leak,
            updatingLeakId: viewState.updatingLeakId,
            editing: viewState.editingLeakId === leak.id,
            editingLeakTitle: viewState.editingLeakTitle,
            editingLeakDescription: viewState.editingLeakDescription,
            contextSnapshotItems,
            contextPulse,
            contextPulseRisk,
            contextHypotheses,
            snapshotHistory,
            onEditingLeakTitleChange: callbacks.onEditingLeakTitleChange,
            onEditingLeakDescriptionChange: callbacks.onEditingLeakDescriptionChange,
            onSaveEdits: () => callbacks.onSaveLeakEdits(leak.id),
            onCancelEditing: callbacks.onCancelEditingLeak,
            onUpdateSphere: (sphere) => callbacks.onUpdateLeakSphere(leak.id, sphere),
            onOpenSnapshotEntity: (entityType) =>
              callbacks.onSetScreen(getActionScreen(entityType)),
          }}
          learningPanel={
            recentFeedbackWindow.length > 0 ||
            (SHOW_PATTERN_ANALYTICS && (matchedPattern || selectedPlan))
              ? {
                  recentFeedbackWindowLength: recentFeedbackWindow.length,
                  recentWorkedCount,
                  recentPartialCount,
                  recentFailedCount,
                  policyLinkedCreatedWithoutFeedback,
                  matchedPattern: SHOW_PATTERN_ANALYTICS ? matchedPattern : null,
                  matchedPatternLinkType,
                  canSyncTitleWithPattern: Boolean(
                    matchedPattern &&
                    matchedPatternLinkType === "fuzzy" &&
                    normalizeLookupValue(matchedPattern.leakType) !==
                      normalizeLookupValue(leak.title)
                  ),
                  updating: viewState.updatingLeakId === leak.id,
                  onOpenPatterns: () => callbacks.onSetActiveTab("patterns"),
                  onSyncTitleWithPattern: () => {
                    if (matchedPattern) {
                      void callbacks.onSyncLeakTitleWithPattern(leak, matchedPattern);
                    }
                  },
                }
              : null
          }
          planSummaryPanel={
            selectedPlan
              ? {
                  leakTitle: leak.title,
                  selectedPlan,
                  createdActions: guidance.createdActions,
                  totalActions: guidance.totalActions,
                  feedbackActions: guidance.feedbackActions,
                  selectedModeFromSnapshot,
                  lastStableMode,
                }
              : null
          }
          planActionsPanel={
            selectedPlan
              ? {
                  leak,
                  selectedPlan,
                  feedbackByActionId,
                  focusedPlanActionId: viewState.focusedPlanActionId,
                  applyingPlanActionId: viewState.applyingPlanActionId,
                  applyingPlanLeakId: viewState.applyingPlanLeakId,
                  savingFeedbackLeakId: viewState.savingFeedbackLeakId,
                  savingFeedbackActionId: viewState.savingFeedbackActionId,
                  retryingLeakId: viewState.retryingLeakId,
                  getFeedbackCommentDraft: callbacks.getFeedbackCommentDraft,
                  isPlanActionConverted: isConvertedPlanAction,
                  onApplyBulkFeedback: (result) =>
                    callbacks.onApplyBulkFeedbackForPendingCreated(leak, selectedPlan, result),
                  onApplySinglePlanAction: (action) =>
                    callbacks.onApplySinglePlanAction(leak, selectedPlan.mode, action),
                  onOpenEntity: (entityType) => callbacks.onSetScreen(getActionScreen(entityType)),
                  onSendPlanActionFeedback: (actionId, result, comment) =>
                    callbacks.onSendPlanActionFeedback(leak.id, actionId, result, comment),
                  onRetryPlanAction: (action, failureReason) =>
                    callbacks.onRetryLeakPlanning(leak, {
                      action,
                      failureReason,
                    }),
                }
              : null
          }
          feedbackHistoryPanel={
            feedbackByAction.length > 0
              ? {
                  leak,
                  feedbackHistoryFilter: viewState.feedbackHistoryFilter,
                  feedbackByAction,
                  visibleFeedbackTimeline,
                  retryingLeakId: viewState.retryingLeakId,
                  onFeedbackHistoryFilterChange: (value) =>
                    callbacks.onFeedbackHistoryFilterChange(leak.id, value),
                  onRetryLatestProblem: (item) =>
                    callbacks.onRetryLeakPlanning(leak, {
                      action: item.actionId ? planActionsById.get(item.actionId) || null : null,
                      failureReason: item.comment || null,
                    }),
                  onFocusPlanAction: callbacks.onFocusPlanAction,
                  onOpenEntity: (entityType) => callbacks.onSetScreen(getActionScreen(entityType)),
                  onRetryTimelineItem: (item) =>
                    callbacks.onRetryLeakPlanning(leak, {
                      action: item.actionId ? planActionsById.get(item.actionId) || null : null,
                      failureReason: item.comment || null,
                    }),
                }
              : null
          }
          createdActionsPanel={{
            leak,
            feedbackByActionId,
            planActionsById,
            savingFeedbackActionId: viewState.savingFeedbackActionId,
            retryingLeakId: viewState.retryingLeakId,
            getFeedbackCommentDraftByActionId: callbacks.getFeedbackCommentDraftByActionId,
            onOpenEntity: (entityType) => callbacks.onSetScreen(getActionScreen(entityType)),
            onFocusPlanAction: callbacks.onFocusPlanAction,
            onSendPlanActionFeedback: (actionId, result, comment) =>
              callbacks.onSendPlanActionFeedback(leak.id, actionId, result, comment),
            onRetryFromCreatedAction: (action, failureReason) =>
              callbacks.onRetryLeakPlanning(leak, {
                action,
                failureReason,
              }),
          }}
          quickConvertPanel={{
            leak,
            actionLeakId: viewState.actionLeakId,
            hasActionType: callbacks.hasActionType,
            onConvertToTask: () => callbacks.onConvertLeakToTask(leak),
            onConvertToRitual: () => callbacks.onConvertLeakToRitual(leak),
            onConvertToChallenge: () => callbacks.onConvertLeakToChallenge(leak),
          }}
          plansPanel={{
            leak,
            plans: leakPlans,
            loadingPlansLeakId: viewState.loadingPlansLeakId,
            generatingPlansLeakId: viewState.generatingPlansLeakId,
            selectingPlanLeakId: viewState.selectingPlanLeakId,
            applyingPlanLeakId: viewState.applyingPlanLeakId,
            applyingPlanActionId: viewState.applyingPlanActionId,
            savingFeedbackActionId: viewState.savingFeedbackActionId,
            retryingLeakId: viewState.retryingLeakId,
            updatingLeakId: viewState.updatingLeakId,
            getFeedbackCommentDraft: callbacks.getFeedbackCommentDraft,
            isPlanActionConverted: isConvertedPlanAction,
            onFeedbackCommentChange: callbacks.onFeedbackCommentChange,
            onGeneratePlans: (rebuild) => callbacks.onGeneratePlansForLeak(leak.id, rebuild),
            onSelectPlanMode: (mode) => callbacks.onSelectPlanMode(leak.id, mode),
            onApplySelectedPlan: (mode) => callbacks.onApplySelectedPlan(leak, mode),
            onOpenConvertedEntity: (entityType) =>
              callbacks.onSetScreen(getActionScreen(entityType)),
            onApplySinglePlanAction: (mode, action) =>
              callbacks.onApplySinglePlanAction(leak, mode, action),
            onSendPlanActionFeedback: (actionId, result, comment) =>
              callbacks.onSendPlanActionFeedback(leak.id, actionId, result, comment),
            onRetryPlanAction: (action, failureReason) =>
              callbacks.onRetryLeakPlanning(leak, {
                action,
                failureReason,
              }),
            onResolveLeak: () => callbacks.onUpdateLeakStatus(leak.id, "resolved"),
          }}
        />
      )}
    </LeakCard>
  );
}
