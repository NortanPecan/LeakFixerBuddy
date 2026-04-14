"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect, useState } from "react";
import { buildLeakGuidance, getPlanActionAnchorId } from "@/features/leaks";
import type {
  FeedbackHistoryFilter,
  LeakDraft,
  LeakEntity,
  LeakFocusFilter,
  LeakGroupOption,
  LeakPlanAction,
  LeakSortOption,
  LeakSourceFilter,
  LeakStatusFilter,
  LeakSeverity,
  LeakSolutionPlan,
} from "@/features/leaks/types";

interface UseLeakFeatureStateOptions {
  leaks: LeakEntity[];
  setStatusFilter: Dispatch<SetStateAction<LeakStatusFilter>>;
  setSourceFilter: Dispatch<SetStateAction<LeakSourceFilter>>;
  setSortOption: Dispatch<SetStateAction<LeakSortOption>>;
  setFocusFilter: Dispatch<SetStateAction<LeakFocusFilter>>;
  setGroupBy: Dispatch<SetStateAction<LeakGroupOption>>;
  setSearchQuery: (value: string) => void;
}

export function useLeakFeatureState({
  leaks,
  setStatusFilter,
  setSourceFilter,
  setSortOption,
  setFocusFilter,
  setGroupBy,
  setSearchQuery,
}: UseLeakFeatureStateOptions) {
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [severity, setSeverity] = useState<LeakSeverity>("warning");
  const [sphere, setSphere] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<LeakDraft | null>(null);
  const [updatingLeakId, setUpdatingLeakId] = useState<string | null>(null);
  const [editingLeakId, setEditingLeakId] = useState<string | null>(null);
  const [editingLeakTitle, setEditingLeakTitle] = useState("");
  const [editingLeakDescription, setEditingLeakDescription] = useState("");
  const [actionLeakId, setActionLeakId] = useState<string | null>(null);
  const [savingSignalKey, setSavingSignalKey] = useState<string | null>(null);
  const [expandedLeakId, setExpandedLeakId] = useState<string | null>(null);
  const [plansByLeak, setPlansByLeak] = useState<Record<string, LeakSolutionPlan[]>>({});
  const [loadingPlansLeakId, setLoadingPlansLeakId] = useState<string | null>(null);
  const [generatingPlansLeakId, setGeneratingPlansLeakId] = useState<string | null>(null);
  const [selectingPlanLeakId, setSelectingPlanLeakId] = useState<string | null>(null);
  const [executingPolicyLeakId, setExecutingPolicyLeakId] = useState<string | null>(null);
  const [applyingPlanLeakId, setApplyingPlanLeakId] = useState<string | null>(null);
  const [applyingPlanActionId, setApplyingPlanActionId] = useState<string | null>(null);
  const [savingFeedbackActionId, setSavingFeedbackActionId] = useState<string | null>(null);
  const [savingFeedbackLeakId, setSavingFeedbackLeakId] = useState<string | null>(null);
  const [feedbackCommentByAction, setFeedbackCommentByAction] = useState<Record<string, string>>(
    {}
  );
  const [savingPatternLeakType, setSavingPatternLeakType] = useState<string | null>(null);
  const [retryingLeakId, setRetryingLeakId] = useState<string | null>(null);
  const [focusedPlanActionId, setFocusedPlanActionId] = useState<string | null>(null);
  const [feedbackHistoryFilterByLeak, setFeedbackHistoryFilterByLeak] = useState<
    Record<string, FeedbackHistoryFilter>
  >({});

  useEffect(() => {
    if (!focusedPlanActionId) return;

    const timer = window.setTimeout(() => {
      setFocusedPlanActionId(null);
    }, 3200);

    return () => window.clearTimeout(timer);
  }, [focusedPlanActionId]);

  useEffect(() => {
    if (!expandedLeakId) return;

    const leakPlans = plansByLeak[expandedLeakId] || [];
    const expandedLeak = leaks.find((item) => item.id === expandedLeakId);
    if (!expandedLeak) return;

    const guidance = buildLeakGuidance(expandedLeak, leakPlans);
    const currentFilter = feedbackHistoryFilterByLeak[expandedLeakId] || "all";
    let timer: number | null = null;

    if (guidance.failedActions > 0 && currentFilter !== "problem") {
      timer = window.setTimeout(() => {
        setFeedbackHistoryFilterByLeak((current) => ({
          ...current,
          [expandedLeakId]: "problem",
        }));
      }, 0);
    }

    if (guidance.failedActions === 0 && currentFilter === "problem") {
      timer = window.setTimeout(() => {
        setFeedbackHistoryFilterByLeak((current) => ({
          ...current,
          [expandedLeakId]: "all",
        }));
      }, 0);
    }

    return () => {
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, [expandedLeakId, feedbackHistoryFilterByLeak, leaks, plansByLeak]);

  const hasDraft = title.trim().length > 0 || details.trim().length > 0;

  const getFeedbackCommentDraft = (action: LeakPlanAction | null | undefined) => {
    if (!action) return "";
    if (feedbackCommentByAction[action.id] !== undefined) {
      return feedbackCommentByAction[action.id];
    }

    return action.feedbacks?.[0]?.comment || "";
  };

  const getFeedbackCommentDraftByActionId = (actionId: string) => {
    if (feedbackCommentByAction[actionId] !== undefined) {
      return feedbackCommentByAction[actionId];
    }

    return "";
  };

  const focusPlanAction = (leakId: string, actionId: string) => {
    setExpandedLeakId(leakId);
    setFocusedPlanActionId(actionId);

    setTimeout(() => {
      const node = document.getElementById(getPlanActionAnchorId(leakId, actionId));
      if (node) {
        node.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 0);
  };

  const clearLeakFilters = () => {
    setStatusFilter("all");
    setSourceFilter("all");
    setSortOption("updated_desc");
    setFocusFilter("all");
    setGroupBy("none");
    setSearchQuery("");
  };

  return {
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
    feedbackCommentByAction,
    setFeedbackCommentByAction,
    savingPatternLeakType,
    setSavingPatternLeakType,
    retryingLeakId,
    setRetryingLeakId,
    focusedPlanActionId,
    setFocusedPlanActionId,
    feedbackHistoryFilterByLeak,
    setFeedbackHistoryFilterByLeak,
    hasDraft,
    getFeedbackCommentDraft,
    getFeedbackCommentDraftByActionId,
    focusPlanAction,
    clearLeakFilters,
  };
}
