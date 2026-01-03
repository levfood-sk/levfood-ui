/**
 * Create Admin Order API Endpoint
 *
 * POST /api/orders/create-admin
 *
 * Creates a new order for an existing client (cash payment).
 * - Requires existing clientId
 * - Sets payment status to "succeeded" (cash payment received)
 * - Sets order status to "pending" (admin will approve later)
 * - Updates client subscription info
 */

import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore'
import { getFirebaseAdmin } from '~~/server/utils/firebase-admin'
import { generateUniqueOrderId } from '~~/server/utils/generateOrderId'
import { calculateOrderPrice, DELIVERY_CITIES } from '~~/app/lib/types/order'
import type { Order, Client, PackageType, DurationType, DeliveryType, DeliveryCity } from '~~/app/lib/types/order'
import { calculateDeliveryEndDate } from '~~/server/utils/delivery-dates'
import { z } from 'zod'

// Logging helper for consistent format
const log = {
  info: (msg: string, data?: object) => console.log(`[ADMIN-ORDER] ${msg}`, data ? JSON.stringify(data) : ''),
  success: (msg: string, data?: object) => console.log(`[ADMIN-ORDER] ✅ ${msg}`, data ? JSON.stringify(data) : ''),
  error: (msg: string, data?: object) => console.error(`[ADMIN-ORDER] ❌ ${msg}`, data ? JSON.stringify(data) : ''),
}

// Admin order input schema
const createAdminOrderSchema = z.object({
  clientId: z.string().min(1, 'Zákazník je povinný'),
  package: z.enum(['EKONOMY', 'ŠTANDARD', 'PREMIUM', 'OFFICE']),
  duration: z.enum(['5', '6']),
  deliveryType: z.enum(['prevádzka', 'domov']),
  deliveryCity: z.enum(DELIVERY_CITIES as [string, ...string[]]).optional(),
  deliveryAddress: z.string().optional().default(''), // Optional - only required for home delivery
  deliveryStartDate: z.string().min(1, 'Dátum začiatku je povinný'),
  notes: z.string().optional().default(''),
})

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  log.info('=== ADMIN ORDER CREATION STARTED ===')

  try {
    // Parse request body
    const body = await readBody(event)

    // Validate input data
    const validationResult = createAdminOrderSchema.safeParse(body)

    if (!validationResult.success) {
      console.error('Validation errors:', JSON.stringify(validationResult.error.issues, null, 2))
      throw createError({
        statusCode: 400,
        message: 'Neplatné údaje objednávky',
        data: validationResult.error.issues,
      })
    }

    const orderData = validationResult.data

    // Validate deliveryCity is provided when deliveryType is 'domov'
    if (orderData.deliveryType === 'domov' && !orderData.deliveryCity) {
      throw createError({
        statusCode: 400,
        message: 'Mesto/obec je povinné pre doručenie domov',
      })
    }

    // Initialize Firebase Admin
    const { app } = getFirebaseAdmin()
    const db = getFirestore(app)

    // Step 1: Verify client exists
    const clientRef = db.collection('clients').doc(orderData.clientId)
    const clientDoc = await clientRef.get()

    if (!clientDoc.exists) {
      throw createError({
        statusCode: 404,
        message: 'Zákazník nebol nájdený',
      })
    }

    const clientData = clientDoc.data() as Client
    log.info('Client found:', { clientId: orderData.clientId, email: clientData.email })

    // Generate unique 6-digit order ID
    const orderId = await generateUniqueOrderId()

    // Calculate pricing
    const pricing = calculateOrderPrice(orderData.package as PackageType, orderData.duration as DurationType)

    // Calculate subscription end date
    const subscriptionEndDate = calculateDeliveryEndDate(
      orderData.deliveryStartDate,
      orderData.duration as DurationType,
      pricing.daysCount,
    )

    // Step 2: Create order
    const order: Omit<Order, 'firestoreId'> = {
      // Unique identifier
      orderId,
      clientId: orderData.clientId,

      // Delivery information
      deliveryType: orderData.deliveryType as DeliveryType,
      ...(orderData.deliveryCity && { deliveryCity: orderData.deliveryCity as DeliveryCity }),
      deliveryAddress: orderData.deliveryAddress,

      // Package details
      package: orderData.package as PackageType,
      duration: orderData.duration as DurationType,
      daysCount: pricing.daysCount,
      totalPrice: pricing.totalPrice,

      // Dietary preferences
      dietaryRequirements: [],
      notes: orderData.notes || '',

      // Delivery information
      courierNotes: '',
      deliveryStartDate: orderData.deliveryStartDate,
      deliveryEndDate: Timestamp.fromDate(subscriptionEndDate),
      creditDays: 0,

      // Payment information (cash payment - marked as succeeded)
      termsAccepted: true,
      stripePaymentIntentId: `cash_payment_${orderId}_${Date.now()}`,
      paymentStatus: 'succeeded',
      paymentMethod: 'cash',
      amountPaid: pricing.totalPrice,
      currency: 'eur',

      // Order management (starts as pending for admin review)
      orderStatus: 'pending',

      // Timestamps
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      paidAt: Timestamp.now(),
    }

    // Save order to Firestore
    const orderRef = await db.collection('orders').add(order)

    // Step 3: Update client with new subscription info
    const clientUpdateData = {
      currentPlan: orderData.package as PackageType,
      lastPaymentDate: Timestamp.now(),
      lastPaymentAmount: pricing.totalPrice,
      subscriptionEndDate: Timestamp.fromDate(subscriptionEndDate),
      totalOrders: FieldValue.increment(1),
      totalSpent: FieldValue.increment(pricing.totalPrice),
      updatedAt: Timestamp.now(),
    }

    await clientRef.update(clientUpdateData)

    const duration = Date.now() - startTime
    log.success(`Admin order created in ${duration}ms`, {
      orderId,
      firestoreId: orderRef.id,
      clientId: orderData.clientId,
      clientEmail: clientData.email,
      package: order.package,
      totalPrice: order.totalPrice,
    })

    log.info('=== ADMIN ORDER CREATION COMPLETE ===', { orderId, clientId: orderData.clientId })

    // Return order details
    return {
      success: true,
      orderId,
      firestoreId: orderRef.id,
      clientId: orderData.clientId,
      totalPrice: order.totalPrice,
      message: 'Objednávka bola úspešne vytvorená',
    }
  } catch (error: any) {
    const duration = Date.now() - startTime
    log.error(`Admin order creation FAILED after ${duration}ms`, {
      error: error.message,
      statusCode: error.statusCode,
    })

    // Handle specific error types
    if (error.statusCode) {
      throw error // Re-throw validation errors
    }

    // Generic error
    throw createError({
      statusCode: 500,
      message: error.message || 'Nepodarilo sa vytvoriť objednávku',
    })
  }
})
