"use client";

import type { Dispatch, SetStateAction } from "react";
import { showErrorToast, showSuccessToast } from "@/lib/network-utils";
import {
  createLeak as createLeakRequest,
  executeLeakPolicyAction,
  generateLeakPlans,
  loadLeakPlans,
  loadLeakPolicy,
  selectLeakPlanMode,
  updateLeak,
} from "@/features/leaks/api/leaks-api";
import { PLAN_MODE_LABELS, normalizeLookupValue } from "@/features/leaks";
import { isFocusLeak } from "@/features/leaks/lib/leak-selectors";
import type {
  LeakActionLink,
  LeakDraft,
  LeakEntity,
  LeakPattern,
  LeakPlanAction,
  LeakPlanMode,
  LeakPolicyActionRequest,
  LeakPolicyHint,
  LeakSeverity,
  LeakSolutionPlan,
  LeakStatusFilter,
  NextBestActionHint,
} from "@/features/leaks/types";

interface RetryFocusOptions {
  actionId?: string | null;
  actionTitle: string;
  actionKind?: LeakPlanAction["kind"] | null;
  failureReason?: string | null;
}

interface UseLeakFeatureActionsOptions {
  userId?: string;
  leaks: LeakEntity[];
  setLeaks: Dispatch<SetStateAction<LeakEntity[]>>;
  plansByLeak: Record<string, LeakSolutionPlan[]>;
  setPlansByLeak: Dispatch<SetStateAction<Record<string, LeakSolutionPlan[]>>>;
  setPolicyByLeak: Dispatch<SetStateAction<Record<string, LeakPolicyHint | null>>>;
  setActiveTab: (value: "inbox" | "signals" | "patterns") => void;
  setStatusFilter: (value: LeakStatusFilter) => void;
  title: string;
  setTitle: (value: string) => void;
  details: string;
  setDetails: (value: string) => void;
  severity: LeakSeverity;
  setSeverity: (value: LeakSeverity) => void;
  sphere: string | null;
  setSphere: (value: string | null) => void;
  hasDraft: boolean;
  submitting: boolean;
  setSubmitting: (value: boolean) => void;
  setSelectedDraft: (value: LeakDraft | null) => void;
  updatingLeakId: string | null;
  setUpdatingLeakId: (value: string | null) => void;
  editingLeakTitle: string;
  editingLeakDescription: string;
  setEditingLeakId: (value: string | null) => void;
  setEditingLeakTitle: (value: string) => void;
  setEditingLeakDescription: (value: string) => void;
  expandedLeakId: string | null;
  setExpandedLeakId: (value: string | null) => void;
  loadingPlansLeakId: string | null;
  setLoadingPlansLeakId: (value: string | null) => void;
  setGeneratingPlansLeakId: (value: string | null) => void;
  setSelectingPlanLeakId: (value: string | null) => void;
  executingPolicyLeakId: string | null;
  setExecutingPolicyLeakId: (value: string | null) => void;
  savingSignalKey: string | null;
  setSavingSignalKey: (value: string | null) => void;
  savingPatternLeakType: string | null;
  setSavingPatternLeakType: (value: string | null) => void;
  focusPlanAction: (leakId: string, actionId: string) => void;
}

