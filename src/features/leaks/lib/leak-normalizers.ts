import type {
  AdaptiveModeHint,
  ContextDriftHint,
  ExecutionScoreHint,
  LeakEntity,
  LeakPattern,
  LeakPatternActiveLeak,
  LeakPatternSolution,
  LeakPlanAction,
  LeakPlanMode,
  LeakPolicyFunnel,
  LeakPolicyHint,
  LeakPolicyJournalEvent,
  LeakPolicyLearningSignals,
  LeakPolicyStuckOverview,
  LeakPolicySummary,
  LeakSolutionPlan,
  NextBestActionFactor,
  NextBestActionHint,
} from "@/features/leaks/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normalizeLeak(rawLeak: LeakEntity): LeakEntity {
  return {
    ...rawLeak,
    actions: Array.isArray(rawLeak.actions) ? rawLeak.actions : [],
    contextSnapshot:
      rawLeak.contextSnapshot && typeof rawLeak.contextSnapshot === "object"
        ? rawLeak.contextSnapshot
        : null,
  };
}

function normalizePlanAction(action: LeakPlanAction): LeakPlanAction {
  return {
    ...action,
    payload:
      action.payload && typeof action.payload === "object" && !Array.isArray(action.payload)
        ? action.payload
        : null,
    feedbacks: Array.isArray(action.feedbacks) ? action.feedbacks : [],
  };
}

export function normalizePlan(rawPlan: LeakSolutionPlan): LeakSolutionPlan {
  return {
    ...rawPlan,
    actions: Array.isArray(rawPlan.actions) ? rawPlan.actions.map(normalizePlanAction) : [],
  };
}

export function normalizePlans(rawPlans: LeakSolutionPlan[] | null | undefined) {
  return Array.isArray(rawPlans) ? rawPlans.map(normalizePlan) : [];
}

function normalizePatternSolution(item: unknown): LeakPatternSolution | null {
  if (!isRecord(item)) return null;
  if (typeof item.text !== "string" || !item.text.trim()) return null;

  const result = item.result;
  return {
    text: item.text.trim(),
    worked: typeof item.worked === "boolean" ? item.worked : null,
    result:
      result === "worked" || result === "partially" || result === "not_worked" ? result : undefined,
    comment: typeof item.comment === "string" ? item.comment : null,
    updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : null,
    sourceActionKind: typeof item.sourceActionKind === "string" ? item.sourceActionKind : null,
    sourcePlanMode: typeof item.sourcePlanMode === "string" ? item.sourcePlanMode : null,
    linkedEntityType: typeof item.linkedEntityType === "string" ? item.linkedEntityType : null,
    linkedEntityLabel: typeof item.linkedEntityLabel === "string" ? item.linkedEntityLabel : null,
  };
}

function normalizePatternActiveLeak(item: unknown): LeakPatternActiveLeak | null {
  if (!isRecord(item)) return null;
  if (
    typeof item.id !== "string" ||
    typeof item.title !== "string" ||
    typeof item.status !== "string" ||
    typeof item.updatedAt !== "string"
  ) {
    return null;
  }

  return {
    id: item.id,
    title: item.title,
    status: item.status,
    updatedAt: item.updatedAt,
    matchType:
      item.matchType === "exact" || item.matchType === "fuzzy" ? item.matchType : undefined,
  };
}

