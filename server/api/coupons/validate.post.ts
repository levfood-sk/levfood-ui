/**
 * Validate Coupon API Endpoint
 *
 * POST /api/coupons/validate
 *
 * Validates a coupon code for use during checkout.
 * This endpoint is PUBLIC (no authentication required).
 */

import { getFirebaseAdmin } from '~~/server/utils/firebase-admin'
import { validateCouponSchema, type CouponValidationResponse } from '~~/app/lib/types/coupon'

export default defineEventHandler(async (event): Promise<CouponValidationResponse> => {
  try {
    const body = await readBody(event)

    // Validate input
    const validationResult = validateCouponSchema.safeParse(body)
    if (!validationResult.success) {
      return {
        valid: false,
        error: 'Kód je povinný',
      }
    }

    // Normalize code to uppercase and trim
    const code = validationResult.data.code.toUpperCase().trim()

    if (!code) {
      return {
        valid: false,
        error: 'Kód je povinný',
      }
    }

    const { firestore } = getFirebaseAdmin()

    // Query for active coupon with this code
    const couponQuery = await firestore
      .collection('coupons')
      .where('code', '==', code)
      .where('isActive', '==', true)
      .limit(1)
      .get()

    if (couponQuery.empty) {
      return {
        valid: false,
        error: 'Neplatný alebo neaktívny kód',
      }
    }

    const couponDoc = couponQuery.docs[0]
    const couponData = couponDoc.data()

    return {
      valid: true,
      coupon: {
        code: couponData.code,
        discountPercentage: couponData.discountPercentage,
      },
    }
  } catch (error: any) {
    console.error('Coupon validation error:', error)
    return {
      valid: false,
      error: 'Nepodarilo sa overiť kód',
    }
  }
})
