import { getSourceLabel, getSphereLabel } from "@/features/leaks/lib/leak-formatters";
import type {
  FeedbackLogItem,
  LeakActionEntityType,
  LeakActionLink,
  LeakEntity,
  LeakGroupOption,
  LeakPattern,
  LeakPlanAction,
  LeakPlanFeedback,
  LeakPlanMode,
  LeakSolutionPlan,
} from "@/features/leaks/types";

export function normalizeLookupValue(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function isLeakEntityType(value: string): value is LeakActionEntityType {
  return (
    value === "task" ||
    value === "ritual" ||
    value === "challenge" ||
    value === "content" ||
    value === "skill" ||
    value === "trait"
  );
}

export function getLeakActionMetadata(action: LeakActionLink) {
  if (!action.metadata || typeof action.metadata !== "object" || Array.isArray(action.metadata)) {
    return null;
  }

  return action.metadata as Record<string, unknown>;
}

export function isFocusLeak(leak: LeakEntity) {
  if (
    !leak.contextSnapshot ||
    typeof leak.contextSnapshot !== "object" ||
    Array.isArray(leak.contextSnapshot)
  ) {
    return false;
  }

  return Boolean((leak.contextSnapshot as Record<string, unknown>).isFocus);
}

export function isConvertedPlanAction(action: LeakPlanAction) {
  return Boolean(action.payload?.convertedEntityId && action.payload?.convertedEntityType);
}

export function getLatestPlanFeedback(action: LeakPlanAction) {
  return action.feedbacks?.[0] || null;
}

export function getSelectedPlan(plans?: LeakSolutionPlan[]) {
  return plans?.find((plan) => plan.isSelected) || plans?.[0] || null;
}

export function getLinkedEntityForPlanAction(leak: LeakEntity, action: LeakPlanAction) {
  const byMetadata = leak.actions.find((link) => {
    const metadata = getLeakActionMetadata(link);
    return metadata?.sourceActionId === action.id;
  });

  if (byMetadata) return byMetadata;

  const convertedEntityId =
    typeof action.payload?.convertedEntityId === "string" ? action.payload.convertedEntityId : null;
  const convertedEntityType =
    typeof action.payload?.convertedEntityType === "string"
      ? action.payload.convertedEntityType
      : null;

  if (!convertedEntityId || !convertedEntityType || !isLeakEntityType(convertedEntityType)) {
    return null;
  }

  return (
    leak.actions.find(
      (link) => link.entityId === convertedEntityId && link.entityType === convertedEntityType
    ) || null
  );
}

export function getFeedbackByActionId(plans?: LeakSolutionPlan[]) {
  const map = new Map<string, LeakPlanFeedback>();
  plans?.forEach((plan) => {
    plan.actions.forEach((action) => {
      const latest = getLatestPlanFeedback(action);
      if (!latest) return;

      const existing = map.get(action.id);
      if (
        !existing ||
        new Date(latest.updatedAt).getTime() > new Date(existing.updatedAt).getTime()
      ) {
        map.set(action.id, latest);
      }
    });
  });

  return map;
}

export function getPlanActionById(plans?: LeakSolutionPlan[]) {
  const map = new Map<string, LeakPlanAction>();
  plans?.forEach((plan) => {
    plan.actions.forEach((action) => {
      map.set(action.id, action);
    });
  });

  return map;
}

export function getPatternLinkTypeForLeak(
  pattern: LeakPattern,
  leak: LeakEntity
): "exact" | "fuzzy" | "none" {
  const fromActiveLeak = pattern.activeLeaks?.find((item) => item.id === leak.id);
  if (fromActiveLeak?.matchType === "exact" || fromActiveLeak?.matchType === "fuzzy") {
    return fromActiveLeak.matchType;
  }

  const patternKey = normalizeLookupValue(pattern.leakType);
  const leakKey = normalizeLookupValue(leak.title);
  if (!patternKey || !leakKey) return "none";
  if (patternKey === leakKey) return "exact";
  if (patternKey.includes(leakKey) || leakKey.includes(patternKey)) return "fuzzy";
  return "none";
}

export function getBestPatternForLeak(
  patterns: LeakPattern[],
  leak: LeakEntity
): LeakPattern | null {
  if (!patterns.length) return null;

  const exact = patterns.find((pattern) => getPatternLinkTypeForLeak(pattern, leak) === "exact");
  if (exact) return exact;

  const fuzzy = patterns.find((pattern) => getPatternLinkTypeForLeak(pattern, leak) === "fuzzy");
  return fuzzy || null;
}

export function getLeakFeedbackTimeline(leak: LeakEntity, plans?: LeakSolutionPlan[]) {
  const rows: Array<{
    actionId: string;
    actionTitle: string;
    actionKind: LeakPlanAction["kind"];
    result: LeakPlanFeedback["result"];
    comment: string | null;
    updatedAt: string;
    mode: LeakPlanMode;
    linkedEntity: LeakActionLink | null;
  }> = [];

  plans?.forEach((plan) => {
    plan.actions.forEach((action) => {
      const feedback = getLatestPlanFeedback(action);
      if (!feedback) return;

      rows.push({
        actionId: action.id,
        actionTitle: action.title,
        actionKind: action.kind,
        result: feedback.result,
        comment: feedback.comment,
        updatedAt: feedback.updatedAt,
        mode: plan.mode,
        linkedEntity: getLinkedEntityForPlanAction(leak, action),
      });
    });
  });

  return rows.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getFeedbackLogFromSnapshot(
  contextSnapshot?: Record<string, unknown> | null
): FeedbackLogItem[] {
  if (!contextSnapshot || typeof contextSnapshot !== "object" || Array.isArray(contextSnapshot)) {
    return [];
  }

  const raw = contextSnapshot.feedbackLog;
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item): FeedbackLogItem | null => {
      if (!item || typeof item !== "object") return null;
      const candidate = item as Record<string, unknown>;
      if (
        typeof candidate.actionTitle !== "string" ||
        typeof candidate.actionKind !== "string" ||
        typeof candidate.updatedAt !== "string"
      ) {
        return null;
      }
      if (
        candidate.result !== "worked" &&
        candidate.result !== "partially" &&
        candidate.result !== "not_worked"
      ) {
        return null;
      }

      return {
        actionId: typeof candidate.actionId === "string" ? candidate.actionId : null,
        actionTitle: candidate.actionTitle,
        actionKind: candidate.actionKind,
        mode: typeof candidate.mode === "string" ? candidate.mode : null,
        result: candidate.result,
        comment: typeof candidate.comment === "string" ? candidate.comment : null,
        policyCorrelationId:
          typeof candidate.policyCorrelationId === "string" ? candidate.policyCorrelationId : null,
        feedbackSource:
          candidate.feedbackSource === "manual" || candidate.feedbackSource === "policy"
            ? candidate.feedbackSource
            : undefined,
        attempt: typeof candidate.attempt === "number" ? Math.round(candidate.attempt) : undefined,
        updatedAt: candidate.updatedAt,
      };
    })
    .filter((item): item is FeedbackLogItem => item !== null);
}

