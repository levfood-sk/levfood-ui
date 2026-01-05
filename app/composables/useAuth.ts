import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  OAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  type UserCredential,
} from 'firebase/auth'
import type { User } from '../lib/firebase/types'
import { mapFirebaseUser } from '../lib/firebase/types'

// Serializable user type from the plugin (avoids Firebase User reactivity issues)
interface SerializableUser {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  emailVerified: boolean
}

export const useAuth = () => {
  // Skip initialization on server
  if (import.meta.server) {
    return {
      user: computed(() => null),
      loading: computed(() => false),
      error: computed(() => null),
      isAuthenticated: computed(() => false),
      signIn: async () => ({} as UserCredential),
      signUp: async () => ({} as UserCredential),
      signInWithGoogle: async () => null,
      signInWithApple: async () => null,
      signOut: async () => {},
      getIdToken: async () => null,
      handleRedirectResult: async () => null,
    }
  }

  const auth = useFirebaseAuth()

  // Use the shared state from the firebase plugin (single source of truth)
  // This is a serialized version of the Firebase User to avoid Vue reactivity issues
  const firebaseUser = useState<SerializableUser | null>('firebase-user')
  const loading = useState<boolean>('firebase-auth-loading')

  // Local error state (shared across useAuth calls)
  const authError = useState<Error | null>('firebase-auth-error', () => null)

  // Computed user mapped to our User type
  const user = computed(() => mapFirebaseUser(firebaseUser.value))

  const signIn = async (email: string, password: string): Promise<UserCredential> => {
    authError.value = null

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password)
      return credential
    } catch (error) {
      authError.value = error as Error
      throw error
    }
  }

  const signUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ): Promise<UserCredential> => {
    authError.value = null

    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password)

      // Update profile with display name
      await updateProfile(credential.user, {
        displayName: `${firstName} ${lastName}`,
      })

      return credential
    } catch (error) {
      authError.value = error as Error
      throw error
    }
  }

  const signInWithGoogle = async (): Promise<UserCredential | null> => {
    authError.value = null

    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({
        prompt: 'select_account',
      })

      // Try popup first, fall back to redirect if popup is blocked
      try {
        const result = await signInWithPopup(auth, provider)
        console.log('[useAuth] Google popup sign-in successful:', result.user?.email)
        return result
      } catch (popupError: any) {
        // If popup was blocked or failed due to COOP, try redirect
        if (popupError.code === 'auth/popup-blocked' ||
            popupError.code === 'auth/popup-closed-by-user' ||
            popupError.message?.includes('Cross-Origin-Opener-Policy')) {
          console.log('[useAuth] Popup blocked, falling back to redirect')
          await signInWithRedirect(auth, provider)
          return null
        }
        throw popupError
      }
    } catch (error) {
      authError.value = error as Error
      throw error
    }
  }

  const signInWithApple = async (): Promise<UserCredential | null> => {
    authError.value = null

    try {
      const provider = new OAuthProvider('apple.com')
      provider.addScope('email')
      provider.addScope('name')

      // Try popup first, fall back to redirect if popup is blocked
      try {
        const result = await signInWithPopup(auth, provider)
        console.log('[useAuth] Apple popup sign-in successful:', result.user?.email)
        return result
      } catch (popupError: any) {
        // If popup was blocked or failed due to COOP, try redirect
        if (popupError.code === 'auth/popup-blocked' ||
            popupError.code === 'auth/popup-closed-by-user' ||
            popupError.message?.includes('Cross-Origin-Opener-Policy')) {
          console.log('[useAuth] Popup blocked, falling back to redirect')
          await signInWithRedirect(auth, provider)
          return null
        }
        throw popupError
      }
    } catch (error) {
      authError.value = error as Error
      throw error
    }
  }

  // Handle redirect result after returning from OAuth provider
  // Note: This is now primarily handled by the firebase.client.ts plugin
  // but we keep this for manual calls if needed
  const handleRedirectResult = async (): Promise<UserCredential | null> => {
    try {
      const result = await getRedirectResult(auth)
      if (result) {
        console.log('[useAuth] handleRedirectResult:', result.user?.email)
        return result
      }
      return null
    } catch (error) {
      authError.value = error as Error
      throw error
    }
  }

  const signOut = async (): Promise<void> => {
    authError.value = null

    try {
      await firebaseSignOut(auth)
    } catch (error) {
      authError.value = error as Error
      throw error
    }
  }

  const getIdToken = async (): Promise<string | null> => {
    if (!auth.currentUser) return null
    return await auth.currentUser.getIdToken()
  }

  return {
    user,
    loading: computed(() => loading.value),
    error: computed(() => authError.value),
    isAuthenticated: computed(() => !!firebaseUser.value),
    signIn,
    signUp,
    signInWithGoogle,
    signInWithApple,
    signOut,
    getIdToken,
    handleRedirectResult,
  }
}