export function normalizePattern(rawPattern: unknown): LeakPattern | null {
  if (!isRecord(rawPattern)) return null;
  if (typeof rawPattern.leakType !== "string" || !rawPattern.leakType.trim()) return null;

  const triedSolutions = Array.isArray(rawPattern.triedSolutions)
    ? rawPattern.triedSolutions
        .map(normalizePatternSolution)
        .filter((item): item is LeakPatternSolution => Boolean(item))
    : [];

  const fallbackWorkedExamples = triedSolutions
    .filter((item) => item.result === "worked" || item.worked === true)
    .slice(0, 6);

  const workedExamples = Array.isArray(rawPattern.workedExamples)
    ? rawPattern.workedExamples
        .map(normalizePatternSolution)
        .filter((item): item is LeakPatternSolution => Boolean(item))
    : fallbackWorkedExamples;

  return {
    leakType: rawPattern.leakType.trim(),
    analysisCount: typeof rawPattern.analysisCount === "number" ? rawPattern.analysisCount : 0,
    whatWorked: Array.isArray(rawPattern.whatWorked)
      ? rawPattern.whatWorked.filter((item): item is string => typeof item === "string")
      : [],
    linkType:
      rawPattern.linkType === "exact" ||
      rawPattern.linkType === "fuzzy" ||
      rawPattern.linkType === "none"
        ? rawPattern.linkType
        : undefined,
    triedSolutions,
    workedCount:
      typeof rawPattern.workedCount === "number"
        ? rawPattern.workedCount
        : triedSolutions.filter((item) => item.result === "worked").length,
    partialCount:
      typeof rawPattern.partialCount === "number"
        ? rawPattern.partialCount
        : triedSolutions.filter((item) => item.result === "partially").length,
    failedCount:
      typeof rawPattern.failedCount === "number"
        ? rawPattern.failedCount
        : triedSolutions.filter((item) => item.result === "not_worked").length,
    clusterKey: typeof rawPattern.clusterKey === "string" ? rawPattern.clusterKey : undefined,
    clusterLabel: typeof rawPattern.clusterLabel === "string" ? rawPattern.clusterLabel : undefined,
    clusterSize: typeof rawPattern.clusterSize === "number" ? rawPattern.clusterSize : undefined,
    clusterConfidence:
      typeof rawPattern.clusterConfidence === "number" ? rawPattern.clusterConfidence : undefined,
    clusterRawConfidence:
      typeof rawPattern.clusterRawConfidence === "number"
        ? rawPattern.clusterRawConfidence
        : undefined,
    clusterConflict:
      rawPattern.clusterConflict === "none" ||
      rawPattern.clusterConflict === "mixed" ||
      rawPattern.clusterConflict === "high"
        ? rawPattern.clusterConflict
        : undefined,
    clusterConflictRatio:
      typeof rawPattern.clusterConflictRatio === "number"
        ? rawPattern.clusterConflictRatio
        : undefined,
    clusterWorkedCount:
      typeof rawPattern.clusterWorkedCount === "number" ? rawPattern.clusterWorkedCount : undefined,
    clusterPartialCount:
      typeof rawPattern.clusterPartialCount === "number"
        ? rawPattern.clusterPartialCount
        : undefined,
    clusterFailedCount:
      typeof rawPattern.clusterFailedCount === "number" ? rawPattern.clusterFailedCount : undefined,
    clusterLeakTypes: Array.isArray(rawPattern.clusterLeakTypes)
      ? rawPattern.clusterLeakTypes
          .filter((item): item is string => typeof item === "string")
          .slice(0, 8)
      : undefined,
    clusterWorkedExamples: Array.isArray(rawPattern.clusterWorkedExamples)
      ? rawPattern.clusterWorkedExamples
          .filter((item): item is string => typeof item === "string")
          .slice(0, 6)
      : undefined,
    clusterFailedExamples: Array.isArray(rawPattern.clusterFailedExamples)
      ? rawPattern.clusterFailedExamples
          .filter((item): item is string => typeof item === "string")
          .slice(0, 6)
      : undefined,
    workedExamples,
    updatedAt:
      typeof rawPattern.updatedAt === "string" ? rawPattern.updatedAt : new Date().toISOString(),
    activeLeakCount:
      typeof rawPattern.activeLeakCount === "number" ? rawPattern.activeLeakCount : undefined,
    activeLeaks: Array.isArray(rawPattern.activeLeaks)
      ? rawPattern.activeLeaks
          .map(normalizePatternActiveLeak)
          .filter((item): item is LeakPatternActiveLeak => Boolean(item))
      : undefined,
  };
}

function normalizeNextBestActionFactors(value: unknown): NextBestActionFactor[] {
  if (!Array.isArray(value)) return [];

  const factors = value
    .map((item): NextBestActionFactor | null => {
      if (!isRecord(item)) return null;
      if (typeof item.key !== "string" || typeof item.weight !== "number") return null;
      return {
        key: item.key,
        weight: item.weight,
        detail: typeof item.detail === "string" ? item.detail : undefined,
      };
    })
    .filter((item): item is NextBestActionFactor => item !== null);

  return factors.slice(0, 5);
}

