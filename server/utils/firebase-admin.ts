import { initializeApp, cert, getApps, type App } from 'firebase-admin/app'
import { getAuth, type Auth } from 'firebase-admin/auth'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'

let adminApp: App
let adminAuth: Auth
let adminFirestore: Firestore

export function initializeFirebaseAdmin(): void {
  if (getApps().length > 0) {
    return
  }

  const config = useRuntimeConfig()
  const serviceAccount = config.firebaseServiceAccount

  if (!serviceAccount) {
    const error = new Error('FIREBASE_SERVICE_ACCOUNT environment variable is required. Please set it in your Vercel environment variables.')
    console.error('Firebase Admin initialization error:', error.message)
    throw error
  }

  try {
    const serviceAccountJson = typeof serviceAccount === 'string' 
      ? JSON.parse(serviceAccount) 
      : serviceAccount

    if (!config.public.firebaseProjectId) {
      throw new Error('FIREBASE_PROJECT_ID environment variable is required')
    }

    adminApp = initializeApp({
      credential: cert(serviceAccountJson),
      projectId: config.public.firebaseProjectId,
    })

    adminAuth = getAuth(adminApp)
    adminFirestore = getFirestore(adminApp)
  } catch (error: any) {
    console.error('Failed to initialize Firebase Admin:', error)
    if (error.message?.includes('JSON')) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT must be a valid JSON string. Please check your Vercel environment variable.')
    }
    throw error
  }
}

export function getFirebaseAdmin(): { app: App; auth: Auth; firestore: Firestore } {
  if (!adminApp) {
    initializeFirebaseAdmin()
  }

  return {
    app: adminApp,
    auth: adminAuth,
    firestore: adminFirestore,
  }
}

export async function verifyIdToken(token: string) {
  try {
    const { auth } = getFirebaseAdmin()
    return await auth.verifyIdToken(token)
  } catch (error: any) {
    // If Firebase Admin isn't initialized, provide a clearer error
    if (error.message?.includes('FIREBASE_SERVICE_ACCOUNT') || !adminAuth) {
      throw new Error('Firebase Admin SDK not initialized. FIREBASE_SERVICE_ACCOUNT environment variable is required.')
    }
    throw error
  }
}
