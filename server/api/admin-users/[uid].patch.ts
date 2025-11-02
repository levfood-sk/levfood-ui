import { getFirebaseAdmin } from '~~/server/utils/firebase-admin'
import { requireAuth, handleApiError } from '~~/server/utils/auth'

const VALID_ROLES = ['admin', 'manager', 'editor'] as const

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

    const { role } = await readBody(event)

    if (!role || !VALID_ROLES.includes(role)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid role'
      })
    }

    const { firestore } = getFirebaseAdmin()

    await firestore.collection('admin-users').doc(uid).update({
      role,
      updatedAt: new Date(),
      updatedBy: currentUser.uid
    })

    return {
      success: true,
      message: 'Role updated successfully'
    }
  } catch (error: any) {
    return handleApiError(error, 'Failed to update admin user')
  }
})
