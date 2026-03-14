import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseUrl, getSupabaseAnonKey } from './supabaseClient'

/**
 * Create Supabase browser client for Client Components
 */
export function createSupabaseBrowserClient() {
  const url = getSupabaseUrl()
  const anonKey = getSupabaseAnonKey()
  
  if (!url || !anonKey) {
    throw new Error('[Supabase] Missing URL or Anon Key. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  
  return createBrowserClient(url, anonKey)
}
