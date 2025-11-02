import type { H3Event } from 'h3'

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
 */
export function handleApiError(error: any, defaultMessage: string) {
  console.error(defaultMessage, error)

  if (error.statusCode) {
    throw error
  }

  throw createError({
    statusCode: 500,
    message: error.message || defaultMessage
  })
}
