import { getFirebaseAdmin } from '~~/server/utils/firebase-admin'
import { requireAuth, handleApiError } from '~~/server/utils/auth'
import type { CreateAdminUserRequest, CreateAdminUserResponse } from '~/lib/types/admin'

const VALID_ROLES = ['admin', 'manager', 'editor'] as const
const MIN_PASSWORD_LENGTH = 6

export default defineEventHandler(async (event): Promise<CreateAdminUserResponse> => {
  try {
    const currentUser = requireAuth(event)
    const { email, password, firstName, lastName, role } = await readBody<CreateAdminUserRequest>(event)

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !role) {
      throw createError({
        statusCode: 400,
        message: 'Missing required fields'
      })
    }

    // Validate role
    if (!VALID_ROLES.includes(role)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid role'
      })
    }

    // Validate password
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw createError({
        statusCode: 400,
        message: `Heslo musí obsahovať aspoň ${MIN_PASSWORD_LENGTH} znakov`
      })
    }

    const { auth, firestore } = getFirebaseAdmin()

    // Check if email already exists
    try {
      await auth.getUserByEmail(email)
      throw createError({
        statusCode: 400,
        message: 'Užívateľ s týmto emailom už existuje'
      })
    } catch (error: any) {
      if (error.code !== 'auth/user-not-found') {
        throw error
      }
    }

    // Create Firebase Auth user
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`
    })

    // Create admin user document
    const adminUserData = {
      uid: userRecord.uid,
      email,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      role,
      createdAt: new Date(),
      createdBy: currentUser.uid
    }

    await firestore.collection('admin-users').doc(userRecord.uid).set(adminUserData)

    return {
      success: true,
      adminUser: adminUserData as any
    }
  } catch (error: any) {
    return handleApiError(error, 'Failed to create admin user')
  }
})
