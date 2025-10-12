import { getAuth, onAuthStateChanged } from 'firebase/auth'

export default defineNuxtPlugin(() => {
  const { app } = useFirebase()
  const user = useState('firebase-user', () => null)
  const loading = useState('firebase-auth-loading', () => true)

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
