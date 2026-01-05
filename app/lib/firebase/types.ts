export interface User {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  firstName?: string
  lastName?: string
}

export interface AuthState {
  user: User | null
  loading: boolean
  error: Error | null
}

// Accepts either Firebase User or serialized user from plugin
interface UserLike {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
}

export function mapFirebaseUser(firebaseUser: UserLike | null): User | null {
  if (!firebaseUser) return null

  const nameParts = firebaseUser.displayName?.split(' ') || []

  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    firstName: nameParts[0] || undefined,
    lastName: nameParts.slice(1).join(' ') || undefined,
  }
}
