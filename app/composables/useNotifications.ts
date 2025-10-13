/**
 * Firebase Cloud Messaging Composable
 *
 * Handles push notifications setup, permissions, and token management
 */

import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging'

interface NotificationState {
  token: string | null
  permission: NotificationPermission
  supported: boolean
  loading: boolean
  error: string | null
}

const notificationState = reactive<NotificationState>({
  token: null,
  permission: 'default',
  supported: false,
  loading: false,
  error: null,
})

export const useNotifications = () => {
  // Skip on server
  if (import.meta.server) {
    return {
      token: computed(() => null),
      permission: computed(() => 'default' as NotificationPermission),
      supported: computed(() => false),
      loading: computed(() => false),
      error: computed(() => null),
      requestPermission: async () => false,
      onMessageReceived: () => {},
    }
  }

  const config = useRuntimeConfig()
  const toast = useToast()

  // Check if notifications are supported
  notificationState.supported = 'Notification' in window && 'serviceWorker' in navigator

  /**
   * Request notification permission and get FCM token
   */
  const requestPermission = async (): Promise<boolean> => {
    if (!notificationState.supported) {
      notificationState.error = 'Notifications are not supported in this browser'
      return false
    }

    notificationState.loading = true
    notificationState.error = null

    try {
      // Request permission
      const permission = await Notification.requestPermission()
      notificationState.permission = permission

      if (permission !== 'granted') {
        notificationState.error = 'Notification permission denied'
        notificationState.loading = false
        return false
      }

      // Get Firebase app and messaging
      const { app } = useFirebase()
      if (!app) {
        throw new Error('Firebase not initialized')
      }

      const messaging = getMessaging(app)

      // Register service worker
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
      await navigator.serviceWorker.ready

      // Send Firebase config to service worker
      if (registration.active) {
        registration.active.postMessage({
          type: 'FIREBASE_CONFIG',
          config: {
            apiKey: config.public.firebaseApiKey,
            authDomain: config.public.firebaseAuthDomain,
            projectId: config.public.firebaseProjectId,
            storageBucket: config.public.firebaseStorageBucket,
            messagingSenderId: config.public.firebaseMessagingSenderId,
            appId: config.public.firebaseAppId,
          },
        })
      }

      // Get FCM token with VAPID key
      const vapidKey = config.public.firebaseVapidKey
      if (!vapidKey) {
        throw new Error('VAPID key not configured')
      }

      const token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      })

      if (token) {
        notificationState.token = token
        console.log('FCM Token:', token)

        // Send token to server to save it
        await $fetch('/api/notifications/register-token', {
          method: 'POST',
          body: { token },
        })

        toast.add({
          title: 'Notifications enabled',
          description: 'You will now receive push notifications',
          color: 'success',
        })

        return true
      } else {
        throw new Error('No FCM token available')
      }
    } catch (error: any) {
      console.error('Notification permission error:', error)
      notificationState.error = error.message || 'Failed to enable notifications'

      toast.add({
        title: 'Notification error',
        description: notificationState.error,
        color: 'error',
      })

      return false
    } finally {
      notificationState.loading = false
    }
  }

  /**
   * Listen for foreground messages
   */
  const onMessageReceived = (callback: (payload: any) => void) => {
    if (!notificationState.supported) return

    const { app } = useFirebase()
    if (!app) return

    const messaging = getMessaging(app)

    // Handle messages when app is in foreground
    onMessage(messaging, (payload) => {
      console.log('Foreground message received:', payload)

      // Show toast notification
      toast.add({
        title: payload.notification?.title || 'New Notification',
        description: payload.notification?.body || '',
        icon: 'i-heroicons-bell',
        color: 'primary',
        timeout: 5000,
      })

      // Call custom callback
      callback(payload)
    })
  }

  return {
    token: computed(() => notificationState.token),
    permission: computed(() => notificationState.permission),
    supported: computed(() => notificationState.supported),
    loading: computed(() => notificationState.loading),
    error: computed(() => notificationState.error),
    requestPermission,
    onMessageReceived,
  }
}
