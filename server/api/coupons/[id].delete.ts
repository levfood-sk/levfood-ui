/**
 * Delete Coupon API Endpoint
 *
 * DELETE /api/coupons/:id
 *
 * Deletes a coupon from Firestore.
 * Requires admin authentication.
 */

import { getFirebaseAdmin } from '~~/server/utils/firebase-admin'
import { requireAuth, handleApiError } from '~~/server/utils/auth'

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

    // Delete coupon
    await couponRef.delete()

    return {
      success: true,
      message: 'Kód bol úspešne vymazaný',
    }
  } catch (error: any) {
    return handleApiError(error, 'Failed to delete coupon')
  }
})
