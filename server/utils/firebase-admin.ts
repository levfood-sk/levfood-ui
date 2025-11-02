import { initializeApp, cert, getApps, type App } from 'firebase-admin/app'
import { getAuth, type Auth } from 'firebase-admin/auth'

let adminApp: App
let adminAuth: Auth

export function initializeFirebaseAdmin(): void {
  if (getApps().length > 0) {
    return
  }

  const config = useRuntimeConfig()
  const serviceAccount = config.firebaseServiceAccount

  if (!serviceAccount) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is required')
  }

  try {
    const serviceAccountJson = JSON.parse(serviceAccount)

    adminApp = initializeApp({
      credential: cert(serviceAccountJson),
      projectId: config.public.firebaseProjectId,
    })

    adminAuth = getAuth(adminApp)
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error)
    throw error
  }
}

export function getFirebaseAdmin(): { app: App; auth: Auth } {
  if (!adminApp) {
    initializeFirebaseAdmin()
  }

  return {
    app: adminApp,
    auth: adminAuth,
  }
}

export async function verifyIdToken(token: string) {
  const { auth } = getFirebaseAdmin()
  return await auth.verifyIdToken(token)
}