export function normalizeNextBestAction(value: unknown): NextBestActionHint | null {
  if (!isRecord(value)) return null;

  const type = value.type;
  if (
    type !== "generate" &&
    type !== "create_entity" &&
    type !== "give_feedback" &&
    type !== "retry" &&
    type !== "switch_mode" &&
    type !== "regenerate_context"
  ) {
    return null;
  }

  if (typeof value.reason !== "string" || !value.reason.trim()) return null;

  const confidence =
    value.confidence === "low" || value.confidence === "medium" || value.confidence === "high"
      ? value.confidence
      : "medium";

  const targetMode: LeakPlanMode | null =
    value.targetMode === "minimum" || value.targetMode === "base" || value.targetMode === "maximum"
      ? value.targetMode
      : null;

  return {
    type,
    reason: value.reason.trim(),
    confidence,
    actionId: typeof value.actionId === "string" ? value.actionId : null,
    targetMode,
    correlationId: typeof value.correlationId === "string" ? value.correlationId : null,
    factors: normalizeNextBestActionFactors(value.factors),
  };
}

export function normalizeContextDrift(value: unknown): ContextDriftHint | null {
  if (!isRecord(value)) return null;
  if (typeof value.isStale !== "boolean" || typeof value.score !== "number") return null;

  const changedMetrics = Array.isArray(value.changedMetrics)
    ? value.changedMetrics
        .map((item) => {
          if (!isRecord(item)) return null;
          if (
            typeof item.key !== "string" ||
            typeof item.before !== "number" ||
            typeof item.now !== "number" ||
            typeof item.deltaPct !== "number"
          ) {
            return null;
          }

          return {
            key: item.key,
            before: item.before,
            now: item.now,
            deltaPct: item.deltaPct,
          };
        })
        .filter((item): item is ContextDriftHint["changedMetrics"][number] => Boolean(item))
    : [];

  return {
    isStale: value.isStale,
    score: Math.round(value.score),
    generatedAt: typeof value.generatedAt === "string" ? value.generatedAt : null,
    checkedAt: typeof value.checkedAt === "string" ? value.checkedAt : new Date().toISOString(),
    changedMetrics,
  };
}

export function normalizeExecutionScore(value: unknown): ExecutionScoreHint | null {
  if (!isRecord(value) || typeof value.value !== "number" || !isRecord(value.breakdown)) {
    return null;
  }

  return {
    value: Math.round(value.value),
    breakdown: {
      createdCoverage:
        typeof value.breakdown.createdCoverage === "number"
          ? Math.round(value.breakdown.createdCoverage)
          : 0,
      feedbackCoverage:
        typeof value.breakdown.feedbackCoverage === "number"
          ? Math.round(value.breakdown.feedbackCoverage)
          : 0,
      workedShare:
        typeof value.breakdown.workedShare === "number"
          ? Math.round(value.breakdown.workedShare)
          : 0,
      attemptsPenalty:
        typeof value.breakdown.attemptsPenalty === "number"
          ? Math.round(value.breakdown.attemptsPenalty)
          : 0,
      driftPenalty:
        typeof value.breakdown.driftPenalty === "number"
          ? Math.round(value.breakdown.driftPenalty)
          : 0,
    },
  };
}

export function normalizeAdaptiveMode(value: unknown): AdaptiveModeHint | null {
  if (!isRecord(value)) return null;
  if (
    value.targetMode !== "minimum" &&
    value.targetMode !== "base" &&
    value.targetMode !== "maximum"
  ) {
    return null;
  }
  if (typeof value.reason !== "string" || !value.reason.trim()) return null;

  return {
    targetMode: value.targetMode,
    reason: value.reason.trim(),
  };
}

function normalizePolicyJournalEvent(value: unknown): LeakPolicyJournalEvent | null {
  if (!isRecord(value)) return null;
  if (typeof value.type !== "string" || typeof value.at !== "string") return null;

  return {
    type: value.type,
    at: value.at,
    actionId: typeof value.actionId === "string" ? value.actionId : null,
    actionKind: typeof value.actionKind === "string" ? value.actionKind : null,
    note: typeof value.note === "string" ? value.note : null,
    policyCorrelationId:
      typeof value.policyCorrelationId === "string" ? value.policyCorrelationId : null,
    policyActionType: typeof value.policyActionType === "string" ? value.policyActionType : null,
    actionTitle: typeof value.actionTitle === "string" ? value.actionTitle : null,
    result: typeof value.result === "string" ? value.result : null,
    actor: typeof value.actor === "string" ? value.actor : null,
    decision: typeof value.decision === "string" ? value.decision : null,
    attempt: typeof value.attempt === "number" ? Math.round(value.attempt) : null,
    factors: normalizeNextBestActionFactors(value.factors),
  };
}

