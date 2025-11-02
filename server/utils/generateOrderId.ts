import { getFirestore } from 'firebase-admin/firestore'
import { getFirebaseAdmin } from './firebase-admin'

/**
 * Generate a unique 6-digit order ID
 *
 * Generates a random 6-digit number and checks for uniqueness in Firestore.
 * Retries up to 10 times if collision occurs.
 *
 * @returns Promise<string> A unique 6-digit order ID
 * @throws Error if unable to generate unique ID after max retries
 */
export async function generateUniqueOrderId(): Promise<string> {
  const MAX_RETRIES = 10
  let attempts = 0

  // Initialize Firebase Admin
  const { app } = getFirebaseAdmin()
  const db = getFirestore(app)

  while (attempts < MAX_RETRIES) {
    // Generate random 6-digit number (100000 to 999999)
    const orderId = Math.floor(100000 + Math.random() * 900000).toString()

    // Check if this ID already exists in Firestore
    const existingOrders = await db
      .collection('orders')
      .where('orderId', '==', orderId)
      .limit(1)
      .get()

    // If no collision, return the ID
    if (existingOrders.empty) {
      console.log(`Generated unique order ID: ${orderId} (attempt ${attempts + 1})`)
      return orderId
    }

    // Collision detected, try again
    attempts++
    console.warn(`Order ID collision detected: ${orderId}, retrying... (${attempts}/${MAX_RETRIES})`)
  }

  // Failed to generate unique ID after max retries
  throw new Error('Unable to generate unique order ID after maximum retries')
}

/**
 * Validate order ID format
 *
 * @param orderId The order ID to validate
 * @returns boolean True if valid 6-digit number
 */
export function isValidOrderId(orderId: string): boolean {
  return /^\d{6}$/.test(orderId)
}
