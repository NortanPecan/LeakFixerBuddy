"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Sparkles } from "lucide-react";
import {
  getLeakGroupKey,
  LeakInboxTab,
  LeakInboxItem,
  LeakCaptureCard,
  LeakList,
  PatternsTab,
  SignalsTab,
  useLeakFeatureActions,
  useLeakFeatureState,
  useLeakWorkflowActions,
  useLeaksScreen,
} from "@/features/leaks";
import type { FeedbackHistoryFilter } from "@/features/leaks";

export function LeaksScreenFeature() {
  const { user, setScreen } = useAppStore();
  const {
    loading,
    refreshing,
    leaks,
    setLeaks,
    signals,
    patterns,
    setPatterns,
    activeTab,
    setActiveTab,
    statusFilter,
    setStatusFilter,
    sourceFilter,
    setSourceFilter,
    sortOption,
    setSortOption,
    focusFilter,
    setFocusFilter,
    groupBy,
    setGroupBy,
    patternFilter,
    setPatternFilter,
    searchQuery,
    setSearchQuery,
    policyByLeak,
    setPolicyByLeak,
    filteredLeaks,
    leakCounts,
    focusLeakCount,
    groupCounts,
    visiblePatterns,
    priorityLeaks,
    loadData,
  } = useLeaksScreen({ userId: user?.id });
  const {
    title,
    setTitle,
    details,
    setDetails,
    severity,
    setSeverity,
    sphere,
    setSphere,
    submitting,
    setSubmitting,
    selectedDraft,
    setSelectedDraft,
    updatingLeakId,
    setUpdatingLeakId,
    editingLeakId,
    setEditingLeakId,
    editingLeakTitle,
    setEditingLeakTitle,
    editingLeakDescription,
    setEditingLeakDescription,
    actionLeakId,
    setActionLeakId,
    savingSignalKey,
    setSavingSignalKey,
    expandedLeakId,
    setExpandedLeakId,
    plansByLeak,
    setPlansByLeak,
    loadingPlansLeakId,
    setLoadingPlansLeakId,
    generatingPlansLeakId,
    setGeneratingPlansLeakId,
    selectingPlanLeakId,
    setSelectingPlanLeakId,
    executingPolicyLeakId,
    setExecutingPolicyLeakId,
    applyingPlanLeakId,
    setApplyingPlanLeakId,
    applyingPlanActionId,
    setApplyingPlanActionId,
    savingFeedbackActionId,
    setSavingFeedbackActionId,
    savingFeedbackLeakId,
    setSavingFeedbackLeakId,
    setFeedbackCommentByAction,
    savingPatternLeakType,
    setSavingPatternLeakType,
    retryingLeakId,
    setRetryingLeakId,
    focusedPlanActionId,
    feedbackHistoryFilterByLeak,
    setFeedbackHistoryFilterByLeak,
    hasDraft,
    getFeedbackCommentDraft,
    getFeedbackCommentDraftByActionId,
    focusPlanAction,
    clearLeakFilters,
  } = useLeakFeatureState({
    leaks,
    setStatusFilter,
    setSourceFilter,
    setSortOption,
    setFocusFilter,
    setGroupBy,
    setSearchQuery,
  });

  const {
    createLeak,
    updateLeakStatus,
    updateLeakSphere,
    toggleLeakFocus,
    startEditingLeak,
    cancelEditingLeak,
    saveLeakEdits,
    hasActionType,
    loadPlansForLeak,
    generatePlansForLeak,
    selectPlanMode,
    toggleLeakDetails,
    loadPolicyForLeak,
    executePolicyAction,
    executeSuggestedPolicyAction,
    syncLeakTitleWithPattern,
    createLeakFromSignal,
    createLeakFromPattern,
  } = useLeakFeatureActions({
    userId: user?.id,
    leaks,
    setLeaks,
    plansByLeak,
    setPlansByLeak,
    setPolicyByLeak,
    setActiveTab,
    setStatusFilter,
    title,
    setTitle,
    details,
    setDetails,
    severity,
    setSeverity,
    sphere,
    setSphere,
    hasDraft,
    submitting,
    setSubmitting,
    setSelectedDraft,
    updatingLeakId,
    setUpdatingLeakId,
    editingLeakTitle,
    editingLeakDescription,
    setEditingLeakId,
    setEditingLeakTitle,
    setEditingLeakDescription,
    expandedLeakId,
    setExpandedLeakId,
    loadingPlansLeakId,
    setLoadingPlansLeakId,
    setGeneratingPlansLeakId,
    setSelectingPlanLeakId,
    executingPolicyLeakId,
    setExecutingPolicyLeakId,
    savingSignalKey,
    setSavingSignalKey,
    savingPatternLeakType,
    setSavingPatternLeakType,
    focusPlanAction,
  });

  const {
    retryLeakPlanning,
    runGuidanceAction,
    applySelectedPlan,
    applySinglePlanAction,
    sendPlanActionFeedback,
    applyBulkFeedbackForPendingCreated,
    convertLeakToTask,
    convertLeakToRitual,
    convertLeakToChallenge,
  } = useLeakWorkflowActions({
    userId: user?.id,
    leaks,
    setLeaks,
    setPatterns,
    policyByLeak,
    plansByLeak,
    actionLeakId,
    setActionLeakId,
    retryingLeakId,
    setRetryingLeakId,
    setExpandedLeakId,
    setPlansByLeak,
    setApplyingPlanLeakId,
    setApplyingPlanActionId,
    setSavingFeedbackActionId,
    setSavingFeedbackLeakId,
    setFeedbackCommentByAction,
    updateLeakStatus,
    generatePlansForLeak,
    loadPlansForLeak,
    loadPolicyForLeak,
    getFeedbackCommentDraft,
    navigateToScreen: setScreen,
  });

  const selectedDraftLabel = useMemo(() => selectedDraft?.leakType ?? null, [selectedDraft]);

  if (!user?.id) {
    return (
      <div className="pb-20">
        <Card
          style={{ background: "rgba(15,23,42,0.82)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <CardContent className="pt-6">
            <p className="text-sm text-white/70">Модуль ликов станет доступен после авторизации.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4 pb-20">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-20">
      <Card
        style={{
          background: "linear-gradient(135deg, rgba(30,41,59,0.95) 0%, rgba(15,23,42,0.92) 100%)",
          border: "1px solid rgba(99,102,241,0.25)",
        }}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-white">
                <Sparkles className="h-5 w-5 text-indigo-300" />
                Leaks
              </CardTitle>
              <CardDescription className="mt-1 text-white/60">
                Отдельный контур для захвата ликов, сигналов и AI-паттернов.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(false)}
              disabled={refreshing}
              className="border-white/15 bg-white/5 text-white hover:bg-white/10"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            <Badge className="border-white/10 bg-white/10 text-white/80">
              Inbox: {leakCounts.all}
            </Badge>
            <Badge className="border-indigo-500/20 bg-indigo-500/10 text-indigo-200">
              Signals: {signals.length}
            </Badge>
            <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-200">
              Patterns: {patterns.length}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <LeakCaptureCard
        title={title}
        details={details}
        severity={severity}
        sphere={sphere}
        hasDraft={hasDraft}
        submitting={submitting}
        onTitleChange={setTitle}
        onDetailsChange={setDetails}
        onSeverityChange={setSeverity}
        onSphereChange={setSphere}
        onSubmit={createLeak}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 bg-white/5">
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="signals">Signals</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="space-y-4">
          <LeakInboxTab
            userId={user.id}
            selectedDraft={selectedDraft}
            selectedDraftLabel={selectedDraftLabel}
            priorityLeaks={priorityLeaks}
            statusFilter={statusFilter}
            sourceFilter={sourceFilter}
            focusFilter={focusFilter}
            sortOption={sortOption}
            groupBy={groupBy}
            searchQuery={searchQuery}
            leakCounts={leakCounts}
            focusLeakCount={focusLeakCount}
            hasLeaks={leaks.length > 0}
            signalsCount={signals.length}
            patternsCount={patterns.length}
            isEmpty={filteredLeaks.length === 0}
            onSelectPriorityLeak={(leakId) => {
              setExpandedLeakId(leakId);
              setStatusFilter("all");
            }}
            onStatusFilterChange={setStatusFilter}
            onSourceFilterChange={setSourceFilter}
            onFocusFilterChange={setFocusFilter}
            onSortOptionChange={setSortOption}
            onGroupByChange={setGroupBy}
            onSearchQueryChange={setSearchQuery}
            onOpenSignals={() => setActiveTab("signals")}
            onOpenPatterns={() => setActiveTab("patterns")}
            onClearFilters={clearLeakFilters}
          >
            <LeakList
              filteredLeaks={filteredLeaks}
              groupBy={groupBy}
              groupCounts={groupCounts}
              getGroupKey={(leak) => getLeakGroupKey(leak, groupBy)}
              renderLeak={(leak) => (
                <LeakInboxItem
                  leak={leak}
                  leakPlans={plansByLeak[leak.id] || []}
                  policy={policyByLeak[leak.id] || null}
                  patterns={patterns}
                  viewState={{
                    expandedLeakId,
                    updatingLeakId,
                    editingLeakId,
                    editingLeakTitle,
                    editingLeakDescription,
                    actionLeakId,
                    loadingPlansLeakId,
                    generatingPlansLeakId,
                    selectingPlanLeakId,
                    applyingPlanLeakId,
                    applyingPlanActionId,
                    savingFeedbackLeakId,
                    savingFeedbackActionId,
                    retryingLeakId,
                    focusedPlanActionId,
                    executingPolicyLeakId,
                    feedbackHistoryFilter: feedbackHistoryFilterByLeak[leak.id] || "all",
                  }}
                  callbacks={{
                    onSetScreen: setScreen,
                    onUpdateLeakStatus: async (leakId, status) => {
                      await updateLeakStatus(leakId, status);
                    },
                    onToggleLeakFocus: toggleLeakFocus,
                    onToggleLeakDetails: toggleLeakDetails,
                    onSetSelectedDraft: setSelectedDraft,
                    onStartEditingLeak: startEditingLeak,
                    onSaveLeakEdits: saveLeakEdits,
                    onCancelEditingLeak: cancelEditingLeak,
                    onUpdateLeakSphere: updateLeakSphere,
                    onSetActiveTab: setActiveTab,
                    onSyncLeakTitleWithPattern: syncLeakTitleWithPattern,
                    onFocusPlanAction: (actionId: string) => focusPlanAction(leak.id, actionId),
                    onRunGuidanceAction: runGuidanceAction,
                    onApplyBulkFeedbackForPendingCreated: applyBulkFeedbackForPendingCreated,
                    onApplySinglePlanAction: applySinglePlanAction,
                    onSendPlanActionFeedback: sendPlanActionFeedback,
                    onRetryLeakPlanning: retryLeakPlanning,
                    onExecuteSuggestedPolicyAction: executeSuggestedPolicyAction,
                    onExecutePolicyAction: async (targetLeak, request) => {
                      await executePolicyAction(targetLeak, request);
                    },
                    onLoadPolicyForLeak: loadPolicyForLeak,
                    onConvertLeakToTask: convertLeakToTask,
                    onConvertLeakToRitual: convertLeakToRitual,
                    onConvertLeakToChallenge: convertLeakToChallenge,
                    onGeneratePlansForLeak: async (leakId, rebuild) => {
                      await generatePlansForLeak(leakId, rebuild);
                    },
                    onSelectPlanMode: selectPlanMode,
                    onApplySelectedPlan: applySelectedPlan,
                    onFeedbackHistoryFilterChange: (leakId: string, value: FeedbackHistoryFilter) =>
                      setFeedbackHistoryFilterByLeak((current) => ({
                        ...current,
                        [leakId]: value,
                      })),
                    onFeedbackCommentChange: (actionId: string, value: string) =>
                      setFeedbackCommentByAction((current) => ({
                        ...current,
                        [actionId]: value,
                      })),
                    onEditingLeakTitleChange: setEditingLeakTitle,
                    onEditingLeakDescriptionChange: setEditingLeakDescription,
                    getFeedbackCommentDraft,
                    getFeedbackCommentDraftByActionId,
                    hasActionType,
                  }}
                />
              )}
            />
          </LeakInboxTab>
        </TabsContent>

        <TabsContent value="signals" className="space-y-4">
          <SignalsTab
            userId={user.id}
            signals={signals}
            savingSignalKey={savingSignalKey}
            onOpenWeeklyReport={() => setScreen("weekly-report")}
            onCreateLeakFromSignal={createLeakFromSignal}
          />
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <PatternsTab
            patternFilter={patternFilter}
            patterns={patterns}
            visiblePatterns={visiblePatterns}
            leaks={leaks}
            savingPatternLeakType={savingPatternLeakType}
            onPatternFilterChange={setPatternFilter}
            onCreateLeakFromPattern={createLeakFromPattern}
            onSelectLinkedLeak={(leakId) => {
              setActiveTab("inbox");
              setStatusFilter("all");
              setExpandedLeakId(leakId);
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
