import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  getAuth,
  type Auth,
} from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getMessaging, type Messaging } from 'firebase/messaging'

let firebaseApp: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null
let messaging: Messaging | null = null

export const useFirebase = () => {
  // Only initialize on client-side
  if (import.meta.server) {
    return {
      app: null,
      auth: null,
      db: null,
      messaging: null,
    }
  }

  const config = useRuntimeConfig()

  if (!firebaseApp) {
    firebaseApp = initializeApp({
      apiKey: config.public.firebaseApiKey,
      authDomain: config.public.firebaseAuthDomain,
      projectId: config.public.firebaseProjectId,
      storageBucket: config.public.firebaseStorageBucket,
      messagingSenderId: config.public.firebaseMessagingSenderId,
      appId: config.public.firebaseAppId,
    })

    auth = getAuth(firebaseApp)
    db = getFirestore(firebaseApp)

    // Initialize messaging only if supported
    if ('Notification' in window) {
      try {
        messaging = getMessaging(firebaseApp)
      } catch (error) {
        console.warn('Firebase Messaging not supported:', error)
      }
    }
  }

  return {
    app: firebaseApp,
    auth,
    db,
    messaging,
  }
}

export const useFirebaseAuth = () => {
  if (import.meta.server) {
    // Return a mock auth object for SSR
    return null as any
  }

  const { auth } = useFirebase()

  if (!auth) {
    throw new Error('Firebase Auth not initialized')
  }

  return auth
}

export const useFirestore = () => {
  const { db } = useFirebase()

  if (!db) {
    throw new Error('Firestore not initialized')
  }

  return db
}

export const useFirebaseMessaging = () => {
  const { messaging } = useFirebase()
  return messaging
}
