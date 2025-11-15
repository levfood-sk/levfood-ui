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

export default defineEventHandler(async (event) => {
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
      // Calculate subscription end date (start date + duration in weeks * 7 days)
      const startDate = parseDeliveryDate(orderData.deliveryStartDate)
      const durationWeeks = 4 // 4 weeks for both plans
      const subscriptionEndDate = new Date(startDate)
      subscriptionEndDate.setDate(subscriptionEndDate.getDate() + (durationWeeks * 7))

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

      // Calculate new subscription end date
      const startDate = parseDeliveryDate(orderData.deliveryStartDate)
      const durationWeeks = 4
      const subscriptionEndDate = new Date(startDate)
      subscriptionEndDate.setDate(subscriptionEndDate.getDate() + (durationWeeks * 7))

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
      deliveryAddress: orderData.address,

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

    console.log('Order created successfully:', {
      orderId,
      firestoreId: orderRef.id,
      clientId,
      isNewClient,
      package: order.package,
      totalPrice: order.totalPrice,
    })

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
    console.error('Order creation error:', error)

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
