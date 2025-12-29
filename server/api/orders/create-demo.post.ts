/**
 * Create Demo Order API Endpoint
 *
 * POST /api/orders/create-demo
 *
 * Creates a demo order for testing purposes (App Store review).
 * - Skips Stripe payment validation
 * - Auto-sets payment status to "succeeded" and order status to "approved"
 * - Marks order as demo (isDemo: true)
 * - Skips email notifications
 */

import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore'
import { getFirebaseAdmin } from '~~/server/utils/firebase-admin'
import { generateUniqueOrderId } from '~~/server/utils/generateOrderId'
import { calculateOrderPrice, DELIVERY_CITIES } from '~~/app/lib/types/order'
import type { Order, Client, PackageType, DurationType, DeliveryType, DeliveryCity } from '~~/app/lib/types/order'
import { calculateDeliveryEndDate, formatToDDMMYYYY } from '~~/server/utils/delivery-dates'
import { z } from 'zod'

// Logging helper for consistent format
const log = {
  info: (msg: string, data?: object) => console.log(`[DEMO-ORDER] ${msg}`, data ? JSON.stringify(data) : ''),
  success: (msg: string, data?: object) => console.log(`[DEMO-ORDER] ✅ ${msg}`, data ? JSON.stringify(data) : ''),
  error: (msg: string, data?: object) => console.error(`[DEMO-ORDER] ❌ ${msg}`, data ? JSON.stringify(data) : ''),
}

// Demo order input schema (simplified, no Stripe required)
const createDemoOrderSchema = z.object({
  fullName: z.string().min(2, 'Meno musí obsahovať aspoň 2 znaky'),
  email: z.string().email('Neplatná emailová adresa').toLowerCase(),
  phone: z.string().min(1, 'Telefónne číslo je povinné'),
  package: z.enum(['EKONOMY', 'ŠTANDARD', 'PREMIUM', 'OFFICE']),
  duration: z.enum(['5', '6']),
  deliveryType: z.enum(['prevádzka', 'domov']),
  deliveryCity: z.enum(DELIVERY_CITIES as [string, ...string[]]).optional(),
  deliveryAddress: z.string().min(1, 'Adresa je povinná'),
  notes: z.string().optional().default(''),
})

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  log.info('=== DEMO ORDER CREATION STARTED ===')

  try {
    // Parse request body
    const body = await readBody(event)

    // Validate input data
    const validationResult = createDemoOrderSchema.safeParse(body)

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

    // Generate unique 6-digit order ID
    const orderId = await generateUniqueOrderId()

    // Calculate pricing
    const pricing = calculateOrderPrice(orderData.package as PackageType, orderData.duration as DurationType)

    // Calculate delivery start date (tomorrow or next valid day)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const deliveryStartDate = formatToDDMMYYYY(tomorrow)

    // Split full name into first and last name
    const nameParts = orderData.fullName.trim().split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    // Step 1: Find or create client
    const clientsRef = db.collection('clients')
    const clientQuery = await clientsRef
      .where('email', '==', orderData.email.toLowerCase())
      .limit(1)
      .get()

    let clientId: string
    let isNewClient = false

    if (clientQuery.empty) {
      // Create new client
      const subscriptionEndDate = calculateDeliveryEndDate(
        deliveryStartDate,
        orderData.duration as DurationType,
        pricing.daysCount,
      )

      const newClient: Omit<Client, 'clientId'> = {
        firstName,
        lastName,
        fullName: orderData.fullName,
        email: orderData.email.toLowerCase(),
        phone: orderData.phone,

        // Account status
        accountStatus: 'neaktívny',

        // Current subscription info
        currentPlan: orderData.package as PackageType,
        lastPaymentDate: Timestamp.now(),
        lastPaymentAmount: pricing.totalPrice,
        subscriptionEndDate: Timestamp.fromDate(subscriptionEndDate),

        // Metadata
        totalOrders: 1,
        totalSpent: pricing.totalPrice,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }

      const clientRef = await clientsRef.add(newClient)
      clientId = clientRef.id
      isNewClient = true

      log.info('New demo client created:', { clientId, email: orderData.email })
    } else {
      // Update existing client
      const clientDoc = clientQuery.docs[0]
      clientId = clientDoc.id

      const subscriptionEndDate = calculateDeliveryEndDate(
        deliveryStartDate,
        orderData.duration as DurationType,
        pricing.daysCount,
      )

      const updateData: any = {
        firstName,
        lastName,
        fullName: orderData.fullName,
        phone: orderData.phone,
        currentPlan: orderData.package as PackageType,
        lastPaymentDate: Timestamp.now(),
        lastPaymentAmount: pricing.totalPrice,
        subscriptionEndDate: Timestamp.fromDate(subscriptionEndDate),
        totalOrders: FieldValue.increment(1),
        totalSpent: FieldValue.increment(pricing.totalPrice),
        updatedAt: Timestamp.now(),
      }

      await clientDoc.ref.update(updateData)

      log.info('Existing client updated for demo order:', { clientId, email: orderData.email })
    }

    // Step 2: Create demo order
    const order: Omit<Order, 'firestoreId'> & { isDemo: boolean } = {
      // Unique identifier
      orderId,
      clientId,

      // Delivery information
      deliveryType: orderData.deliveryType as DeliveryType,
      ...(orderData.deliveryCity && { deliveryCity: orderData.deliveryCity as DeliveryCity }),
      deliveryAddress: orderData.deliveryAddress,

      // Package details
      package: orderData.package as PackageType,
      duration: orderData.duration as DurationType,
      daysCount: pricing.daysCount,
      totalPrice: pricing.totalPrice,

      // Dietary preferences (empty for demo)
      dietaryRequirements: [],
      notes: orderData.notes || 'Demo objednávka pre testovanie',

      // Delivery information
      courierNotes: '',
      deliveryStartDate,
      deliveryEndDate: Timestamp.fromDate(
        calculateDeliveryEndDate(deliveryStartDate, orderData.duration as DurationType, pricing.daysCount)
      ),
      creditDays: 0,

      // Payment information (auto-approved for demo)
      termsAccepted: true,
      stripePaymentIntentId: `demo_${orderId}_${Date.now()}`,
      paymentStatus: 'succeeded',
      amountPaid: pricing.totalPrice,
      currency: 'eur',

      // Order management (auto-approved for demo)
      orderStatus: 'approved',

      // Demo flag
      isDemo: true,

      // Timestamps
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      paidAt: Timestamp.now(),
    }

    // Save order to Firestore
    const orderRef = await db.collection('orders').add(order)

    const duration = Date.now() - startTime
    log.success(`Demo order created in ${duration}ms`, {
      orderId,
      firestoreId: orderRef.id,
      clientId,
      isNewClient,
      package: order.package,
      totalPrice: order.totalPrice,
    })

    log.info('=== DEMO ORDER CREATION COMPLETE ===', { orderId, clientId })

    // Return order details
    return {
      success: true,
      orderId,
      firestoreId: orderRef.id,
      clientId,
      totalPrice: order.totalPrice,
      message: 'Demo objednávka bola úspešne vytvorená',
    }
  } catch (error: any) {
    const duration = Date.now() - startTime
    log.error(`Demo order creation FAILED after ${duration}ms`, {
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
      message: error.message || 'Nepodarilo sa vytvoriť demo objednávku',
    })
  }
})
