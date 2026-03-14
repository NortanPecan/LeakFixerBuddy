/**
 * Supabase Client Configuration
 * 
 * Production-only configuration. All database operations go through Supabase PostgreSQL.
 * No local database, no sandbox mode.
 */

// ============================================
// Environment Variables Helpers
// ============================================

/**
 * Get Supabase URL
 */
export function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || ''
}

/**
 * Get Supabase Anon Key
 */
export function getSupabaseAnonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
}

/**
 * Get Supabase Service Role Key (server-side only)
 */
export function getSupabaseServiceKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || ''
}

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  return !!(getSupabaseUrl() && getSupabaseAnonKey())
}

/**
 * Check if Supabase Admin is available (service role key present)
 */
export function isSupabaseAdminAvailable(): boolean {
  return !!(getSupabaseUrl() && getSupabaseServiceKey())
}

// ============================================
// Environment Info (for debugging)
// ============================================

/**
 * Get environment info object (safe for logging, no secrets)
 */
export function getEnvironmentInfo() {
  return {
    hasSupabaseUrl: !!getSupabaseUrl(),
    hasAnonKey: !!getSupabaseAnonKey(),
    hasServiceKey: !!getSupabaseServiceKey(),
    supabaseUrlPrefix: getSupabaseUrl() ? getSupabaseUrl().substring(0, 30) + '...' : 'not set'
  }
}
