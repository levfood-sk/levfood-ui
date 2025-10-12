import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  onAuthStateChanged,
  type User as FirebaseUser,
  type UserCredential,
} from 'firebase/auth'
import type { User, AuthState } from '~/lib/firebase/types'
import { mapFirebaseUser } from '~/lib/firebase/types'

const authState = reactive<AuthState>({
  user: null,
  loading: true,
  error: null,
})

let initialized = false

export const useAuth = () => {
  const auth = useFirebaseAuth()

  // Initialize auth state listener
  if (!initialized && import.meta.client) {
    initialized = true

    onAuthStateChanged(auth, (firebaseUser) => {
      authState.user = mapFirebaseUser(firebaseUser)
      authState.loading = false
    }, (error) => {
      authState.error = error
      authState.loading = false
    })
  }

  const signIn = async (email: string, password: string): Promise<UserCredential> => {
    authState.loading = true
    authState.error = null

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password)
      return credential
    } catch (error) {
      authState.error = error as Error
      throw error
    } finally {
      authState.loading = false
    }
  }

  const signUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ): Promise<UserCredential> => {
    authState.loading = true
    authState.error = null

    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password)

      // Update profile with display name
      await updateProfile(credential.user, {
        displayName: `${firstName} ${lastName}`,
      })

      authState.user = mapFirebaseUser(credential.user)

      return credential
    } catch (error) {
      authState.error = error as Error
      throw error
    } finally {
      authState.loading = false
    }
  }

  const signInWithGoogle = async (): Promise<UserCredential> => {
    authState.loading = true
    authState.error = null

    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({
        prompt: 'select_account'
      })

      const credential = await signInWithPopup(auth, provider)
      return credential
    } catch (error) {
      authState.error = error as Error
      throw error
    } finally {
      authState.loading = false
    }
  }

  const signInWithApple = async (): Promise<UserCredential> => {
    authState.loading = true
    authState.error = null

    try {
      const provider = new OAuthProvider('apple.com')
      provider.addScope('email')
      provider.addScope('name')

      const credential = await signInWithPopup(auth, provider)
      return credential
    } catch (error) {
      authState.error = error as Error
      throw error
    } finally {
      authState.loading = false
    }
  }

  const signOut = async (): Promise<void> => {
    authState.loading = true
    authState.error = null

    try {
      await firebaseSignOut(auth)
      authState.user = null
    } catch (error) {
      authState.error = error as Error
      throw error
    } finally {
      authState.loading = false
    }
  }

  const getIdToken = async (): Promise<string | null> => {
    if (!auth.currentUser) return null
    return await auth.currentUser.getIdToken()
  }

  return {
    user: computed(() => authState.user),
    loading: computed(() => authState.loading),
    error: computed(() => authState.error),
    isAuthenticated: computed(() => !!authState.user),
    signIn,
    signUp,
    signInWithGoogle,
    signInWithApple,
    signOut,
    getIdToken,
  }
}
