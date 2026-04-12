/**
 * Supabase REST API Client
 *
 * Использует PostgREST API напрямую через fetch
 * Для работы необходимы переменные окружения:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY (для server-side операций)
 */

import { getSupabaseUrl, getSupabaseServiceKey } from "./supabaseClient";

// ============================================
// Types
// ============================================

export interface SupabaseRestError {
  code: string;
  message: string;
  details: string | null;
  hint: string | null;
}

export interface SupabaseRestResponse<T> {
  data: T | null;
  error: SupabaseRestError | null;
}

// ============================================
// REST Client
// ============================================

/**
 * Get headers for Supabase REST API requests
 */
function getHeaders(): HeadersInit {
  const url = getSupabaseUrl();
  const serviceKey = getSupabaseServiceKey();

  if (!url || !serviceKey) {
    throw new Error("Supabase URL or Service Key not configured");
  }

  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

/**
 * Get the base URL for REST API
 */
function getRestUrl(): string {
  const baseUrl = getSupabaseUrl();
  if (!baseUrl) {
    throw new Error("Supabase URL not configured");
  }
  return `${baseUrl}/rest/v1`;
}

// ============================================
// Query Builder
// ============================================

export class SupabaseQueryBuilder<T> {
  private table: string;
  private _select: string = "*";
  private _filters: string[] = [];
  private _order: string = "";
  private _limit: string = "";
  private _offset: string = "";
  private _single: boolean = false;

  constructor(table: string) {
    this.table = table;
  }

  /**
   * Select specific columns
   */
  select(columns: string): this {
    this._select = columns;
    return this;
  }

  /**
   * Filter by equality
   */
  eq(column: string, value: string | number | boolean): this {
    this._filters.push(`${column}=eq.${encodeURIComponent(String(value))}`);
    return this;
  }

  /**
   * Filter by inequality
   */
  neq(column: string, value: string | number | boolean): this {
    this._filters.push(`${column}=neq.${encodeURIComponent(String(value))}`);
    return this;
  }

  /**
   * Filter by greater than
   */
  gt(column: string, value: number): this {
    this._filters.push(`${column}=gt.${value}`);
    return this;
  }

  /**
   * Filter by less than
   */
  lt(column: string, value: number): this {
    this._filters.push(`${column}=lt.${value}`);
    return this;
  }

  /**
   * Filter by IN operator
   */
  in(column: string, values: (string | number)[]): this {
    const encoded = values.map((v) => encodeURIComponent(String(v))).join(",");
    this._filters.push(`${column}=in.(${encoded})`);
    return this;
  }

  /**
   * Filter by IS NULL
   */
  isNull(column: string): this {
    this._filters.push(`${column}=is.null`);
    return this;
  }

  /**
   * Filter by IS NOT NULL
   */
  isNotNull(column: string): this {
    this._filters.push(`${column}=not.is.null`);
    return this;
  }

  /**
   * Order results
   */
  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }): this {
    const direction = options?.ascending === false ? "desc" : "asc";
    const nulls = options?.nullsFirst ? "nullsfirst" : "nullslast";
    this._order = `order=${column}.${direction}.${nulls}`;
    return this;
  }

  /**
   * Limit results
   */
  limit(count: number): this {
    this._limit = `limit=${count}`;
    return this;
  }

  /**
   * Offset results
   */
  offset(count: number): this {
    this._offset = `offset=${count}`;
    return this;
  }

  /**
   * Return single result
   */
  single(): this {
    this._single = true;
    return this;
  }

  /**
   * Build query string
   */
  private buildQuery(): string {
    const parts: string[] = [];

    parts.push(`select=${encodeURIComponent(this._select)}`);

    if (this._filters.length > 0) {
      parts.push(...this._filters);
    }

    if (this._order) {
      parts.push(this._order);
    }

    if (this._limit) {
      parts.push(this._limit);
    }

    if (this._offset) {
      parts.push(this._offset);
    }

    return parts.join("&");
  }

  /**
   * Execute GET request
   */
  async get(): Promise<SupabaseRestResponse<T[]>> {
    try {
      const url = `${getRestUrl()}/${this.table}?${this.buildQuery()}`;

      const response = await fetch(url, {
        method: "GET",
        headers: getHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        return { data: null, error: error as SupabaseRestError };
      }

      const data = await response.json();

      if (this._single && Array.isArray(data) && data.length === 1) {
        return { data: data as T[], error: null };
      }

      return { data: data as T[], error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: "FETCH_ERROR",
          message: String(err),
          details: null,
          hint: null,
        },
      };
    }
  }

  /**
   * Execute GET request and return single item
   */
  async getSingle<U = T>(): Promise<SupabaseRestResponse<U>> {
    this._single = true;
    const result = await this.get();

    if (result.error) {
      return { data: null, error: result.error };
    }

    if (!result.data || result.data.length === 0) {
      return {
        data: null,
        error: { code: "NOT_FOUND", message: "No results found", details: null, hint: null },
      };
    }

    return { data: result.data[0] as unknown as U, error: null };
  }

  /**
   * Insert data
   */
  async insert(data: Partial<T> | Partial<T>[]): Promise<SupabaseRestResponse<T[]>> {
    try {
      const url = `${getRestUrl()}/${this.table}?select=${encodeURIComponent(this._select)}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          ...getHeaders(),
          Prefer: "return=representation",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        return { data: null, error: error as SupabaseRestError };
      }

      const result = await response.json();
      return { data: result as T[], error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: "INSERT_ERROR",
          message: String(err),
          details: null,
          hint: null,
        },
      };
    }
  }

  /**
   * Update data
   */
  async update(data: Partial<T>): Promise<SupabaseRestResponse<T[]>> {
    try {
      if (this._filters.length === 0) {
        throw new Error("Update requires at least one filter");
      }

      const url = `${getRestUrl()}/${this.table}?${this.buildQuery()}`;

      const response = await fetch(url, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        return { data: null, error: error as SupabaseRestError };
      }

      const result = await response.json();
      return { data: result as T[], error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: "UPDATE_ERROR",
          message: String(err),
          details: null,
          hint: null,
        },
      };
    }
  }

  /**
   * Delete data
   */
  async delete(): Promise<SupabaseRestResponse<T[]>> {
    try {
      if (this._filters.length === 0) {
        throw new Error("Delete requires at least one filter");
      }

      const url = `${getRestUrl()}/${this.table}?${this.buildQuery()}`;

      const response = await fetch(url, {
        method: "DELETE",
        headers: getHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        return { data: null, error: error as SupabaseRestError };
      }

      const result = await response.json();
      return { data: result as T[], error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: "DELETE_ERROR",
          message: String(err),
          details: null,
          hint: null,
        },
      };
    }
  }

  /**
   * Upsert data (insert or update)
   */
  async upsert(
    data: Partial<T> | Partial<T>[],
    options?: { onConflict?: string }
  ): Promise<SupabaseRestResponse<T[]>> {
    try {
      const onConflict = options?.onConflict ? `&on_conflict=${options.onConflict}` : "";
      const url = `${getRestUrl()}/${this.table}?select=${encodeURIComponent(this._select)}${onConflict}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          ...getHeaders(),
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        return { data: null, error: error as SupabaseRestError };
      }

      const result = await response.json();
      return { data: result as T[], error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: "UPSERT_ERROR",
          message: String(err),
          details: null,
          hint: null,
        },
      };
    }
  }
}

// ============================================
// Table Helpers
// ============================================

/**
 * Create a query builder for a table
 */
export function from<T>(table: string): SupabaseQueryBuilder<T> {
  return new SupabaseQueryBuilder<T>(table);
}

// ============================================
// Convenience Functions for Journey
// ============================================

import type {
  JourneyLesson,
  JourneyProgress,
  JourneyTask,
  JourneyUnlock,
  JourneyAchievement,
} from "./database.types";

/**
 * Journey Lessons Table
 */
export const journeyLessons = () => from<JourneyLesson>("journey_lessons");

/**
 * Journey Progress Table
 */
export const journeyProgress = () => from<JourneyProgress>("journey_progress");

/**
 * Journey Tasks Table
 */
export const journeyTasks = () => from<JourneyTask>("journey_tasks");

/**
 * Journey Unlocks Table
 */
export const journeyUnlocks = () => from<JourneyUnlock>("journey_unlocks");

/**
 * Journey Achievements Table
 */
export const journeyAchievements = () => from<JourneyAchievement>("journey_achievements");