function normalizePolicyFunnel(value: unknown): LeakPolicyFunnel | null {
  if (!isRecord(value) || typeof value.correlationId !== "string") return null;

  return {
    correlationId: value.correlationId,
    suggestedAt: typeof value.suggestedAt === "string" ? value.suggestedAt : null,
    acceptedAt: typeof value.acceptedAt === "string" ? value.acceptedAt : null,
    rejectedAt: typeof value.rejectedAt === "string" ? value.rejectedAt : null,
    entityCreatedCount:
      typeof value.entityCreatedCount === "number" ? Math.round(value.entityCreatedCount) : 0,
    outcomeCount: typeof value.outcomeCount === "number" ? Math.round(value.outcomeCount) : 0,
    outcomeWorked: typeof value.outcomeWorked === "number" ? Math.round(value.outcomeWorked) : 0,
    outcomePartial: typeof value.outcomePartial === "number" ? Math.round(value.outcomePartial) : 0,
    outcomeFailed: typeof value.outcomeFailed === "number" ? Math.round(value.outcomeFailed) : 0,
    lastOutcomeAt: typeof value.lastOutcomeAt === "string" ? value.lastOutcomeAt : null,
    pendingOutcomeActionIds: Array.isArray(value.pendingOutcomeActionIds)
      ? value.pendingOutcomeActionIds.filter((item): item is string => typeof item === "string")
      : [],
    pendingOutcomeActionTitles: Array.isArray(value.pendingOutcomeActionTitles)
      ? value.pendingOutcomeActionTitles.filter((item): item is string => typeof item === "string")
      : [],
    nextPendingOutcomeActionId:
      typeof value.nextPendingOutcomeActionId === "string"
        ? value.nextPendingOutcomeActionId
        : null,
    nextPendingOutcomeActionTitle:
      typeof value.nextPendingOutcomeActionTitle === "string"
        ? value.nextPendingOutcomeActionTitle
        : null,
    stage:
      value.stage === "suggested" ||
      value.stage === "accepted" ||
      value.stage === "awaiting_feedback" ||
      value.stage === "learning" ||
      value.stage === "completed" ||
      value.stage === "rejected"
        ? value.stage
        : "suggested",
    suggestedAgeMinutes:
      typeof value.suggestedAgeMinutes === "number" ? Math.round(value.suggestedAgeMinutes) : null,
    acceptedAgeMinutes:
      typeof value.acceptedAgeMinutes === "number" ? Math.round(value.acceptedAgeMinutes) : null,
    lastOutcomeAgeMinutes:
      typeof value.lastOutcomeAgeMinutes === "number"
        ? Math.round(value.lastOutcomeAgeMinutes)
        : null,
    maxPendingOutcomeAgeMinutes:
      typeof value.maxPendingOutcomeAgeMinutes === "number"
        ? Math.round(value.maxPendingOutcomeAgeMinutes)
        : null,
    oldestPendingOutcomeActionId:
      typeof value.oldestPendingOutcomeActionId === "string"
        ? value.oldestPendingOutcomeActionId
        : null,
    oldestPendingOutcomeActionTitle:
      typeof value.oldestPendingOutcomeActionTitle === "string"
        ? value.oldestPendingOutcomeActionTitle
        : null,
    oldestPendingOutcomeAgeMinutes:
      typeof value.oldestPendingOutcomeAgeMinutes === "number"
        ? Math.round(value.oldestPendingOutcomeAgeMinutes)
        : null,
    stuckSignals: isRecord(value.stuckSignals)
      ? {
          noDecision: value.stuckSignals.noDecision === true,
          noEntityAfterAccept: value.stuckSignals.noEntityAfterAccept === true,
          pendingFeedback: value.stuckSignals.pendingFeedback === true,
          noOutcomeAfterCreate: value.stuckSignals.noOutcomeAfterCreate === true,
        }
      : {
          noDecision: false,
          noEntityAfterAccept: false,
          pendingFeedback: false,
          noOutcomeAfterCreate: false,
        },
    primaryStuckSignal:
      value.primaryStuckSignal === "pending_feedback" ||
      value.primaryStuckSignal === "no_entity_after_accept" ||
      value.primaryStuckSignal === "no_decision" ||
      value.primaryStuckSignal === "none"
        ? value.primaryStuckSignal
        : "none",
    stuckScore: typeof value.stuckScore === "number" ? Math.round(value.stuckScore) : 0,
    urgency:
      value.urgency === "low" || value.urgency === "medium" || value.urgency === "high"
        ? value.urgency
        : "low",
    urgencyReason: typeof value.urgencyReason === "string" ? value.urgencyReason : "Нет данных",
    recommendedNudge:
      value.recommendedNudge === "accept_or_reject" ||
      value.recommendedNudge === "create_entity" ||
      value.recommendedNudge === "collect_feedback" ||
      value.recommendedNudge === "none"
        ? value.recommendedNudge
        : "none",
    recommendedNudgeReason:
      typeof value.recommendedNudgeReason === "string"
        ? value.recommendedNudgeReason
        : "Нет подсказки",
    isCurrent: value.isCurrent === true,
  };
}

