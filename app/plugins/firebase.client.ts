import { getAuth, onAuthStateChanged, type User } from 'firebase/auth'

export default defineNuxtPlugin(() => {
  const { app } = useFirebase()
  const user = useState<User | null>('firebase-user', () => null)
  const loading = useState<boolean>('firebase-auth-loading', () => true)

  if (app) {
    const auth = getAuth(app)

    // Set up auth state observer
    onAuthStateChanged(auth, (firebaseUser) => {
      user.value = firebaseUser
      loading.value = false
    })
  }

  return {
    provide: {
      firebase: app,
    }
  }
})
