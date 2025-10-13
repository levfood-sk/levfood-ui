/**
 * Send Push Notification Endpoint
 *
 * Sends push notifications to registered devices.
 */

import { fcmTokens } from './register-token.post'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)

    // Validate input
    if (!body.title || !body.message) {
      throw createError({
        statusCode: 400,
        message: 'Title and message are required',
      })
    }

    const payload = {
      title: body.title,
      body: body.message,
      icon: body.icon || '/icon.png',
      data: body.data || {},
    }

    let result

    // Send to specific token
    if (body.token) {
      result = await sendNotificationToToken(body.token, payload)
      return {
        success: true,
        message: 'Notification sent to device',
        messageId: result,
      }
    }

    // Send to topic
    if (body.topic) {
      result = await sendNotificationToTopic(body.topic, payload)
      return {
        success: true,
        message: `Notification sent to topic: ${body.topic}`,
        messageId: result,
      }
    }

    // Send to all registered tokens
    const tokens = Array.from(fcmTokens)

    if (tokens.length === 0) {
      throw createError({
        statusCode: 400,
        message: 'No registered devices found',
      })
    }

    result = await sendNotificationToTokens(tokens, payload)

    console.log('Notification sent to all devices:', {
      title: body.title,
      successCount: result.successCount,
      failureCount: result.failureCount,
      totalDevices: tokens.length,
    })

    return {
      success: true,
      message: `Notification sent to ${result.successCount} devices`,
      successCount: result.successCount,
      failureCount: result.failureCount,
      totalDevices: tokens.length,
    }
  } catch (error: any) {
    console.error('Send notification error:', error)

    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to send notification',
    })
  }
})