export function getLeakFeedbackByAction(leak: LeakEntity, plans?: LeakSolutionPlan[]) {
  const rawEvents = getFeedbackLogFromSnapshot(leak.contextSnapshot);
  const grouped = new Map<
    string,
    {
      actionId: string | null;
      actionTitle: string;
      actionKind: LeakPlanAction["kind"];
      mode: LeakPlanMode | null;
      result: LeakPlanFeedback["result"];
      comment: string | null;
      policyCorrelationId: string | null;
      feedbackSource: "manual" | "policy" | null;
      updatedAt: string;
      attempts: number;
      linkedEntity: LeakActionLink | null;
    }
  >();

  const planActionsById = new Map<string, { action: LeakPlanAction; mode: LeakPlanMode }>();
  plans?.forEach((plan) => {
    plan.actions.forEach((action) => {
      planActionsById.set(action.id, { action, mode: plan.mode });
    });
  });

  rawEvents
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .forEach((item) => {
      const fallbackKey = `${item.actionKind}|${normalizeLookupValue(item.actionTitle)}`;
      const key = item.actionId || fallbackKey;
      const existing = grouped.get(key);
      const planAction = item.actionId ? planActionsById.get(item.actionId)?.action : null;
      const linkedEntity = planAction ? getLinkedEntityForPlanAction(leak, planAction) : null;

      if (!existing) {
        grouped.set(key, {
          actionId: item.actionId,
          actionTitle: item.actionTitle,
          actionKind: item.actionKind as LeakPlanAction["kind"],
          mode:
            item.mode &&
            (item.mode === "minimum" || item.mode === "base" || item.mode === "maximum")
              ? item.mode
              : item.actionId
                ? planActionsById.get(item.actionId)?.mode || null
                : null,
          result: item.result,
          comment: item.comment,
          policyCorrelationId: item.policyCorrelationId || null,
          feedbackSource: item.feedbackSource || null,
          updatedAt: item.updatedAt,
          attempts: 1,
          linkedEntity,
        });
        return;
      }

      existing.attempts += 1;
    });

  if (grouped.size === 0) {
    getLeakFeedbackTimeline(leak, plans).forEach((item) => {
      const key = item.actionId || `${item.actionKind}|${normalizeLookupValue(item.actionTitle)}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          actionId: item.actionId,
          actionTitle: item.actionTitle,
          actionKind: item.actionKind,
          mode: item.mode,
          result: item.result,
          comment: item.comment,
          policyCorrelationId: null,
          feedbackSource: null,
          updatedAt: item.updatedAt,
          attempts: 1,
          linkedEntity: item.linkedEntity,
        });
      }
    });
  }

  return Array.from(grouped.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function getLatestWorkedOutcome(leak: LeakEntity, plans?: LeakSolutionPlan[]) {
  const workedRows: Array<{
    actionTitle: string;
    actionKind: LeakPlanAction["kind"];
    mode: LeakPlanMode;
    updatedAt: string;
    linkedEntity: LeakActionLink | null;
  }> = [];

  plans?.forEach((plan) => {
    plan.actions.forEach((action) => {
      const feedback = getLatestPlanFeedback(action);
      if (!feedback || feedback.result !== "worked") return;

      workedRows.push({
        actionTitle: action.title,
        actionKind: action.kind,
        mode: plan.mode,
        updatedAt: feedback.updatedAt,
        linkedEntity: getLinkedEntityForPlanAction(leak, action),
      });
    });
  });

  workedRows.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return workedRows[0] || null;
}

export function getLeakGroupKey(leak: LeakEntity, groupBy: LeakGroupOption) {
  if (groupBy === "sphere") {
    return leak.sphere || "__no_sphere__";
  }

  if (groupBy === "source") {
    return leak.source;
  }

  return "__all__";
}

export function getLeakGroupLabel(groupKey: string, groupBy: LeakGroupOption) {
  if (groupBy === "sphere") {
    return groupKey === "__no_sphere__" ? "Без сферы" : getSphereLabel(groupKey);
  }

  if (groupBy === "source") {
    return getSourceLabel(groupKey as LeakEntity["source"]);
  }

  return "Все leaks";
}
