import { getFirebaseAdmin } from '~~/server/utils/firebase-admin'
import { requireAuth, handleApiError } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const currentUser = requireAuth(event)

    const uid = getRouterParam(event, 'uid')
    if (!uid) {
      throw createError({
        statusCode: 400,
        message: 'Missing user ID'
      })
    }

    // Prevent self-deletion
    if (uid === currentUser.uid) {
      throw createError({
        statusCode: 400,
        message: 'Nemôžete odstrániť seba samého'
      })
    }

    const { auth, firestore } = getFirebaseAdmin()

    // Delete from both Firebase Auth and Firestore in parallel
    await Promise.all([
      auth.deleteUser(uid),
      firestore.collection('admin-users').doc(uid).delete()
    ])

    return {
      success: true,
      message: 'Admin user deleted successfully'
    }
  } catch (error: any) {
    return handleApiError(error, 'Failed to delete admin user')
  }
})
