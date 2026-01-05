/**
 * Coupon Code Types & Validation
 *
 * Defines the Coupon interface and Zod validation schemas
 * for the discount code system.
 */

import { z } from 'zod'
import type { Timestamp } from 'firebase/firestore'

/**
 * Coupon document stored in Firestore 'coupons' collection
 */
export interface Coupon {
  id: string                    // Firestore document ID
  code: string                  // Unique coupon code (uppercase)
  discountPercentage: number    // Discount percentage (1-100)
  usageCount: number            // Number of times used
  isActive: boolean             // Active/inactive toggle
  createdBy: string             // Admin user UID who created it
  createdByName: string         // Admin user full name (for display)
  createdAt: Timestamp
  updatedAt: Timestamp
}

/**
 * Zod schema for creating a new coupon
 */
export const createCouponSchema = z.object({
  code: z
    .string()
    .min(3, 'Kód musí mať aspoň 3 znaky')
    .max(20, 'Kód môže mať maximálne 20 znakov')
    .regex(/^[A-Za-z0-9]+$/, 'Kód môže obsahovať iba písmená a čísla')
    .transform((val) => val.toUpperCase()),
  discountPercentage: z
    .number()
    .min(1, 'Zľava musí byť aspoň 1%')
    .max(100, 'Zľava nemôže byť viac ako 100%'),
})

export type CreateCouponInput = z.infer<typeof createCouponSchema>

/**
 * Zod schema for updating a coupon (toggle active status)
 */
export const updateCouponSchema = z.object({
  isActive: z.boolean(),
})

export type UpdateCouponInput = z.infer<typeof updateCouponSchema>

/**
 * Zod schema for validating a coupon code at checkout
 */
export const validateCouponSchema = z.object({
  code: z.string().min(1, 'Kód je povinný'),
})

export type ValidateCouponInput = z.infer<typeof validateCouponSchema>

/**
 * Response from coupon validation endpoint
 */
export interface CouponValidationResponse {
  valid: boolean
  coupon?: {
    code: string
    discountPercentage: number
  }
  error?: string
}
