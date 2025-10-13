/**
 * Notifications Plugin
 *
 * Automatically sets up notification listeners when the app loads.
 */

export default defineNuxtPlugin(() => {
  const { onMessageReceived, permission } = useNotifications()

  // Set up message listener for foreground notifications
  if (permission.value === 'granted') {
    onMessageReceived((payload) => {
      console.log('Notification received in plugin:', payload)
    })
  }
})