function normalizePolicyLearningSignals(value: unknown): LeakPolicyLearningSignals {
  if (!isRecord(value)) {
    return {
      loopHealth: 0,
      recentFeedbackCount: 0,
      recentWorkedCount: 0,
      recentPartialCount: 0,
      recentFailedCount: 0,
      topFailureReasons: [],
      failureBuckets: { time: 0, energy: 0, context: 0, complexity: 0, unknown: 0 },
      dominantFailureBucket: "unknown",
      repeatedActions: [],
      unstableActions: [],
    };
  }

  return {
    loopHealth: typeof value.loopHealth === "number" ? Math.round(value.loopHealth) : 0,
    recentFeedbackCount:
      typeof value.recentFeedbackCount === "number" ? Math.round(value.recentFeedbackCount) : 0,
    recentWorkedCount:
      typeof value.recentWorkedCount === "number" ? Math.round(value.recentWorkedCount) : 0,
    recentPartialCount:
      typeof value.recentPartialCount === "number" ? Math.round(value.recentPartialCount) : 0,
    recentFailedCount:
      typeof value.recentFailedCount === "number" ? Math.round(value.recentFailedCount) : 0,
    topFailureReasons: Array.isArray(value.topFailureReasons)
      ? value.topFailureReasons
          .map((item) => {
            if (!isRecord(item)) return null;
            if (typeof item.text !== "string" || typeof item.count !== "number") return null;
            return { text: item.text, count: Math.round(item.count) };
          })
          .filter((item): item is { text: string; count: number } => Boolean(item))
      : [],
    failureBuckets: isRecord(value.failureBuckets)
      ? {
          time:
            typeof value.failureBuckets.time === "number"
              ? Math.round(value.failureBuckets.time)
              : 0,
          energy:
            typeof value.failureBuckets.energy === "number"
              ? Math.round(value.failureBuckets.energy)
              : 0,
          context:
            typeof value.failureBuckets.context === "number"
              ? Math.round(value.failureBuckets.context)
              : 0,
          complexity:
            typeof value.failureBuckets.complexity === "number"
              ? Math.round(value.failureBuckets.complexity)
              : 0,
          unknown:
            typeof value.failureBuckets.unknown === "number"
              ? Math.round(value.failureBuckets.unknown)
              : 0,
        }
      : { time: 0, energy: 0, context: 0, complexity: 0, unknown: 0 },
    dominantFailureBucket:
      value.dominantFailureBucket === "time" ||
      value.dominantFailureBucket === "energy" ||
      value.dominantFailureBucket === "context" ||
      value.dominantFailureBucket === "complexity" ||
      value.dominantFailureBucket === "unknown"
        ? value.dominantFailureBucket
        : "unknown",
    repeatedActions: Array.isArray(value.repeatedActions)
      ? value.repeatedActions
          .map((item) => {
            if (!isRecord(item)) return null;
            if (
              typeof item.actionId !== "string" ||
              typeof item.actionTitle !== "string" ||
              typeof item.attempt !== "number"
            ) {
              return null;
            }
            return {
              actionId: item.actionId,
              actionTitle: item.actionTitle,
              attempt: Math.round(item.attempt),
            };
          })
          .filter((item): item is { actionId: string; actionTitle: string; attempt: number } =>
            Boolean(item)
          )
      : [],
    unstableActions: Array.isArray(value.unstableActions)
      ? value.unstableActions
          .map((item) => {
            if (!isRecord(item)) return null;
            if (
              typeof item.actionId !== "string" ||
              typeof item.actionTitle !== "string" ||
              typeof item.attempts !== "number"
            ) {
              return null;
            }
            return {
              actionId: item.actionId,
              actionTitle: item.actionTitle,
              attempts: Math.round(item.attempts),
              failures: typeof item.failures === "number" ? Math.round(item.failures) : 0,
              partials: typeof item.partials === "number" ? Math.round(item.partials) : 0,
              worked: typeof item.worked === "number" ? Math.round(item.worked) : 0,
              lastResult:
                item.lastResult === "worked" ||
                item.lastResult === "partially" ||
                item.lastResult === "not_worked" ||
                item.lastResult === "unknown"
                  ? item.lastResult
                  : "unknown",
              lastUpdatedAt: typeof item.lastUpdatedAt === "string" ? item.lastUpdatedAt : null,
            };
          })
          .filter((item): item is LeakPolicyLearningSignals["unstableActions"][number] =>
            Boolean(item)
          )
      : [],
  };
}

