"use client";

import type { Dispatch, SetStateAction } from "react";
import { showErrorToast, showSuccessToast } from "@/lib/network-utils";
import {
  buildLeakMessage,
  getLeakActionMetadata,
  getLatestPlanFeedback,
  isConvertedPlanAction,
  normalizeLeak,
  normalizePattern,
  normalizePlans,
} from "@/features/leaks";
import { updateLeak } from "@/features/leaks/api/leaks-api";
import type {
  LeakActionLink,
  LeakEntity,
  LeakGuidanceAction,
  LeakPattern,
  LeakPlanAction,
  LeakPlanFeedback,
  LeakPolicyHint,
  LeakSolutionPlan,
  LeakStatusFilter,
} from "@/features/leaks/types";

interface UseLeakWorkflowActionsOptions {
  userId?: string;
  leaks: LeakEntity[];
  setLeaks: Dispatch<SetStateAction<LeakEntity[]>>;
  setPatterns: Dispatch<SetStateAction<LeakPattern[]>>;
  policyByLeak: Record<string, LeakPolicyHint | null>;
  plansByLeak: Record<string, LeakSolutionPlan[]>;
  actionLeakId: string | null;
  setActionLeakId: (value: string | null) => void;
  retryingLeakId: string | null;
  setRetryingLeakId: (value: string | null) => void;
  setExpandedLeakId: (value: string | null) => void;
  setPlansByLeak: Dispatch<SetStateAction<Record<string, LeakSolutionPlan[]>>>;
  setApplyingPlanLeakId: (value: string | null) => void;
  setApplyingPlanActionId: (value: string | null) => void;
  setSavingFeedbackActionId: (value: string | null) => void;
  setSavingFeedbackLeakId: (value: string | null) => void;
  setFeedbackCommentByAction: Dispatch<SetStateAction<Record<string, string>>>;
  updateLeakStatus: (
    leakId: string,
    status: Exclude<LeakStatusFilter, "all">,
    options?: { silent?: boolean }
  ) => Promise<boolean | void>;
  generatePlansForLeak: (
    leakId: string,
    regenerate?: boolean,
    options?: {
      silent?: boolean;
      retryFocus?: {
        actionId?: string | null;
        actionTitle: string;
        actionKind?: LeakPlanAction["kind"] | null;
        failureReason?: string | null;
      } | null;
    }
  ) => Promise<boolean | void>;
  loadPlansForLeak: (leakId: string) => Promise<void>;
  loadPolicyForLeak: (leakId: string) => Promise<void>;
  getFeedbackCommentDraft: (action: LeakPlanAction | null | undefined) => string;
  navigateToScreen: (screen: "tasks" | "rituals" | "challenges") => void;
}

export function useLeakWorkflowActions({
  userId,
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
  navigateToScreen,
}: UseLeakWorkflowActionsOptions) {
  const saveLeakAction = async (
    leak: LeakEntity,
    action: {
      entityType: LeakActionLink["entityType"];
      entityId: string;
      label: string;
      metadata?: Record<string, unknown> | null;
    }
  ) => {
    if (!userId) return;

    const data = await updateLeak({
      userId,
      id: leak.id,
      status: leak.status === "new" ? "in_progress" : undefined,
      appendAction: action,
    });

    setLeaks((current) => current.map((item) => (item.id === leak.id ? data.leak : item)));
    setExpandedLeakId(leak.id);
  };

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
    if (!userId || retryingLeakId) return;

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
    if (!userId) return;

    const policyCorrelationId = policyByLeak[leak.id]?.nextBestAction?.correlationId || null;

    setApplyingPlanLeakId(leak.id);
    try {
      const response = await fetch(`/api/leaks/${leak.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
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
    if (!userId || isConvertedPlanAction(action)) return;

    const policyCorrelationId = policyByLeak[leak.id]?.nextBestAction?.correlationId || null;

    setApplyingPlanActionId(action.id);
    try {
      const response = await fetch(`/api/leaks/${leak.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
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
    if (!userId) return;

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
          userId,
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
      (action) => isConvertedPlanAction(action) && !getLatestPlanFeedback(action)
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
    if (!userId || actionLeakId) return;

    setActionLeakId(leak.id);
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
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
      navigateToScreen("tasks");
    } catch (error) {
      showErrorToast(error, "create task from leak");
    } finally {
      setActionLeakId(null);
    }
  };

  const convertLeakToRitual = async (leak: LeakEntity) => {
    if (!userId || actionLeakId) return;

    setActionLeakId(leak.id);
    try {
      const response = await fetch("/api/rituals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
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
      navigateToScreen("rituals");
    } catch (error) {
      showErrorToast(error, "create ritual from leak");
    } finally {
      setActionLeakId(null);
    }
  };

  const convertLeakToChallenge = async (leak: LeakEntity) => {
    if (!userId || actionLeakId) return;

    setActionLeakId(leak.id);
    try {
      const response = await fetch("/api/challenges/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
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
      navigateToScreen("challenges");
    } catch (error) {
      showErrorToast(error, "create challenge from leak");
    } finally {
      setActionLeakId(null);
    }
  };

  return {
    reopenLeak,
    retryLeakPlanning,
    runGuidanceAction,
    applySelectedPlan,
    applySinglePlanAction,
    sendPlanActionFeedback,
    applyBulkFeedbackForPendingCreated,
    convertLeakToTask,
    convertLeakToRitual,
    convertLeakToChallenge,
  };
}
