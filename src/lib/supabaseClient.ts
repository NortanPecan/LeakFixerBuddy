/**
 * Unified Supabase Client Configuration
 * 
 * Supports two environments:
 * - SANDBOX (local development): uses *_SANDBOX env variables
 * - PROD (online/production): uses default env variables
 * 
 * Priority: SANDBOX variables -> PROD variables
 */

// ============================================
// Environment Variables Helpers
// ============================================

/**
 * Get Supabase URL with SANDBOX fallback
 * Priority: NEXT_PUBLIC_SUPABASE_URL_SANDBOX -> NEXT_PUBLIC_SUPABASE_URL
 */
export function getSupabaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL_SANDBOX ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ''
  )
}

/**
 * Get Supabase Anon Key with SANDBOX fallback
 * Priority: NEXT_PUBLIC_SUPABASE_ANON_KEY_SANDBOX -> NEXT_PUBLIC_SUPABASE_ANON_KEY
 */
export function getSupabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_SANDBOX ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  )
}

/**
 * Get Supabase Service Role Key with SANDBOX fallback
 * Priority: SUPABASE_SERVICE_ROLE_KEY_SANDBOX -> SUPABASE_SERVICE_ROLE_KEY
 */
export function getSupabaseServiceKey(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY_SANDBOX ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ''
  )
}

/**
 * Get Direct Database URL with SANDBOX fallback
 * Priority: DIRECT_DATABASE_URL_SANDBOX -> DIRECT_DATABASE_URL
 */
export function getDirectDatabaseUrl(): string {
  return (
    process.env.DIRECT_DATABASE_URL_SANDBOX ||
    process.env.DIRECT_DATABASE_URL ||
    ''
  )
}

/**
 * Get Database URL with SANDBOX fallback
 * Priority: DATABASE_URL_SANDBOX -> DATABASE_URL
 */
export function getDatabaseUrl(): string {
  return (
    process.env.DATABASE_URL_SANDBOX ||
    process.env.DATABASE_URL ||
    ''
  )
}

// ============================================
// Environment Detection
// ============================================

/**
 * Check if running in SANDBOX mode
 * Returns true if SANDBOX-specific env variables are set
 */
export function isSandboxMode(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL_SANDBOX ||
    process.env.DATABASE_URL_SANDBOX
  )
}

/**
 * Check if Supabase is configured (any environment)
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

/**
 * Get current environment name for logging/debugging
 */
export function getEnvironmentName(): 'sandbox' | 'production' | 'not_configured' {
  if (!isSupabaseConfigured()) return 'not_configured'
  return isSandboxMode() ? 'sandbox' : 'production'
}

// ============================================
// Environment Info (for debugging)
// ============================================

/**
 * Get environment info object (safe for logging, no secrets)
 */
export function getEnvironmentInfo() {
  return {
    mode: getEnvironmentName(),
    hasSupabaseUrl: !!getSupabaseUrl(),
    hasAnonKey: !!getSupabaseAnonKey(),
    hasServiceKey: !!getSupabaseServiceKey(),
    hasDatabaseUrl: !!getDatabaseUrl(),
    hasDirectUrl: !!getDirectDatabaseUrl(),
    supabaseUrlPrefix: getSupabaseUrl() ? getSupabaseUrl().substring(0, 30) + '...' : 'not set'
  }
}
