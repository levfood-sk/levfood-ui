// Firebase Cloud Messaging Service Worker
// This service worker handles background notifications

importScripts('https://www.gstatic.com/firebasejs/11.0.2/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/11.0.2/firebase-messaging-compat.js')

// Initialize Firebase in the service worker
// Config will be injected by the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    const firebaseConfig = event.data.config

    firebase.initializeApp(firebaseConfig)
    const messaging = firebase.messaging()

    // Handle background messages
    messaging.onBackgroundMessage((payload) => {
      console.log('Received background message:', payload)

      const notificationTitle = payload.notification?.title || 'Levfood'
      const notificationOptions = {
        body: payload.notification?.body || '',
        icon: payload.notification?.icon || '/icon.png',
        badge: '/badge.png',
        tag: payload.data?.tag || 'default',
        data: payload.data,
      }

      self.registration.showNotification(notificationTitle, notificationOptions)
    })
  }
})
