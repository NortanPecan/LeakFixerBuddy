import {
  normalizeLeak,
  normalizeLeakPolicy,
  normalizePattern,
  normalizePlans,
} from "@/features/leaks/lib/leak-normalizers";
import type {
  LeakEntity,
  LeakHint,
  LeakPattern,
  LeakPlanFeedbackResult,
  LeakPlanMode,
  LeakPolicyHint,
  LeakSeverity,
  LeakSolutionPlan,
} from "@/features/leaks/types";

type JsonRecord = Record<string, unknown>;

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  if (!response.ok) {
    throw response;
  }

  return (await response.json()) as T;
}

export interface LoadLeaksDashboardParams {
  userId: string;
  weekStart: string;
}

export interface LoadLeaksDashboardResult {
  leaks: LeakEntity[];
  signals: LeakHint[];
  patterns: LeakPattern[];
  leaksResponse: JsonRecord;
  signalsResponse: JsonRecord;
  patternsResponse: JsonRecord;
}

export async function loadLeaksDashboard({
  userId,
  weekStart,
}: LoadLeaksDashboardParams): Promise<LoadLeaksDashboardResult> {
  const [leaksResponse, signalsResponse, patternsResponse] = await Promise.all([
    requestJson<JsonRecord>(`/api/leaks?userId=${userId}&status=all&limit=100`),
    requestJson<JsonRecord>(`/api/weekly-report?userId=${userId}&weekStart=${weekStart}`),
    requestJson<JsonRecord>(`/api/ai/patterns?userId=${userId}`),
  ]);

  const leaks = Array.isArray(leaksResponse.leaks)
    ? leaksResponse.leaks.map((item) => normalizeLeak(item as LeakEntity))
    : [];
  const signals = Array.isArray(signalsResponse.leakHints)
    ? signalsResponse.leakHints.filter((item): item is LeakHint => Boolean(item))
    : [];
  const patterns = Array.isArray(patternsResponse.patterns)
    ? patternsResponse.patterns
        .map(normalizePattern)
        .filter((item): item is LeakPattern => Boolean(item))
    : [];

  return {
    leaks,
    signals,
    patterns,
    leaksResponse,
    signalsResponse,
    patternsResponse,
  };
}

export interface CreateLeakPayload {
  userId: string;
  title: string;
  description?: string | null;
  severity: LeakSeverity;
  source: "manual" | "signal" | "ai_suggested" | "imported";
  sphere?: string | null;
  contextSnapshot?: Record<string, unknown> | null;
}

export interface CreateLeakResult {
  leak: LeakEntity;
  deduped: boolean;
  raw: JsonRecord;
}

export async function createLeak(payload: CreateLeakPayload): Promise<CreateLeakResult> {
  const raw = await requestJson<JsonRecord>("/api/leaks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return {
    leak: normalizeLeak(raw.leak as LeakEntity),
    deduped: raw.deduped === true,
    raw,
  };
}

export interface UpdateLeakPayload {
  userId: string;
  id: string;
  status?: string;
  sphere?: string | null;
  title?: string;
  description?: string | null;
  contextSnapshot?: Record<string, unknown> | null;
  resolvedAt?: string | null;
}

export interface UpdateLeakResult {
  leak: LeakEntity;
  raw: JsonRecord;
}

export async function updateLeak(payload: UpdateLeakPayload): Promise<UpdateLeakResult> {
  const raw = await requestJson<JsonRecord>("/api/leaks", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return {
    leak: normalizeLeak(raw.leak as LeakEntity),
    raw,
  };
}

export async function loadLeakPlans(userId: string, leakId: string): Promise<LeakSolutionPlan[]> {
  const raw = await requestJson<JsonRecord>(`/api/leaks/${leakId}/plans?userId=${userId}`, {
    method: "GET",
  });

  return normalizePlans(raw.plans as LeakSolutionPlan[] | undefined);
}

export interface GenerateLeakPlansPayload {
  userId: string;
  mode?: LeakPlanMode;
  forceRefresh?: boolean;
}

export interface GenerateLeakPlansResult {
  plans: LeakSolutionPlan[];
  leak?: LeakEntity;
  raw: JsonRecord;
}

export async function generateLeakPlans(
  leakId: string,
  payload: GenerateLeakPlansPayload
): Promise<GenerateLeakPlansResult> {
  const raw = await requestJson<JsonRecord>(`/api/leaks/${leakId}/plans`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return {
    plans: normalizePlans(raw.plans as LeakSolutionPlan[] | undefined),
    leak: raw.leak ? normalizeLeak(raw.leak as LeakEntity) : undefined,
    raw,
  };
}

export interface SelectLeakPlanModePayload {
  userId: string;
  mode: LeakPlanMode;
}

export async function selectLeakPlanMode(
  leakId: string,
  payload: SelectLeakPlanModePayload
): Promise<LeakSolutionPlan[]> {
  const raw = await requestJson<JsonRecord>(`/api/leaks/${leakId}/plans`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return normalizePlans(raw.plans as LeakSolutionPlan[] | undefined);
}

export async function loadLeakPolicy(
  userId: string,
  leakId: string
): Promise<LeakPolicyHint | null> {
  const raw = await requestJson<JsonRecord>(`/api/leaks/${leakId}/policy?userId=${userId}`);
  return normalizeLeakPolicy(raw.policy);
}

export interface ExecuteLeakPolicyActionPayload {
  userId: string;
  actionType: string;
  targetMode?: LeakPlanMode | null;
  reason?: string | null;
  actionId?: string | null;
  policyCorrelationId?: string | null;
}

export async function executeLeakPolicyAction(
  leakId: string,
  payload: ExecuteLeakPolicyActionPayload
): Promise<JsonRecord> {
  return requestJson<JsonRecord>(`/api/leaks/${leakId}/policy/act`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export interface ConvertLeakPayload {
  userId: string;
  entityType: string;
  entityId: string;
  label: string;
  metadata?: Record<string, unknown> | null;
  sourceActionId?: string | null;
  policyCorrelationId?: string | null;
}

export async function convertLeak(
  leakId: string,
  payload: ConvertLeakPayload
): Promise<JsonRecord> {
  return requestJson<JsonRecord>(`/api/leaks/${leakId}/convert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export interface SaveLeakFeedbackPayload {
  userId: string;
  solutionActionId: string;
  solutionActionIds?: string[];
  policyCorrelationId?: string | null;
  result: LeakPlanFeedbackResult;
  comment?: string | null;
}

export async function saveLeakFeedback(
  leakId: string,
  payload: SaveLeakFeedbackPayload
): Promise<JsonRecord> {
  return requestJson<JsonRecord>(`/api/leaks/${leakId}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export interface CreateTaskFromLeakPayload {
  userId: string;
  text: string;
  zone: string;
  notes: string;
}

export async function createTaskFromLeak(payload: CreateTaskFromLeakPayload): Promise<JsonRecord> {
  return requestJson<JsonRecord>("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export interface CreateRitualFromLeakPayload {
  userId: string;
  title: string;
  category: string;
  type: string;
  days: number[];
  timeWindow: string;
  description: string;
  goalShort: string;
  attributes: string[];
}

export async function createRitualFromLeak(
  payload: CreateRitualFromLeakPayload
): Promise<JsonRecord> {
  return requestJson<JsonRecord>("/api/rituals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export interface CreateChallengeFromLeakPayload {
  userId: string;
  leakType: string;
  leakMessage: string;
}

export async function createChallengeFromLeak(
  payload: CreateChallengeFromLeakPayload
): Promise<JsonRecord> {
  return requestJson<JsonRecord>("/api/challenges/ai-generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
