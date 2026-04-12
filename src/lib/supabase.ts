import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import {
  getSupabaseUrl,
  getSupabaseAnonKey,
  getSupabaseServiceKey,
  isSupabaseConfigured,
  isSupabaseAdminAvailable,
} from "./supabaseClient";

// Lazy-initialized Supabase clients
let _supabase: SupabaseClient<Database> | null = null;
let _supabaseAdmin: SupabaseClient<Database> | null = null;

/**
 * Get Supabase client for browser/frontend usage (uses anon key)
 * Lazy-initialized to avoid errors at build time
 */
export function getSupabase(): SupabaseClient<Database> {
  if (!_supabase) {
    const url = getSupabaseUrl();
    const key = getSupabaseAnonKey();

    if (!url || !key) {
      console.warn("[Supabase] URL or Anon Key is missing. Some features may not work.");
    }

    _supabase = createClient<Database>(url, key, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    });
  }
  return _supabase;
}

/**
 * Get Supabase admin client for server-side operations (uses service role key)
 * Lazy-initialized to avoid errors at build time
 */
export function getSupabaseAdmin(): SupabaseClient<Database> | null {
  if (!_supabaseAdmin) {
    const url = getSupabaseUrl();
    const serviceKey = getSupabaseServiceKey();

    if (!url || !serviceKey) {
      console.warn("[Supabase] URL or Service Key is missing. Admin operations not available.");
      return null;
    }

    _supabaseAdmin = createClient<Database>(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _supabaseAdmin;
}

// Re-export environment helpers from supabaseClient.ts
export { isSupabaseConfigured, isSupabaseAdminAvailable };

// Legacy exports for backward compatibility (lazy proxies)
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop) {
    return getSupabase()[prop as keyof SupabaseClient<Database>];
  },
});

export const supabaseAdmin = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop) {
    const admin = getSupabaseAdmin();
    return admin ? admin[prop as keyof SupabaseClient<Database>] : null;
  },
});

// Types
export type SupabaseClientType = typeof supabase;
export type SupabaseAdminClientType = typeof supabaseAdmin;
