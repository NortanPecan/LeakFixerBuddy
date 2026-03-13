/**
 * Auth utilities for API routes
 * Extracts user from request headers or query params
 * 
 * NOTE: This module does NOT verify the user in database.
 * It only extracts userId from the request. The caller is responsible
 * for ensuring the userId is valid (e.g., from verified Telegram auth).
 */
import { NextRequest } from 'next/server'

/**
 * Get user ID from request
 * Supports both header-based auth (x-user-id) and query param (userId)
 * 
 * Returns the userId string or null if not found.
 * Does NOT verify the user exists in database.
 */
export function getUserId(request: NextRequest): string | null {
  // Try to get user ID from header first
  let userId = request.headers.get('x-user-id')
  
  // Fallback to query param
  if (!userId) {
    const url = new URL(request.url)
    userId = url.searchParams.get('userId')
  }
  
  return userId
}

/**
 * Get user context from request
 * This is a lightweight version that doesn't hit the database.
 * Returns userId for use in REST API calls.
 */
export async function getAuthUser(request: NextRequest): Promise<{
  id: string
} | null> {
  let userId = getUserId(request)
  
  // Fallback to body for POST/PUT requests
  if (!userId && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
    try {
      const clonedRequest = request.clone()
      const body = await clonedRequest.json()
      userId = body.userId
    } catch {
      // Body might not be JSON or might be empty
    }
  }
  
  if (!userId) {
    return null
  }
  
  // Return minimal user object with just the ID
  // The actual user data should be fetched via REST API if needed
  return { id: userId }
}
