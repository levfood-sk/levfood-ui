/**
 * Update Coupon API Endpoint
 *
 * PATCH /api/coupons/:id
 *
 * Updates a coupon (toggle active status).
 * Requires admin authentication.
 */

import { Timestamp } from 'firebase-admin/firestore'
import { getFirebaseAdmin } from '~~/server/utils/firebase-admin'
import { requireAuth, handleApiError } from '~~/server/utils/auth'
import { updateCouponSchema } from '~~/app/lib/types/coupon'

export default defineEventHandler(async (event) => {
  try {
    requireAuth(event)

    const couponId = getRouterParam(event, 'id')
    if (!couponId) {
      throw createError({
        statusCode: 400,
        message: 'Coupon ID is required',
      })
    }

    const body = await readBody(event)

    // Validate input
    const validationResult = updateCouponSchema.safeParse(body)
    if (!validationResult.success) {
      throw createError({
        statusCode: 400,
        message: 'Neplatné údaje',
        data: validationResult.error.issues,
      })
    }

    const { isActive } = validationResult.data

    const { firestore } = getFirebaseAdmin()

    // Check if coupon exists
    const couponRef = firestore.collection('coupons').doc(couponId)
    const couponDoc = await couponRef.get()

    if (!couponDoc.exists) {
      throw createError({
        statusCode: 404,
        message: 'Kód nebol nájdený',
      })
    }

    // Update coupon
    await couponRef.update({
      isActive,
      updatedAt: Timestamp.now(),
    })

    return {
      success: true,
      message: isActive ? 'Kód bol aktivovaný' : 'Kód bol deaktivovaný',
    }
  } catch (error: any) {
    return handleApiError(error, 'Failed to update coupon')
  }
})
