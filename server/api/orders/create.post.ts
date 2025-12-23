/**
 * Create Order API Endpoint
 *
 * POST /api/orders/create
 *
 * Creates a new order in Firestore after successful payment.
 * Generates unique 6-digit order ID and saves all order details.
 * Creates or updates client in separate clients collection.
 */

import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore'
import { getFirebaseAdmin } from '~~/server/utils/firebase-admin'
import { generateUniqueOrderId } from '~~/server/utils/generateOrderId'
import { createOrderSchema, calculateOrderPrice } from '~~/app/lib/types/order'
import type { Order, CreateOrderInput, Client } from '~~/app/lib/types/order'
import { sendOrderNotification, sendClientOrderConfirmation } from '~~/server/utils/email'
import { calculateDeliveryEndDate } from '~~/server/utils/delivery-dates'

// Logging helper for consistent format
const log = {
  info: (msg: string, data?: object) => console.log(`[ORDER] ${msg}`, data ? JSON.stringify(data) : ''),
  success: (msg: string, data?: object) => console.log(`[ORDER] ✅ ${msg}`, data ? JSON.stringify(data) : ''),
  warn: (msg: string, data?: object) => console.warn(`[ORDER] ⚠️ ${msg}`, data ? JSON.stringify(data) : ''),
  error: (msg: string, data?: object) => console.error(`[ORDER] ❌ ${msg}`, data ? JSON.stringify(data) : ''),
}

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  log.info('=== ORDER CREATION STARTED ===')

  try {
    // Parse request body
    const body = await readBody<CreateOrderInput>(event)

    // Validate input data
    const validationResult = createOrderSchema.safeParse(body)

    if (!validationResult.success) {
      console.error('Validation errors:', JSON.stringify(validationResult.error.issues, null, 2))
      throw createError({
        statusCode: 400,
        message: 'Neplatné údaje objednávky',
        data: validationResult.error.issues,
      })
    }

    const orderData = validationResult.data

    // Helper function to parse DD.MM.YYYY format to Date
    const parseDeliveryDate = (dateStr: string): Date => {
      const parts = dateStr.split('.')
      if (parts.length === 3) {
        const day = parseInt(parts[0] || '', 10)
        const month = parseInt(parts[1] || '', 10) - 1 // JavaScript months are 0-indexed
        const year = parseInt(parts[2] || '', 10)
        return new Date(year, month, day)
      }
      // Fallback to standard parsing if format is different
      return new Date(dateStr)
    }

    // Initialize Firebase Admin
    const { app } = getFirebaseAdmin()
    const db = getFirestore(app)

    // Generate unique 6-digit order ID
    const orderId = await generateUniqueOrderId()

    // Calculate pricing
    const pricing = calculateOrderPrice(orderData.package, orderData.duration)

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
      // Calculate subscription end date using delivery date utility
      const subscriptionEndDate = calculateDeliveryEndDate(
        orderData.deliveryStartDate,
        orderData.duration,
        pricing.daysCount,
      )

      const newClient: Omit<Client, 'clientId'> = {
        firstName,
        lastName,
        fullName: orderData.fullName,
        email: orderData.email.toLowerCase(),
        phone: orderData.phone,

        // Personal info (optional)
        ...(orderData.birthDate && { birthDate: orderData.birthDate }),
        ...(orderData.height && { height: orderData.height }),
        ...(orderData.weight && { weight: orderData.weight }),
        ...(orderData.physicalActivity && { physicalActivity: orderData.physicalActivity }),
        ...(orderData.workActivity && { workActivity: orderData.workActivity }),
        ...(orderData.stressLevel && { stressLevel: orderData.stressLevel }),
        ...(orderData.goal && { goal: orderData.goal }),

        // Account status
        accountStatus: 'neaktívny',

        // Current subscription info
        currentPlan: orderData.package,
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

      console.log('New client created:', {
        clientId,
        email: orderData.email,
      })
    } else {
      // Update existing client
      const clientDoc = clientQuery.docs[0]
      clientId = clientDoc.id

      // Calculate new subscription end date using delivery date utility
      const subscriptionEndDate = calculateDeliveryEndDate(
        orderData.deliveryStartDate,
        orderData.duration,
        pricing.daysCount,
      )

      const updateData: any = {
        // Update contact info in case it changed
        firstName,
        lastName,
        fullName: orderData.fullName,
        phone: orderData.phone,

        // Update subscription info
        currentPlan: orderData.package,
        lastPaymentDate: Timestamp.now(),
        lastPaymentAmount: pricing.totalPrice,
        subscriptionEndDate: Timestamp.fromDate(subscriptionEndDate),

        // Increment counters
        totalOrders: FieldValue.increment(1),
        totalSpent: FieldValue.increment(pricing.totalPrice),
        updatedAt: Timestamp.now(),
      }

      // Update personal info only if provided
      if (orderData.birthDate) updateData.birthDate = orderData.birthDate
      if (orderData.height) updateData.height = orderData.height
      if (orderData.weight) updateData.weight = orderData.weight
      if (orderData.physicalActivity) updateData.physicalActivity = orderData.physicalActivity
      if (orderData.workActivity) updateData.workActivity = orderData.workActivity
      if (orderData.stressLevel) updateData.stressLevel = orderData.stressLevel
      if (orderData.goal) updateData.goal = orderData.goal

      await clientDoc.ref.update(updateData)

      console.log('Existing client updated:', {
        clientId,
        email: orderData.email,
      })
    }

    // Step 2: Create order
    const order: Omit<Order, 'firestoreId'> = {
      // Unique identifier
      orderId,
      clientId,

      // Delivery information
      deliveryType: orderData.deliveryType,
      ...(orderData.deliveryCity && { deliveryCity: orderData.deliveryCity }),
      deliveryAddress: orderData.address, // Always saved for billing purposes

      // Package details
      package: orderData.package,
      duration: orderData.duration,
      daysCount: pricing.daysCount,
      totalPrice: pricing.totalPrice,

      // Dietary preferences
      dietaryRequirements: orderData.dietaryRequirements,
      notes: orderData.notes,

      // Delivery information
      courierNotes: orderData.courierNotes,
      deliveryStartDate: orderData.deliveryStartDate,
      deliveryEndDate: Timestamp.fromDate(
        calculateDeliveryEndDate(orderData.deliveryStartDate, orderData.duration, pricing.daysCount)
      ),
      creditDays: 0,

      // Payment information
      termsAccepted: orderData.termsAccepted,
      stripePaymentIntentId: orderData.stripePaymentIntentId,
      paymentStatus: 'succeeded',
      amountPaid: pricing.totalPrice,
      currency: 'eur',

      // Order management
      orderStatus: 'pending',

      // Timestamps
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      paidAt: Timestamp.now(),
    }

    // Save order to Firestore
    const orderRef = await db.collection('orders').add(order)

    const duration = Date.now() - startTime
    log.success(`Order created in ${duration}ms`, {
      orderId,
      firestoreId: orderRef.id,
      clientId,
      isNewClient,
      package: order.package,
      deliveryCity: order.deliveryCity || null,
      totalPrice: order.totalPrice,
      stripePaymentIntentId: order.stripePaymentIntentId,
    })

    // Send order notification email to admin (fire-and-forget)
    try {
      log.info('Sending admin notification email...')
      const config = useRuntimeConfig()

      // Calculate end date from start date and days count
      const startDate = new Date(body.deliveryStartDate.split('.').reverse().join('-'))
      const endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + order.daysCount - 1)

      // Format dates as DD.MM.YYYY
      const formatDate = (date: Date) => {
        const day = String(date.getDate()).padStart(2, '0')
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const year = date.getFullYear()
        return `${day}.${month}.${year}`
      }

      const dateRange = `${formatDate(startDate)} - ${formatDate(endDate)}`

      // Format price from cents to euros
      const priceInEuros = (order.totalPrice / 100).toFixed(0)

      const adminEmailResult = await sendOrderNotification(
        config.adminNotificationEmails,
        {
          orderId: String(orderId),
          clientName: orderData.fullName.toUpperCase(),
          package: order.package,
          dateRange,
          totalPrice: priceInEuros,
          email: orderData.email,
          phone: orderData.phone,
        }
      )

      if (adminEmailResult.success) {
        log.success('Admin notification email sent', { to: config.adminNotificationEmails })
      } else {
        log.error('Admin notification email FAILED', { error: adminEmailResult.error })
      }
    } catch (emailError: any) {
      // Log error but don't fail the order creation
      log.error('Admin notification email exception', { error: emailError.message })
    }

    // Note: Client order confirmation email is now sent by the Stripe webhook
    // after invoice generation, so the invoice PDF can be attached.
    // See: server/api/stripe/webhook.post.ts

    log.info('=== ORDER CREATION COMPLETE ===', { orderId, clientId })

    // Return order details
    return {
      success: true,
      orderId,
      firestoreId: orderRef.id,
      clientId,
      totalPrice: order.totalPrice,
      message: 'Objednávka bola úspešne vytvorená',
    }
  } catch (error: any) {
    const duration = Date.now() - startTime
    log.error(`Order creation FAILED after ${duration}ms`, {
      error: error.message,
      statusCode: error.statusCode,
      stack: error.stack?.split('\n').slice(0, 3).join(' '),
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
