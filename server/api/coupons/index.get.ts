/**
 * List Coupons API Endpoint
 *
 * GET /api/coupons
 *
 * Returns all coupon codes ordered by creation date (newest first).
 * Requires admin authentication.
 */

import { getFirebaseAdmin } from '~~/server/utils/firebase-admin'
import { requireAuth, handleApiError } from '~~/server/utils/auth'
import type { Coupon } from '~~/app/lib/types/coupon'

export default defineEventHandler(async (event) => {
  try {
    requireAuth(event)

    const { firestore } = getFirebaseAdmin()
    const snapshot = await firestore
      .collection('coupons')
      .orderBy('createdAt', 'desc')
      .get()

    const coupons: Coupon[] = []
    snapshot.forEach((doc) => {
      coupons.push({
        id: doc.id,
        ...doc.data(),
      } as Coupon)
    })

    return {
      success: true,
      coupons,
    }
  } catch (error: any) {
    return handleApiError(error, 'Failed to fetch coupons')
  }
})
