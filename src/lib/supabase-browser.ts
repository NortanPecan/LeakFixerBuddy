import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseUrl, getSupabaseAnonKey } from './supabaseClient'

/**
 * Create Supabase browser client for Client Components
 * Uses environment detection (SANDBOX -> PROD fallback)
 */
export function createSupabaseBrowserClient() {
  const url = getSupabaseUrl()
  const anonKey = getSupabaseAnonKey()
  
  if (!url || !anonKey) {
    throw new Error('[Supabase] Missing URL or Anon Key. Set NEXT_PUBLIC_SUPABASE_URL_SANDBOX or NEXT_PUBLIC_SUPABASE_URL')
  }
  
  return createBrowserClient(url, anonKey)
}