export function useLeakFeatureActions({
  userId,
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
}: UseLeakFeatureActionsOptions) {
  const findOpenLeak = (nextTitle: string, description?: string | null) =>
    leaks.find((leak) => {
      if (leak.status === "resolved" || leak.status === "archived") return false;

      const sameTitle = normalizeLookupValue(leak.title) === normalizeLookupValue(nextTitle);
      if (!sameTitle) return false;

      if (!description) return true;
      return normalizeLookupValue(leak.description) === normalizeLookupValue(description);
    });

  const hasActionType = (leak: LeakEntity, entityType: LeakActionLink["entityType"]) =>
    leak.actions?.some((action) => action.entityType === entityType);

  const createLeak = async () => {
    if (!userId || !hasDraft || submitting) return;

    const nextTitle = title.trim() || details.trim().slice(0, 80) || "Новый лик";
    const nextDescription = details.trim() || null;
    const duplicateLeak = findOpenLeak(nextTitle, nextDescription);
    if (duplicateLeak) {
      setActiveTab("inbox");
      setStatusFilter("all");
      setExpandedLeakId(duplicateLeak.id);
      showSuccessToast("Похожий активный leak уже есть в inbox, открыл его для продолжения");
      return;
    }

    setSubmitting(true);
    try {
      const data = await createLeakRequest({
        userId,
        title: nextTitle,
        description: nextDescription,
        severity,
        source: "manual",
        sphere,
      });

      if (data.deduped) {
        setActiveTab("inbox");
        setStatusFilter("all");
        setExpandedLeakId(data.leak.id);
        showSuccessToast("Похожий активный leak уже есть, открыл его вместо дубля");
        return;
      }

      setLeaks((current) => [data.leak, ...current]);
      setExpandedLeakId(data.leak.id);
      setTitle("");
      setDetails("");
      setSeverity("warning");
      setSphere(null);
      setActiveTab("inbox");
      setStatusFilter("all");
      setSelectedDraft(null);
      showSuccessToast("Лик сохранён");
    } catch (error) {
      showErrorToast(error, "create leak");
    } finally {
      setSubmitting(false);
    }
  };

  const updateLeakStatus = async (
    leakId: string,
    status: Exclude<LeakStatusFilter, "all">,
    options?: { silent?: boolean }
  ) => {
    if (!userId || updatingLeakId) return false;

    setUpdatingLeakId(leakId);
    try {
      const data = await updateLeak({
        userId,
        id: leakId,
        status,
      });

      setLeaks((current) => current.map((leak) => (leak.id === leakId ? data.leak : leak)));
      if (!options?.silent) {
        showSuccessToast("Статус лика обновлён");
      }
      return true;
    } catch (error) {
      showErrorToast(error, "update leak status");
      return false;
    } finally {
      setUpdatingLeakId(null);
    }
  };

  const updateLeakSphere = async (leakId: string, nextSphere: string | null) => {
    if (!userId || updatingLeakId) return;

    setUpdatingLeakId(leakId);
    try {
      const data = await updateLeak({
        userId,
        id: leakId,
        sphere: nextSphere,
      });

      setLeaks((current) => current.map((leak) => (leak.id === leakId ? data.leak : leak)));
      showSuccessToast("Сфера лика обновлена");
    } catch (error) {
      showErrorToast(error, "update leak sphere");
    } finally {
      setUpdatingLeakId(null);
    }
  };

  const toggleLeakFocus = async (leak: LeakEntity) => {
    if (!userId || updatingLeakId) return;

    const currentSnapshot =
      leak.contextSnapshot &&
      typeof leak.contextSnapshot === "object" &&
      !Array.isArray(leak.contextSnapshot)
        ? (leak.contextSnapshot as Record<string, unknown>)
        : {};
    const nextFocusValue = !isFocusLeak(leak);

    setUpdatingLeakId(leak.id);
    try {
      const data = await updateLeak({
        userId,
        id: leak.id,
        contextSnapshot: {
          ...currentSnapshot,
          isFocus: nextFocusValue,
          focusUpdatedAt: new Date().toISOString(),
        },
      });

      setLeaks((current) => current.map((item) => (item.id === leak.id ? data.leak : item)));
      showSuccessToast(nextFocusValue ? "Leak добавлен в фокус" : "Leak убран из фокуса");
    } catch (error) {
      showErrorToast(error, "toggle leak focus");
    } finally {
      setUpdatingLeakId(null);
    }
  };

  const startEditingLeak = (leak: LeakEntity) => {
    setEditingLeakId(leak.id);
    setEditingLeakTitle(leak.title);
    setEditingLeakDescription(leak.description || "");
    setExpandedLeakId(leak.id);
  };

  const cancelEditingLeak = () => {
    setEditingLeakId(null);
    setEditingLeakTitle("");
    setEditingLeakDescription("");
  };

  const saveLeakEdits = async (leakId: string) => {
    if (!userId || updatingLeakId || !editingLeakTitle.trim()) return;

    setUpdatingLeakId(leakId);
    try {
      const data = await updateLeak({
        userId,
        id: leakId,
        title: editingLeakTitle.trim(),
        description: editingLeakDescription.trim() || null,
      });

      setLeaks((current) => current.map((leak) => (leak.id === leakId ? data.leak : leak)));
      cancelEditingLeak();
      showSuccessToast("Лик обновлён");
    } catch (error) {
      showErrorToast(error, "save leak edits");
    } finally {
      setUpdatingLeakId(null);
    }
  };

  const loadPlansForLeak = async (leakId: string) => {
    if (!userId) return;

    setLoadingPlansLeakId(leakId);
    try {
      const plans = await loadLeakPlans(userId, leakId);
      setPlansByLeak((current) => ({
        ...current,
        [leakId]: plans,
      }));
    } catch (error) {
      showErrorToast(error, "load leak plans");
    } finally {
      setLoadingPlansLeakId(null);
    }
  };

  const loadPolicyForLeak = async (leakId: string) => {
    if (!userId) return;

    try {
      const policy = await loadLeakPolicy(userId, leakId);
      setPolicyByLeak((current) => ({
        ...current,
        [leakId]: policy,
      }));
    } catch (error) {
      showErrorToast(error, "load leak policy");
    }
  };

  const generatePlansForLeak = async (
    leakId: string,
    regenerate = false,
    options?: {
      silent?: boolean;
      retryFocus?: RetryFocusOptions | null;
    }
  ) => {
    if (!userId) return false;

    setGeneratingPlansLeakId(leakId);
    try {
      const data = await generateLeakPlans(leakId, {
        userId,
        forceRefresh: regenerate,
        retryActionId: options?.retryFocus?.actionId || undefined,
        retryActionTitle: options?.retryFocus?.actionTitle || undefined,
        retryActionKind: options?.retryFocus?.actionKind || undefined,
        retryFailureReason: options?.retryFocus?.failureReason || undefined,
      });

      setPlansByLeak((current) => ({
        ...current,
        [leakId]: data.plans,
      }));
      if (data.policy !== undefined) {
        setPolicyByLeak((current) => ({
          ...current,
          [leakId]: data.policy ?? current[leakId] ?? null,
        }));
      }
      if (!options?.silent) {
        showSuccessToast(regenerate ? "Планы пересобраны" : "Планы для лика готовы");
      }
      return true;
    } catch (error) {
      showErrorToast(error, "generate leak plans");
      return false;
    } finally {
      setGeneratingPlansLeakId(null);
    }
  };

  const selectPlanMode = async (leakId: string, mode: LeakPlanMode) => {
    if (!userId) return;

    setSelectingPlanLeakId(leakId);
    try {
      const plans = await selectLeakPlanMode(leakId, {
        userId,
        mode,
      });

      setPlansByLeak((current) => ({
        ...current,
        [leakId]: plans,
      }));
      setLeaks((current) =>
        current.map((leak) => {
          if (leak.id !== leakId) return leak;

          const snapshot =
            leak.contextSnapshot &&
            typeof leak.contextSnapshot === "object" &&
            !Array.isArray(leak.contextSnapshot)
              ? ({ ...leak.contextSnapshot } as Record<string, unknown>)
              : {};
          snapshot.selectedPlanMode = mode;
          snapshot.contextUpdatedAt = new Date().toISOString();

          return {
            ...leak,
            contextSnapshot: snapshot,
          };
        })
      );
      showSuccessToast(`Выбран режим: ${PLAN_MODE_LABELS[mode]}`);
    } catch (error) {
      showErrorToast(error, "select leak plan");
    } finally {
      setSelectingPlanLeakId(null);
    }
  };

  const toggleLeakDetails = async (leakId: string) => {
    const willOpen = expandedLeakId !== leakId;
    setExpandedLeakId(willOpen ? leakId : null);

    if (willOpen && !plansByLeak[leakId] && loadingPlansLeakId !== leakId) {
      await loadPlansForLeak(leakId);
      await loadPolicyForLeak(leakId);
    }
  };

  const executePolicyAction = async (leak: LeakEntity, payload: LeakPolicyActionRequest) => {
    if (!userId || executingPolicyLeakId === leak.id) return false;

    setExecutingPolicyLeakId(leak.id);
    try {
      const data = await executeLeakPolicyAction(leak.id, {
        userId,
        actionType: payload.actionType,
        targetMode: payload.targetMode || null,
        reason: payload.reason || null,
        actionId: payload.actionId || null,
        policyCorrelationId: payload.correlationId || null,
      });

      if (data.requiresRegenerate) {
        await generatePlansForLeak(leak.id, true, { silent: true });
      }
      await loadPlansForLeak(leak.id);
      await loadPolicyForLeak(leak.id);
      return true;
    } catch (error) {
      showErrorToast(error, "execute leak policy action");
      return false;
    } finally {
      setExecutingPolicyLeakId(null);
    }
  };

  const executeSuggestedPolicyAction = async (
    leak: LeakEntity,
    nextBestActionHint: NextBestActionHint,
    selectedPlan: LeakSolutionPlan | null,
    planActionsById: Map<string, LeakPlanAction>
  ) => {
    if (nextBestActionHint.type === "switch_mode" && nextBestActionHint.targetMode) {
      await executePolicyAction(leak, {
        actionType: "switch_mode",
        correlationId: nextBestActionHint.correlationId || null,
        targetMode: nextBestActionHint.targetMode,
        factors: nextBestActionHint.factors || [],
      });
      return;
    }

    if (
      nextBestActionHint.type === "create_entity" &&
      nextBestActionHint.actionId &&
      selectedPlan
    ) {
      const action = selectedPlan.actions.find((item) => item.id === nextBestActionHint.actionId);
      if (!action) return;

      await executePolicyAction(leak, {
        actionType: "focus_action",
        correlationId: nextBestActionHint.correlationId || null,
        actionId: action.id,
        actionTitle: action.title,
        actionKind: action.kind,
        factors: nextBestActionHint.factors || [],
      });
      return;
    }

    if (nextBestActionHint.type === "give_feedback" && nextBestActionHint.actionId) {
      const action = planActionsById.get(nextBestActionHint.actionId || "");
      await executePolicyAction(leak, {
        actionType: "focus_action",
        correlationId: nextBestActionHint.correlationId || null,
        actionId: nextBestActionHint.actionId || null,
        actionTitle: action?.title || null,
        actionKind: action?.kind || null,
        factors: nextBestActionHint.factors || [],
      });
      focusPlanAction(leak.id, nextBestActionHint.actionId || "");
      return;
    }

    if (nextBestActionHint.type === "retry" && nextBestActionHint.actionId) {
      const action = planActionsById.get(nextBestActionHint.actionId || "") || null;
      await executePolicyAction(leak, {
        actionType: "retry",
        correlationId: nextBestActionHint.correlationId || null,
        actionId: action?.id || nextBestActionHint.actionId || null,
        actionTitle: action?.title || null,
        actionKind: action?.kind || null,
        factors: nextBestActionHint.factors || [],
      });
      return;
    }

    if (nextBestActionHint.type === "regenerate_context") {
      await executePolicyAction(leak, {
        actionType: "regenerate_context",
        correlationId: nextBestActionHint.correlationId || null,
        factors: nextBestActionHint.factors || [],
      });
      return;
    }

    if (nextBestActionHint.type === "generate") {
      await generatePlansForLeak(leak.id, true);
    }
  };

  const syncLeakTitleWithPattern = async (leak: LeakEntity, pattern: LeakPattern) => {
    if (!userId || updatingLeakId) return;

    const nextTitle = pattern.leakType.trim();
    if (!nextTitle || normalizeLookupValue(nextTitle) === normalizeLookupValue(leak.title)) return;

    setUpdatingLeakId(leak.id);
    try {
      const data = await updateLeak({
        userId,
        id: leak.id,
        title: nextTitle,
        description: leak.description || null,
      });

      setLeaks((current) => current.map((item) => (item.id === leak.id ? data.leak : item)));
      showSuccessToast("Название leak синхронизировано с паттерном");
    } catch (error) {
      showErrorToast(error, "sync leak title with pattern");
    } finally {
      setUpdatingLeakId(null);
    }
  };

  const createLeakFromSignal = async (signal: {
    type: string;
    message: string;
    severity: LeakSeverity;
    days?: unknown[];
  }) => {
    if (!userId || savingSignalKey) return;

    const existingLeak = findOpenLeak(signal.type, signal.message);
    if (existingLeak) {
      setActiveTab("inbox");
      setStatusFilter("all");
      setExpandedLeakId(existingLeak.id);
      showSuccessToast("Этот сигнал уже сохранён в inbox");
      return;
    }

    const signalKey = `${signal.type}:${signal.message}`;
    setSavingSignalKey(signalKey);
    try {
      const data = await createLeakRequest({
        userId,
        title: signal.type,
        description: signal.message,
        source: "signal",
        severity: signal.severity,
        contextSnapshot: signal.days?.length ? { days: signal.days } : null,
      });

      if (data.deduped) {
        setActiveTab("inbox");
        setStatusFilter("all");
        setExpandedLeakId(data.leak.id);
        showSuccessToast("Такой сигнал уже есть в активном leak");
        return;
      }

      setLeaks((current) => [data.leak, ...current]);
      setExpandedLeakId(data.leak.id);
      showSuccessToast("Сигнал сохранён как leak");
      setActiveTab("inbox");
    } catch (error) {
      showErrorToast(error, "save signal as leak");
    } finally {
      setSavingSignalKey(null);
    }
  };

  const createLeakFromPattern = async (pattern: LeakPattern) => {
    if (!userId || savingPatternLeakType) return;

    const existingLeak = findOpenLeak(pattern.leakType);
    if (existingLeak) {
      setActiveTab("inbox");
      setStatusFilter("all");
      setExpandedLeakId(existingLeak.id);
      showSuccessToast("Для этого паттерна уже есть активный leak");
      return;
    }

    setSavingPatternLeakType(pattern.leakType);
    try {
      const data = await createLeakRequest({
        userId,
        title: pattern.leakType,
        source: "ai_suggested",
        severity: "warning",
        contextSnapshot: {
          analysisCount: pattern.analysisCount,
          whatWorked: pattern.whatWorked,
        },
      });

      if (data.deduped) {
        setActiveTab("inbox");
        setStatusFilter("all");
        setExpandedLeakId(data.leak.id);
        showSuccessToast("Паттерн уже связан с активным leak");
        return;
      }

      setLeaks((current) => [data.leak, ...current]);
      setActiveTab("inbox");
      setStatusFilter("all");
      setExpandedLeakId(data.leak.id);
      showSuccessToast("Паттерн сохранён как leak");
    } catch (error) {
      showErrorToast(error, "save pattern as leak");
    } finally {
      setSavingPatternLeakType(null);
    }
  };

  return {
    createLeak,
    updateLeakStatus,
    updateLeakSphere,
    toggleLeakFocus,
    startEditingLeak,
    cancelEditingLeak,
    saveLeakEdits,
    hasActionType,
    findOpenLeak,
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
  };
}
