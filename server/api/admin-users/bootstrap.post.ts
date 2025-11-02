import { getFirebaseAdmin } from '~~/server/utils/firebase-admin'

/**
 * Bootstrap endpoint to create the first admin user
 * This endpoint should be disabled or protected in production
 */
export default defineEventHandler(async (event) => {
  try {
    // Check if this is a bootstrap request (no auth required for first admin)
    const body = await readBody(event)
    const { email, password, firstName, lastName, bootstrapKey } = body

    // Simple protection - require a bootstrap key from environment
    const expectedKey = process.env.BOOTSTRAP_KEY || 'levita-bootstrap-2024'
    if (bootstrapKey !== expectedKey) {
      throw createError({
        statusCode: 403,
        message: 'Invalid bootstrap key'
      })
    }

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      throw createError({
        statusCode: 400,
        message: 'Missing required fields'
      })
    }

    const { auth, firestore } = getFirebaseAdmin()

    // Check if any admin users already exist
    const existingAdmins = await firestore.collection('admin-users').limit(1).get()
    if (!existingAdmins.empty) {
      throw createError({
        statusCode: 400,
        message: 'Admin users already exist. Use the regular create endpoint.'
      })
    }

    // Check if email already exists
    let userRecord
    try {
      userRecord = await auth.getUserByEmail(email)
      // If user exists, just create the admin document
      console.log('User already exists in Firebase Auth:', userRecord.uid)
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        // Create new user
        userRecord = await auth.createUser({
          email,
          password,
          displayName: `${firstName} ${lastName}`
        })
        console.log('Created Firebase Auth user:', userRecord.uid)
      } else {
        throw error
      }
    }

    // Create admin user document in Firestore
    const adminUserData = {
      uid: userRecord.uid,
      email,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      role: 'admin',
      createdAt: new Date(),
      createdBy: 'bootstrap'
    }

    await firestore.collection('admin-users').doc(userRecord.uid).set(adminUserData)

    return {
      success: true,
      message: 'First admin user created successfully',
      adminUser: adminUserData
    }
  } catch (error: any) {
    console.error('Error in bootstrap:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to bootstrap admin user'
    })
  }
})
