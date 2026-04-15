import { LeakPolicyInspectorPanel } from "@/features/leaks/components/policy/leak-policy-inspector-panel";
import { LeakPolicySuggestionPanel } from "@/features/leaks/components/policy/leak-policy-suggestion-panel";
import type { LeakPolicyPanelProps } from "@/features/leaks/components/policy/leak-policy-types";

export function LeakPolicyPanel({
  leak: _leak,
  policy,
  selectedPlan,
  nextBestActionHint,
  policyDecisionState,
  policyComputedMinutes,
  currentFunnel,
  currentFunnelStageLabel,
  nextPendingFunnelActionId,
  nextPendingFunnelActionTitle,
  recentFunnels,
  priorityPendingQueue,
  policyStuckOverview,
  policyAcceptedCount,
  policyRejectedCount,
  policyOutcomeCount,
  policyOutcomeWorked,
  policyOutcomePartial,
  policyOutcomeFailed,
  policyLinkedCreatedCount,
  policyAcceptRate,
  policyWorkedRate,
  learningSignals,
  policyRejectReasonCounts,
  policyEvents,
  savingFeedbackActionId,
  isPolicyActionBusy,
  isSelectingMode,
  isGeneratingPlans,
  isRetrying,
  showPolicyInspector,
  showFunnels,
  showPriorityPendingQueue,
  onExecuteSuggestedAction,
  onRejectSuggestedAction,
  onFocusPlanAction,
  onSendPlanActionFeedback,
  onGetFeedbackCommentDraft,
  onLoadPolicy,
  onExecutePolicyAction,
  onRetryFailedOutcome,
}: LeakPolicyPanelProps) {
  if (!nextBestActionHint && !(showPolicyInspector && policy)) {
    return null;
  }

  return (
    <>
      <LeakPolicySuggestionPanel
        nextBestActionHint={nextBestActionHint}
        policyDecisionState={policyDecisionState}
        selectedPlan={selectedPlan}
        isSelectingMode={isSelectingMode}
        isPolicyActionBusy={isPolicyActionBusy}
        isGeneratingPlans={isGeneratingPlans}
        isRetrying={isRetrying}
        onExecuteSuggestedAction={onExecuteSuggestedAction}
        onRejectSuggestedAction={onRejectSuggestedAction}
      />
      <LeakPolicyInspectorPanel
        policy={policy}
        selectedPlan={selectedPlan}
        nextBestActionHint={nextBestActionHint}
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
        savingFeedbackActionId={savingFeedbackActionId}
        isPolicyActionBusy={isPolicyActionBusy}
        isRetrying={isRetrying}
        showPolicyInspector={showPolicyInspector}
        showFunnels={showFunnels}
        showPriorityPendingQueue={showPriorityPendingQueue}
        onExecuteSuggestedAction={onExecuteSuggestedAction}
        onFocusPlanAction={onFocusPlanAction}
        onSendPlanActionFeedback={onSendPlanActionFeedback}
        onGetFeedbackCommentDraft={onGetFeedbackCommentDraft}
        onLoadPolicy={onLoadPolicy}
        onExecutePolicyAction={onExecutePolicyAction}
        onRetryFailedOutcome={onRetryFailedOutcome}
      />
    </>
  );
}
