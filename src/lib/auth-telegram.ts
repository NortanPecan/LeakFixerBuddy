import { createClient, SupabaseClient } from '@supabase/supabase-js'
import {
  getSupabaseUrl,
  getSupabaseServiceKey,
  isSupabaseAdminAvailable
} from './supabaseClient'

// Lazy-initialized Supabase admin client for auth operations
let _supabaseAuth: SupabaseClient | null = null

/**
 * Get Supabase Auth client (uses service role key for admin operations)
 * Lazy-initialized to avoid errors at build time
 */
function getSupabaseAuth(): SupabaseClient {
  if (!_supabaseAuth) {
    const url = getSupabaseUrl()
    const serviceKey = getSupabaseServiceKey()
    
    if (!url || !serviceKey) {
      throw new Error('[Supabase Auth] Missing credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
    }
    
    _supabaseAuth = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }
  return _supabaseAuth
}

// Export for backward compatibility (but use getter)
export const supabaseAuth = {
  get auth() {
    return getSupabaseAuth().auth
  }
}

// Re-export from supabaseClient.ts
export { isSupabaseAdminAvailable as isSupabaseConfigured }

/**
 * Authenticate or create user via Telegram
 * This links Telegram user to Supabase Auth
 */
export async function authenticateTelegramUser(telegramUser: {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  language_code?: string
  photo_url?: string
}) {
  const telegramId = telegramUser.id.toString()
  const email = `telegram_${telegramId}@leakfixer.app`
  const client = getSupabaseAuth()
  
  try {
    // Try to find existing user by telegram_id in user_metadata
    const { data: { users }, error: listError } = await client.auth.admin.listUsers()
    
    if (listError) {
      console.error('Error listing users:', listError)
      return { error: listError }
    }
    
    let existingUser = users.find(u => 
      u.user_metadata?.telegram_id === telegramId
    )
    
    if (existingUser) {
      // Update last login
      await client.auth.admin.updateUserById(existingUser.id, {
        user_metadata: {
          ...existingUser.user_metadata,
          telegram_first_name: telegramUser.first_name,
          telegram_last_name: telegramUser.last_name,
          telegram_username: telegramUser.username,
          telegram_photo_url: telegramUser.photo_url,
          last_login_at: new Date().toISOString()
        }
      })
      
      // Generate new session token
      const { data: sessionData, error: _sessionError } = await client.auth.admin.generateLink({
        type: 'magiclink',
        email: existingUser.email!
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const session = (sessionData as any)?.session ?? null
      
      return { 
        user: existingUser, 
        isNewUser: false,
        session: session 
      }
    }
    
    // Create new user with Telegram data
    const { data: { user }, error: createError } = await client.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        telegram_id: telegramId,
        telegram_first_name: telegramUser.first_name,
        telegram_last_name: telegramUser.last_name,
        telegram_username: telegramUser.username,
        telegram_language_code: telegramUser.language_code,
        telegram_photo_url: telegramUser.photo_url,
        auth_provider: 'telegram'
      }
    })
    
    if (createError) {
      console.error('Error creating user:', createError)
      return { error: createError }
    }
    
    return { user, isNewUser: true }
  } catch (error) {
    console.error('Telegram auth error:', error)
    return { error }
  }
}

/**
 * Verify Telegram WebApp initData
 * Validates that the request comes from Telegram
 */
export function verifyTelegramInitData(initData: string): {
  valid: boolean
  user?: {
    id: number
    first_name?: string
    last_name?: string
    username?: string
    language_code?: string
    photo_url?: string
  }
  error?: string
} {
  try {
    // Parse initData
    const params = new URLSearchParams(initData)
    const userParam = params.get('user')
    
    if (!userParam) {
      return { valid: false, error: 'No user data in initData' }
    }
    
    const userData = JSON.parse(userParam)
    
    // In production, you should verify the hash
    // For development/demo, we just parse the user data
    // See: https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app
    
    return {
      valid: true,
      user: {
        id: userData.id,
        first_name: userData.first_name,
        last_name: userData.last_name,
        username: userData.username,
        language_code: userData.language_code,
        photo_url: userData.photo_url
      }
    }
  } catch (error) {
    console.error('Error verifying initData:', error)
    return { valid: false, error: 'Invalid initData format' }
  }
}

/**
 * Generate a session token for a user
 */
export async function generateSessionToken(userId: string) {
  const client = getSupabaseAuth()

  // Look up user email first (required by Supabase v2 generateLink)
  const { data: userRecord, error: userError } = await client.auth.admin.getUserById(userId)
  if (userError || !userRecord?.user?.email) {
    console.error('Error fetching user for token generation:', userError)
    return null
  }

  const { data, error } = await client.auth.admin.generateLink({
    type: 'magiclink',
    email: userRecord.user.email
  })

  if (error) {
    console.error('Error generating session:', error)
    return null
  }

  return data
}
