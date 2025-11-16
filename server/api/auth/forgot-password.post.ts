import { getFirebaseAdmin } from '~~/server/utils/firebase-admin'
import { handleApiError } from '~~/server/utils/auth'
import { sendPasswordResetEmail } from '~~/server/utils/email'
import { z } from 'zod'

const ForgotPasswordSchema = z.object({
  email: z.string().email('Neplatný formát emailu'),
})

interface ForgotPasswordResponse {
  success: boolean
  message?: string
  error?: string
}

export default defineEventHandler(async (event): Promise<ForgotPasswordResponse> => {
  try {
    const body = await readBody(event)

    // Validate request body
    const validation = ForgotPasswordSchema.safeParse(body)
    if (!validation.success) {
      throw createError({
        statusCode: 400,
        message: validation.error.issues[0].message,
      })
    }

    const { email } = validation.data
    const { auth, firestore } = getFirebaseAdmin()
    const config = useRuntimeConfig()

    // Check if email exists in admin-users collection
    const adminUsersSnapshot = await firestore
      .collection('admin-users')
      .where('email', '==', email)
      .limit(1)
      .get()

    if (adminUsersSnapshot.empty) {
      // Don't reveal if email exists or not for security
      // Return success anyway to prevent email enumeration
      return {
        success: true,
        message: 'Ak je váš email v našom systéme, obdržíte email s inštrukciami na obnovenie hesla.',
      }
    }

    const adminUserDoc = adminUsersSnapshot.docs[0]
    const adminUser = adminUserDoc.data()

    // Generate password reset link using Firebase Admin SDK
    const resetLink = await auth.generatePasswordResetLink(email, {
      url: `${config.public.appUrl}/login`,
    })

    // Send password reset email
    const emailResult = await sendPasswordResetEmail(email, {
      adminName: adminUser.firstName || 'Admin',
      resetLink,
      expiryHours: 1,
    })

    if (!emailResult.success) {
      console.error('Failed to send password reset email:', emailResult.error)
      throw createError({
        statusCode: 500,
        message: 'Nepodarilo sa odoslať email. Skúste to prosím neskôr.',
      })
    }

    console.log('Password reset email sent successfully to:', email)

    return {
      success: true,
      message: 'Email s inštrukciami na obnovenie hesla bol odoslaný.',
    }
  } catch (error: any) {
    console.error('Error in forgot-password endpoint:', error)
    handleApiError(error, 'Nepodarilo sa spracovať žiadosť o obnovenie hesla')
    // handleApiError throws, so this is unreachable
    return { success: false, error: 'Internal error' }
  }
})