function normalizePolicyStuckOverview(value: unknown): LeakPolicyStuckOverview {
  if (!isRecord(value)) {
    return {
      totalFunnels: 0,
      high: 0,
      medium: 0,
      low: 0,
      blockedFunnels: 0,
      maxStuckScore: 0,
    };
  }

  return {
    totalFunnels: typeof value.totalFunnels === "number" ? Math.round(value.totalFunnels) : 0,
    high: typeof value.high === "number" ? Math.round(value.high) : 0,
    medium: typeof value.medium === "number" ? Math.round(value.medium) : 0,
    low: typeof value.low === "number" ? Math.round(value.low) : 0,
    blockedFunnels: typeof value.blockedFunnels === "number" ? Math.round(value.blockedFunnels) : 0,
    maxStuckScore: typeof value.maxStuckScore === "number" ? Math.round(value.maxStuckScore) : 0,
  };
}

function normalizePolicySummary(value: unknown): LeakPolicySummary | undefined {
  if (!isRecord(value)) return undefined;

  const rejectReasons = isRecord(value.rejectReasons)
    ? Object.fromEntries(
        Object.entries(value.rejectReasons).filter(
          (entry): entry is [string, number] =>
            typeof entry[0] === "string" && typeof entry[1] === "number"
        )
      )
    : {};

  return {
    currentFunnel: normalizePolicyFunnel(value.currentFunnel),
    recentFunnels: Array.isArray(value.recentFunnels)
      ? value.recentFunnels
          .map(normalizePolicyFunnel)
          .filter((item): item is LeakPolicyFunnel => Boolean(item))
      : [],
    learningSignals: normalizePolicyLearningSignals(value.learningSignals),
    stuckOverview: normalizePolicyStuckOverview(value.stuckOverview),
    accepted: typeof value.accepted === "number" ? value.accepted : 0,
    rejected: typeof value.rejected === "number" ? value.rejected : 0,
    outcomes: typeof value.outcomes === "number" ? value.outcomes : 0,
    outcomeWorked: typeof value.outcomeWorked === "number" ? value.outcomeWorked : 0,
    outcomePartial: typeof value.outcomePartial === "number" ? value.outcomePartial : 0,
    outcomeFailed: typeof value.outcomeFailed === "number" ? value.outcomeFailed : 0,
    rejectReasons,
  };
}

export function normalizeLeakPolicy(value: unknown): LeakPolicyHint | null {
  if (!isRecord(value)) return null;

  const selectedMode: LeakPlanMode | null =
    value.selectedMode === "minimum" ||
    value.selectedMode === "base" ||
    value.selectedMode === "maximum"
      ? value.selectedMode
      : null;

  return {
    policyVersion: typeof value.policyVersion === "number" ? value.policyVersion : undefined,
    computedAt: typeof value.computedAt === "string" ? value.computedAt : undefined,
    selectedMode,
    nextBestAction: normalizeNextBestAction(value.nextBestAction),
    contextDrift: normalizeContextDrift(value.contextDrift),
    executionScore: normalizeExecutionScore(value.executionScore),
    adaptiveModeSuggestion: normalizeAdaptiveMode(value.adaptiveModeSuggestion),
    runJournal: Array.isArray(value.runJournal)
      ? value.runJournal
          .map(normalizePolicyJournalEvent)
          .filter((item): item is LeakPolicyJournalEvent => Boolean(item))
      : undefined,
    summary: normalizePolicySummary(value.summary),
  };
}
