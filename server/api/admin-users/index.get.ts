import { getFirebaseAdmin } from '~~/server/utils/firebase-admin'
import { requireAuth, handleApiError } from '~~/server/utils/auth'
import type { AdminUser } from '~~/app/lib/types/admin'

export default defineEventHandler(async (event) => {
  try {
    requireAuth(event)

    const { firestore } = getFirebaseAdmin()
    const snapshot = await firestore.collection('admin-users').orderBy('createdAt', 'desc').get()

    const adminUsers: AdminUser[] = []
    snapshot.forEach((doc) => {
      adminUsers.push(doc.data() as AdminUser)
    })

    return {
      success: true,
      adminUsers
    }
  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch admin users')
  }
})
