import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence, getRedirectResult, type User } from 'firebase/auth'

// Serializable user data to avoid Vue reactivity issues with Firebase User object
interface SerializableUser {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  emailVerified: boolean
}

function serializeUser(user: User | null): SerializableUser | null {
  if (!user) return null
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    emailVerified: user.emailVerified,
  }
}

export default defineNuxtPlugin(async () => {
  const { app } = useFirebase()
  const user = useState<SerializableUser | null>('firebase-user', () => null)
  const loading = useState<boolean>('firebase-auth-loading', () => true)

  if (app) {
    const auth = getAuth(app)

    // Enable local persistence for auth state
    try {
      await setPersistence(auth, browserLocalPersistence)
    } catch (error) {
      console.error('Failed to set auth persistence:', error)
    }

    // IMPORTANT: Check for redirect result FIRST before setting up auth state listener
    // This is needed for OAuth redirect flows (Google/Apple sign-in)
    try {
      const redirectResult = await getRedirectResult(auth)
      if (redirectResult) {
        console.log('[Firebase Plugin] Redirect result processed:', redirectResult.user?.email)
        // The user will be picked up by onAuthStateChanged below
      }
    } catch (error: any) {
      // Don't throw on redirect errors, just log them
      // Common error: "auth/popup-closed-by-user" or similar
      if (error?.code !== 'auth/popup-closed-by-user') {
        console.error('[Firebase Plugin] Redirect result error:', error)
      }
    }

    // Set up auth state observer and wait for initial state
    await new Promise<void>((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        console.log('[Firebase Plugin] Auth state changed:', firebaseUser?.email || 'no user')
        // Store serialized user data to avoid Vue reactivity issues with Firebase internals
        user.value = serializeUser(firebaseUser)
        loading.value = false
        resolve()
      }, (error) => {
        console.error('Auth state change error:', error)
        loading.value = false
        resolve()
      })

      // Cleanup on plugin unmount
      return unsubscribe
    })
  } else {
    loading.value = false
  }

  return {
    provide: {
      firebase: app,
    }
  }
})
