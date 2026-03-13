/**
 * API Utilities for consistent error handling across the app
 *
 * Provides:
 * - Standardized error messages for network failures
 * - Toast notifications via sonner
 * - Retry logic for failed requests
 */

import { toast } from 'sonner'

export interface ApiError {
  message: string
  code?: string
  status?: number
  retry?: boolean
}

/**
 * Parse error from API response or network failure
 */
export function parseApiError(error: unknown, context?: string): ApiError {
  // Network errors (fetch failed)
  if (error instanceof TypeError && error.message === 'fetch failed') {
    return {
      message: 'Нет подключения к интернету',
      code: 'NETWORK_ERROR',
      retry: true
    }
  }

  // Response errors
  if (error instanceof Response) {
    const status = error.status
    const messages: Record<number, string> = {
      400: 'Неверные данные',
      401: 'Требуется авторизация',
      403: 'Нет доступа',
      404: 'Не найдено',
      429: 'Слишком много запросов',
      500: 'Ошибка сервера',
      502: 'Сервер недоступен',
      503: 'Сервер перегружен',
    }
    return {
      message: messages[status] || `Ошибка ${status}`,
      code: `HTTP_${status}`,
      status,
      retry: status >= 500
    }
  }

  // Error objects with message
  if (error instanceof Error) {
    // Check for common network error patterns
    if (error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError') ||
        error.message.includes('Network request failed')) {
      return {
        message: 'Нет подключения к интернету',
        code: 'NETWORK_ERROR',
        retry: true
      }
    }

    return {
      message: error.message || 'Произошла ошибка',
      retry: false
    }
  }

  // Unknown error format
  return {
    message: context ? `Ошибка: ${context}` : 'Неизвестная ошибка',
    retry: false
  }
}

/**
 * Show error toast with consistent styling
 */
export function showErrorToast(error: unknown, context?: string): ApiError {
  const apiError = parseApiError(error, context)

  toast.error(apiError.message, {
    description: apiError.retry ? 'Попробуйте позже' : undefined,
    action: apiError.retry ? {
      label: 'Повторить',
      onClick: () => window.location.reload()
    } : undefined
  })

  return apiError
}

/**
 * Show success toast
 */
export function showSuccessToast(message: string, description?: string) {
  toast.success(message, { description })
}

/**
 * Wrapper for fetch with error handling
 */
export async function apiFetch<T>(
  url: string,
  options?: RequestInit,
  context?: string
): Promise<{ data: T | null; error: ApiError | null }> {
  try {
    const response = await fetch(url, options)

    if (!response.ok) {
      const error = parseApiError(response, context)
      return { data: null, error }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (error) {
    const apiError = parseApiError(error, context)
    return { data: null, error: apiError }
  }
}

/**
 * Hook-like wrapper for API calls with toast notifications
 * Use this in components for consistent error handling
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  options?: {
    successMessage?: string
    errorContext?: string
    showToast?: boolean
  }
): Promise<{ data: T | null; error: ApiError | null }> {
  try {
    const data = await fn()

    if (options?.successMessage) {
      showSuccessToast(options.successMessage)
    }

    return { data, error: null }
  } catch (error) {
    const apiError = parseApiError(error, options?.errorContext)

    if (options?.showToast !== false) {
      showErrorToast(error, options?.errorContext)
    }

    return { data: null, error: apiError }
  }
}

/**
 * Retry a failed request with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: unknown

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Don't retry non-retryable errors
      const apiError = parseApiError(error)
      if (!apiError.retry) {
        throw error
      }

      // Wait before retrying
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}

/**
 * Check if online
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

/**
 * Get offline message
 */
export function getOfflineMessage(): string {
  return 'Нет подключения к интернету. Проверьте соединение.'
}
