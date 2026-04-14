"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { showErrorToast, showSuccessToast } from "@/lib/network-utils";
import { RefreshCw, Sparkles } from "lucide-react";
import {
  buildLeakMessage,
  getLeakActionMetadata,
  getLeakGroupKey,
  getLatestPlanFeedback,
  isConvertedPlanAction,
  LeakInboxTab,
  LeakInboxItem,
  LeakCaptureCard,
  LeakList,
  PatternsTab,
  normalizeLeak,
  normalizePattern,
  normalizePlans,
  SignalsTab,
  useLeakFeatureActions,
  useLeakFeatureState,
  useLeaksScreen,
} from "@/features/leaks";
import type {
  FeedbackHistoryFilter,
  LeakActionLink,
  LeakEntity,
  LeakPlanAction,
  LeakPlanFeedback,
  LeakSolutionPlan,
  LeakGuidanceAction,
} from "@/features/leaks";

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

  const saveLeakAction = async (
    leak: LeakEntity,
    action: {
      entityType: LeakActionLink["entityType"];
      entityId: string;
      label: string;
      metadata?: Record<string, unknown> | null;
    }
  ) => {
    if (!user?.id) return;

    const response = await fetch("/api/leaks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        id: leak.id,
        status: leak.status === "new" ? "in_progress" : undefined,
        appendAction: action,
      }),
    });

    if (!response.ok) {
      throw response;
    }

    const data = await response.json();
    const updatedLeak = normalizeLeak(data.leak as LeakEntity);
    setLeaks((current) => current.map((item) => (item.id === leak.id ? updatedLeak : item)));
    setExpandedLeakId(leak.id);
  };

  const isPlanActionConverted = (action: LeakPlanAction) => isConvertedPlanAction(action);

  const reopenLeak = async (leak: LeakEntity, options?: { silent?: boolean }) => {
    return updateLeakStatus(leak.id, "in_progress", options);
  };

  const retryLeakPlanning = async (
    leak: LeakEntity,
    options?: {
      action?: LeakPlanAction | null;
      failureReason?: string | null;
    }
  ) => {
    if (!user?.id || retryingLeakId) return;

    setRetryingLeakId(leak.id);
    try {
      if (leak.status === "resolved" || leak.status === "archived") {
        const reopened = await reopenLeak(leak, { silent: true });
        if (!reopened) return;
      }

      const hadPlans = Boolean(plansByLeak[leak.id]?.length);
      const generated = await generatePlansForLeak(leak.id, hadPlans, {
        silent: true,
        retryFocus: options?.action
          ? {
              actionId: options.action.id,
              actionTitle: options.action.title,
              actionKind: options.action.kind,
              failureReason: options.failureReason || null,
            }
          : null,
      });
      if (!generated) return;

      setExpandedLeakId(leak.id);
      showSuccessToast(
        options?.action
          ? `Пересобрал режимы с фокусом на шаг «${options.action.title}»`
          : hadPlans
            ? "Лик возвращён в работу, режимы обновлены"
            : "Для лика собраны первые режимы"
      );
    } finally {
      setRetryingLeakId(null);
    }
  };

  const runGuidanceAction = async (leak: LeakEntity, action: LeakGuidanceAction) => {
    if (!action) return;

    if (action === "generate") {
      await generatePlansForLeak(leak.id, false);
      return;
    }

    if (action === "retry") {
      await retryLeakPlanning(leak);
      return;
    }

    if (action === "resolve") {
      await updateLeakStatus(leak.id, "resolved");
      return;
    }

    if (action === "reopen") {
      await reopenLeak(leak);
    }
  };

  const applySelectedPlan = async (leak: LeakEntity, mode?: LeakSolutionPlan["mode"]) => {
    if (!user?.id) return;
    const policyCorrelationId = policyByLeak[leak.id]?.nextBestAction?.correlationId || null;

    setApplyingPlanLeakId(leak.id);
    try {
      const response = await fetch(`/api/leaks/${leak.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          mode,
          policyCorrelationId: policyCorrelationId || undefined,
        }),
      });

      if (!response.ok) throw response;

      const data = await response.json();
      if (data.leak) {
        setLeaks((current) =>
          current.map((item) =>
            item.id === leak.id ? normalizeLeak(data.leak as LeakEntity) : item
          )
        );
      }
      setPlansByLeak((current) => ({
        ...current,
        [leak.id]: normalizePlans(data.plans || []),
      }));

      const createdCount = typeof data.createdCount === "number" ? data.createdCount : 0;
      const skippedCount = typeof data.skippedActions === "number" ? data.skippedActions : 0;
      const reusedCount = typeof data.reusedActions === "number" ? data.reusedActions : 0;
      if (createdCount > 0) {
        showSuccessToast(
          skippedCount > 0 || reusedCount > 0
            ? `Применил режим: создано ${createdCount}, повторно привязано ${reusedCount}, пропущено ${skippedCount}`
            : `Применил режим: создано ${createdCount}`
        );
      } else {
        showSuccessToast(
          reusedCount > 0
            ? `Новых сущностей нет, повторно связал ${reusedCount} шагов с уже созданным`
            : "Новых сущностей не создано, всё уже было применено"
        );
      }
      void loadPlansForLeak(leak.id);
    } catch (error) {
      showErrorToast(error, "apply leak plan");
    } finally {
      setApplyingPlanLeakId(null);
    }
  };

  const applySinglePlanAction = async (
    leak: LeakEntity,
    mode: LeakSolutionPlan["mode"],
    action: LeakPlanAction
  ) => {
    if (!user?.id || isPlanActionConverted(action)) return;
    const policyCorrelationId = policyByLeak[leak.id]?.nextBestAction?.correlationId || null;

    setApplyingPlanActionId(action.id);
    try {
      const response = await fetch(`/api/leaks/${leak.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          mode,
          actionId: action.id,
          policyCorrelationId: policyCorrelationId || undefined,
        }),
      });

      if (!response.ok) throw response;

      const data = await response.json();
      if (data.leak) {
        setLeaks((current) =>
          current.map((item) =>
            item.id === leak.id ? normalizeLeak(data.leak as LeakEntity) : item
          )
        );
      }
      setPlansByLeak((current) => ({
        ...current,
        [leak.id]: normalizePlans(data.plans || []),
      }));

      const createdEntity = Array.isArray(data.createdEntities) ? data.createdEntities[0] : null;
      showSuccessToast(
        createdEntity?.label ? `Создано: ${createdEntity.label}` : "Действие из плана применено"
      );
      void loadPlansForLeak(leak.id);
    } catch (error) {
      showErrorToast(error, "apply single leak action");
    } finally {
      setApplyingPlanActionId(null);
    }
  };

  const sendPlanActionFeedback = async (
    leakId: string,
    actionId: string,
    result: LeakPlanFeedback["result"],
    comment?: string,
    options?: {
      additionalActionIds?: string[];
      silent?: boolean;
    }
  ) => {
    if (!user?.id) return;
    const normalizedComment = comment?.trim() || "";
    const leakEntity = leaks.find((item) => item.id === leakId) || null;
    const linkedCorrelationMeta = leakEntity?.actions
      .map((item) => getLeakActionMetadata(item))
      .find(
        (metadata) =>
          metadata?.sourceActionId === actionId && typeof metadata.policyCorrelationId === "string"
      );
    const linkedCorrelationId =
      linkedCorrelationMeta && typeof linkedCorrelationMeta.policyCorrelationId === "string"
        ? linkedCorrelationMeta.policyCorrelationId
        : null;
    const policyCorrelationId =
      linkedCorrelationId || policyByLeak[leakId]?.nextBestAction?.correlationId || null;
    const actionIds = Array.from(
      new Set(
        [actionId, ...(options?.additionalActionIds || [])]
          .map((item) => item.trim())
          .filter(Boolean)
      )
    );

    if (result === "not_worked" && normalizedComment.length < 5) {
      showErrorToast(
        new Error(
          "Добавь короткий комментарий (минимум 5 символов), чтобы система поняла, почему не помогло"
        ),
        "save plan feedback"
      );
      return;
    }

    setSavingFeedbackActionId(actionId);
    if (actionIds.length > 1) {
      const leakKey = leaks.find((item) => item.id === leakId)?.id || leakId;
      setSavingFeedbackLeakId(leakKey);
    }
    try {
      const response = await fetch(`/api/leaks/${leakId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          solutionActionId: actionId,
          solutionActionIds: actionIds.length > 1 ? actionIds : undefined,
          policyCorrelationId: policyCorrelationId || undefined,
          result,
          comment: normalizedComment || null,
        }),
      });

      if (!response.ok) throw response;

      const data = await response.json();
      const nextPattern =
        data.pattern && typeof data.pattern === "object" ? normalizePattern(data.pattern) : null;
      const nextPlans = normalizePlans(data.plans || []);
      setPlansByLeak((current) => ({
        ...current,
        [leakId]: nextPlans,
      }));
      const affectedActionIds = Array.isArray(data.affectedActionIds)
        ? data.affectedActionIds.filter((item: unknown): item is string => typeof item === "string")
        : actionIds;
      const modeByActionId = new Map<string, LeakSolutionPlan["mode"]>();
      nextPlans.forEach((plan) => {
        plan.actions.forEach((action) => {
          modeByActionId.set(action.id, plan.mode);
        });
      });
      const firstAffectedMode =
        affectedActionIds.map((id: string) => modeByActionId.get(id)).find(Boolean) || null;
      const nextStatus =
        data.leak && typeof data.leak.status === "string" ? data.leak.status : null;
      const nextResolvedAt =
        data.leak && typeof data.leak.resolvedAt === "string" ? data.leak.resolvedAt : null;
      setLeaks((current) =>
        current.map((leak) => {
          if (leak.id !== leakId) return leak;
          const snapshot =
            leak.contextSnapshot &&
            typeof leak.contextSnapshot === "object" &&
            !Array.isArray(leak.contextSnapshot)
              ? ({ ...leak.contextSnapshot } as Record<string, unknown>)
              : {};
          if (result === "worked" && firstAffectedMode) {
            snapshot.lastStableMode = firstAffectedMode;
            snapshot.lastStableAt = new Date().toISOString();
          }
          snapshot.contextUpdatedAt = new Date().toISOString();
          return {
            ...leak,
            status: nextStatus ? (nextStatus as LeakEntity["status"]) : leak.status,
            resolvedAt: nextStatus ? nextResolvedAt : leak.resolvedAt,
            updatedAt: new Date().toISOString(),
            contextSnapshot: snapshot,
          };
        })
      );
      if (nextPattern) {
        setPatterns((current) => {
          const filtered = current.filter((pattern) => pattern.leakType !== nextPattern.leakType);
          return [nextPattern, ...filtered];
        });
      }
      if (!options?.silent) {
        if (data.reopened) {
          showSuccessToast("Фидбек сохранён, leak автоматически возвращён в работу");
        } else if (affectedActionIds.length > 1) {
          showSuccessToast(`Фидбек применён к ${affectedActionIds.length} шагам`);
        } else {
          showSuccessToast("Фидбек по действию сохранён");
        }
      }
      setFeedbackCommentByAction((current) => {
        const next = { ...current };
        affectedActionIds.forEach((id: string) => {
          next[id] = normalizedComment;
        });
        return next;
      });
      void loadPlansForLeak(leakId);
      void loadPolicyForLeak(leakId);
    } catch (error) {
      showErrorToast(error, "save plan feedback");
    } finally {
      setSavingFeedbackActionId(null);
      setSavingFeedbackLeakId(null);
    }
  };

  const applyBulkFeedbackForPendingCreated = async (
    leak: LeakEntity,
    plan: LeakSolutionPlan,
    result: LeakPlanFeedback["result"]
  ) => {
    const pendingActions = plan.actions.filter(
      (action) => isPlanActionConverted(action) && !getLatestPlanFeedback(action)
    );
    if (pendingActions.length === 0) {
      showSuccessToast("По созданным шагам без feedback ничего не осталось");
      return;
    }

    const primaryAction = pendingActions[0];
    const bulkComment = getFeedbackCommentDraft(primaryAction);
    await sendPlanActionFeedback(leak.id, primaryAction.id, result, bulkComment, {
      additionalActionIds: pendingActions.slice(1).map((item) => item.id),
    });
  };

  const convertLeakToTask = async (leak: LeakEntity) => {
    if (!user?.id || actionLeakId) return;

    setActionLeakId(leak.id);
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          text: leak.title,
          zone: "LeakFixer",
          notes: buildLeakMessage(leak),
        }),
      });

      if (!response.ok) throw response;
      const data = await response.json();
      await saveLeakAction(leak, {
        entityType: "task",
        entityId: data.task.id,
        label: data.task.text,
        metadata: { zone: data.task.zone || null },
      });
      showSuccessToast("Задача создана из лика");
      setScreen("tasks");
    } catch (error) {
      showErrorToast(error, "create task from leak");
    } finally {
      setActionLeakId(null);
    }
  };

  const convertLeakToRitual = async (leak: LeakEntity) => {
    if (!user?.id || actionLeakId) return;

    setActionLeakId(leak.id);
    try {
      const response = await fetch("/api/rituals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          title: leak.title,
          category: "mind",
          type: "regular",
          days: [1, 2, 3, 4, 5, 6, 7],
          timeWindow: "any",
          description: buildLeakMessage(leak),
          goalShort: "Исправить лик",
          attributes: ["mind", "will"],
        }),
      });

      if (!response.ok) throw response;
      const data = await response.json();
      await saveLeakAction(leak, {
        entityType: "ritual",
        entityId: data.ritual.id,
        label: data.ritual.title,
        metadata: { category: data.ritual.category || null },
      });
      showSuccessToast("Ритуал создан из лика");
      setScreen("rituals");
    } catch (error) {
      showErrorToast(error, "create ritual from leak");
    } finally {
      setActionLeakId(null);
    }
  };

  const convertLeakToChallenge = async (leak: LeakEntity) => {
    if (!user?.id || actionLeakId) return;

    setActionLeakId(leak.id);
    try {
      const response = await fetch("/api/challenges/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          leakType: leak.title,
          leakMessage: buildLeakMessage(leak),
        }),
      });

      if (!response.ok) throw response;
      const data = await response.json();
      await saveLeakAction(leak, {
        entityType: "challenge",
        entityId: data.challenge.id,
        label: data.challenge.title || data.challenge.name,
        metadata: { duration: data.challenge.duration || null },
      });
      showSuccessToast("AI-челлендж создан из лика");
      setScreen("challenges");
    } catch (error) {
      showErrorToast(error, "create challenge from leak");
    } finally {
      setActionLeakId(null);
    }
  };

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
