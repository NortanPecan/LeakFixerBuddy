/**
 * Shared API response types.
 *
 * Use these types on both the server (API routes) and client (fetch calls)
 * to get end-to-end type safety without duplicating type definitions.
 */

// ── Generic response wrappers ──────────────────────────────────────────────

/** Successful response with a data payload */
export interface ApiSuccess<T = unknown> {
  data: T;
  /** Optional human-readable message */
  message?: string;
}

/** Paginated list response */
export interface ApiList<T = unknown> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  hasMore: boolean;
}

/** Error response shape (mirrors ApiError.toJSON) */
export interface ApiErrorResponse {
  error: string;
  code?: string;
  /** Seconds until next retry (for 429 responses) */
  retryAfter?: number;
}

// ── Common field types ─────────────────────────────────────────────────────

export type ISO8601 = string; // e.g. "2026-03-18T10:00:00.000Z"
export type DateString = string; // e.g. "2026-03-18"
export type UserId = string;

// ── User ──────────────────────────────────────────────────────────────────

export interface UserSummary {
  id: UserId;
  name: string | null;
  firstName: string | null;
  avatarUrl: string | null;
  day: number;
  streak: number;
  points: number;
}

// ── Leak types ────────────────────────────────────────────────────────────

export type LeakType =
  | "food"
  | "sleep"
  | "gym"
  | "rituals"
  | "finance"
  | "mood"
  | "energy"
  | "water"
  | "focus"
  | "social"
  | "custom";

export type LeakSeverity = "info" | "warning" | "critical";
export type LeakStatus = "active" | "resolved" | "ignored";

export interface LeakSummary {
  id: string;
  type: LeakType;
  severity: LeakSeverity;
  status: LeakStatus;
  title: string;
  description: string | null;
  createdAt: ISO8601;
  updatedAt: ISO8601;
}

// ── Challenge types ───────────────────────────────────────────────────────

export type ChallengeStatus = "planned" | "active" | "completed" | "failed";
export type ChallengeType = "streak" | "target" | "ritual" | "tracker" | "custom";

export interface ChallengeSummary {
  id: string;
  title: string;
  type: ChallengeType;
  status: ChallengeStatus;
  daysCompleted: number;
  duration: number;
  currentStreak: number;
  progress: number; // 0–100
  startDate: ISO8601 | null;
  endDate: ISO8601 | null;
}

// ── Achievement types ─────────────────────────────────────────────────────

export interface AchievementSummary {
  id: string;
  type: string;
  label: string;
  earnedAt: ISO8601;
}

// ── AI pattern types ──────────────────────────────────────────────────────

export interface AiPatternSummary {
  leakType: string;
  analysisCount: number;
  workedCount: number;
  updatedAt: ISO8601;
}

// ── Rate limit headers ────────────────────────────────────────────────────

export interface RateLimitHeaders {
  "X-RateLimit-Limit": string;
  "X-RateLimit-Remaining": string;
  "X-RateLimit-Reset": string;
  "Retry-After"?: string;
}

// ── Utility types ─────────────────────────────────────────────────────────

/** Make all properties optional and nullable — useful for PATCH endpoints */
export type PatchBody<T> = Partial<{
  [K in keyof T]: T[K] | null;
}>;

/** Extract the inner data type from an ApiSuccess wrapper */
export type UnwrapSuccess<T> = T extends ApiSuccess<infer D> ? D : never;
