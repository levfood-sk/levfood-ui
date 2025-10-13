import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence, type User } from 'firebase/auth'

export default defineNuxtPlugin(async () => {
  const { app } = useFirebase()
  const user = useState<User | null>('firebase-user', () => null)
  const loading = useState<boolean>('firebase-auth-loading', () => true)

  if (app) {
    const auth = getAuth(app)

    // Enable local persistence for auth state
    try {
      await setPersistence(auth, browserLocalPersistence)
    } catch (error) {
      console.error('Failed to set auth persistence:', error)
    }

    // Set up auth state observer and wait for initial state
    await new Promise<void>((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        user.value = firebaseUser
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
