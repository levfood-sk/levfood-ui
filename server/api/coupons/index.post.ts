/**
 * Create Coupon API Endpoint
 *
 * POST /api/coupons
 *
 * Creates a new coupon code in Firestore.
 * Requires admin authentication.
 */

import { Timestamp } from 'firebase-admin/firestore'
import { getFirebaseAdmin } from '~~/server/utils/firebase-admin'
import { requireAuth, handleApiError } from '~~/server/utils/auth'
import { createCouponSchema } from '~~/app/lib/types/coupon'

export default defineEventHandler(async (event) => {
  try {
    const currentUser = requireAuth(event)
    const body = await readBody(event)

    // Validate input
    const validationResult = createCouponSchema.safeParse(body)
    if (!validationResult.success) {
      throw createError({
        statusCode: 400,
        message: 'Neplatné údaje',
        data: validationResult.error.issues,
      })
    }

    const { code, discountPercentage } = validationResult.data

    const { firestore } = getFirebaseAdmin()

    // Check if code already exists (case-insensitive)
    const existingCoupon = await firestore
      .collection('coupons')
      .where('code', '==', code)
      .limit(1)
      .get()

    if (!existingCoupon.empty) {
      throw createError({
        statusCode: 400,
        message: 'Kód s týmto názvom už existuje',
      })
    }

    // Get current admin user's name
    const adminDoc = await firestore.collection('admin-users').doc(currentUser.uid).get()
    const adminData = adminDoc.data()
    const createdByName = adminData?.fullName || adminData?.email || 'Admin'

    // Create coupon document
    const couponData = {
      code,
      discountPercentage,
      usageCount: 0,
      isActive: true,
      createdBy: currentUser.uid,
      createdByName,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }

    const couponRef = await firestore.collection('coupons').add(couponData)

    return {
      success: true,
      coupon: {
        id: couponRef.id,
        ...couponData,
      },
    }
  } catch (error: any) {
    return handleApiError(error, 'Failed to create coupon')
  }
})
