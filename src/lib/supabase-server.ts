import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { getSupabaseUrl, getSupabaseAnonKey } from './supabaseClient'

/**
 * Create Supabase server client for Server Components
 * Uses environment detection (SANDBOX -> PROD fallback)
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  const url = getSupabaseUrl()
  const anonKey = getSupabaseAnonKey()
  
  if (!url || !anonKey) {
    throw new Error('[Supabase] Missing URL or Anon Key. Set NEXT_PUBLIC_SUPABASE_URL_SANDBOX or NEXT_PUBLIC_SUPABASE_URL')
  }
  
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}

/**
 * Create Supabase client for API routes (req/res pattern)
 * Uses environment detection (SANDBOX -> PROD fallback)
 */
export function createSupabaseReqResClient(req: NextRequest, res: Response) {
  const url = getSupabaseUrl()
  const anonKey = getSupabaseAnonKey()
  
  if (!url || !anonKey) {
    throw new Error('[Supabase] Missing URL or Anon Key. Set NEXT_PUBLIC_SUPABASE_URL_SANDBOX or NEXT_PUBLIC_SUPABASE_URL')
  }
  
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
      },
    },
  })
}
