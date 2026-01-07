import type { H3Event } from 'h3'
import * as Sentry from '@sentry/nuxt'

/**
 * Require authentication for API endpoints
 * Throws 401 error if user is not authenticated
 */
export function requireAuth(event: H3Event) {
  const currentUser = event.context.user

  if (!currentUser) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  return currentUser
}

/**
 * Standard error handler for API endpoints
 * Captures errors in Sentry for production monitoring
 */
export function handleApiError(error: any, defaultMessage: string) {
  console.error(defaultMessage, error)

  // Capture error in Sentry with additional context
  Sentry.captureException(error, {
    extra: {
      defaultMessage,
      originalMessage: error.message,
      statusCode: error.statusCode
    }
  })

  if (error.statusCode) {
    throw error
  }

  throw createError({
    statusCode: 500,
    message: error.message || defaultMessage
  })
}
