/**
 * Register FCM Token Endpoint
 *
 * Saves user's FCM token for sending push notifications.
 */

// In-memory storage (For now)
const fcmTokens = new Set<string>()

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)

    if (!body.token) {
      throw createError({
        statusCode: 400,
        message: 'FCM token is required',
      })
    }

    // Store token (in production, save to database with user ID)
    fcmTokens.add(body.token)

    console.log('FCM token registered:', {
      token: body.token.substring(0, 20) + '...',
      totalTokens: fcmTokens.size,
    })

    return {
      success: true,
      message: 'Token registered successfully',
    }
  } catch (error: any) {
    console.error('Token registration error:', error)

    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to register token',
    })
  }
})

export { fcmTokens }
