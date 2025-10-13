/**
 * Firebase Cloud Messaging Server Utilities
 *
 * Handles sending push notifications via Firebase Admin SDK
 */

import { getMessaging } from 'firebase-admin/messaging'
import { getFirebaseAdmin } from './firebase-admin'

export interface NotificationPayload {
  title: string
  body: string
  icon?: string
  data?: Record<string, string>
}

export interface SendNotificationOptions {
  token?: string
  tokens?: string[]
  topic?: string
  payload: NotificationPayload
}

/**
 * Send notification to specific device token
 */
export async function sendNotificationToToken(
  token: string,
  payload: NotificationPayload
): Promise<string> {
  const admin = getFirebaseAdmin()
  const messaging = getMessaging(admin)

  const message = {
    notification: {
      title: payload.title,
      body: payload.body,
      imageUrl: payload.icon,
    },
    data: payload.data || {},
    token,
  }

  const response = await messaging.send(message)
  console.log('Notification sent to token:', response)
  return response
}

/**
 * Send notification to multiple device tokens
 */
export async function sendNotificationToTokens(
  tokens: string[],
  payload: NotificationPayload
): Promise<any> {
  const admin = getFirebaseAdmin()
  const messaging = getMessaging(admin)

  const message = {
    notification: {
      title: payload.title,
      body: payload.body,
      imageUrl: payload.icon,
    },
    data: payload.data || {},
    tokens,
  }

  const response = await messaging.sendEachForMulticast(message)
  console.log('Notifications sent to tokens:', {
    successCount: response.successCount,
    failureCount: response.failureCount,
  })

  return response
}

/**
 * Send notification to a topic
 */
export async function sendNotificationToTopic(
  topic: string,
  payload: NotificationPayload
): Promise<string> {
  const admin = getFirebaseAdmin()
  const messaging = getMessaging(admin)

  const message = {
    notification: {
      title: payload.title,
      body: payload.body,
      imageUrl: payload.icon,
    },
    data: payload.data || {},
    topic,
  }

  const response = await messaging.send(message)
  console.log('Notification sent to topic:', topic, response)
  return response
}

/**
 * Subscribe tokens to a topic
 */
export async function subscribeToTopic(
  tokens: string[],
  topic: string
): Promise<void> {
  const admin = getFirebaseAdmin()
  const messaging = getMessaging(admin)

  const response = await messaging.subscribeToTopic(tokens, topic)
  console.log('Tokens subscribed to topic:', topic, {
    successCount: response.successCount,
    failureCount: response.failureCount,
  })
}

/**
 * Unsubscribe tokens from a topic
 */
export async function unsubscribeFromTopic(
  tokens: string[],
  topic: string
): Promise<void> {
  const admin = getFirebaseAdmin()
  const messaging = getMessaging(admin)

  const response = await messaging.unsubscribeFromTopic(tokens, topic)
  console.log('Tokens unsubscribed from topic:', topic, {
    successCount: response.successCount,
    failureCount: response.failureCount,
  })
}
