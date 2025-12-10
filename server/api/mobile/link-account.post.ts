/**
 * Link Mobile Account API Endpoint
 *
 * POST /api/mobile/link-account
 *
 * Links a Firebase Auth account (from Apple/Google login) to an existing client
 * using the order code. This allows mobile app users to access their orders.
 */

import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { getFirebaseAdmin } from '~~/server/utils/firebase-admin'
import { requireAuth } from '~~/server/utils/auth'
import type { Order, Client } from '~~/app/lib/types/order'

// Logging helper for consistent format
const log = {
  info: (msg: string, data?: object) => console.log(`[LINK] ${msg}`, data ? JSON.stringify(data) : ''),
  success: (msg: string, data?: object) => console.log(`[LINK] ✅ ${msg}`, data ? JSON.stringify(data) : ''),
  error: (msg: string, data?: object) => console.error(`[LINK] ❌ ${msg}`, data ? JSON.stringify(data) : ''),
}

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  log.info('=== ACCOUNT LINKING STARTED ===')

  try {
    // Require authentication
    const user = requireAuth(event)
    const firebaseUid = user.uid

    log.info('User authenticated', { firebaseUid })

    // Get orderId from request body
    const body = await readBody<{ orderId: string }>(event)
    const { orderId } = body

    if (!orderId || typeof orderId !== 'string') {
      log.error('Missing or invalid orderId')
      throw createError({
        statusCode: 400,
        message: 'Kód objednávky je povinný',
      })
    }

    const trimmedOrderId = orderId.trim()
    log.info('Looking up order', { orderId: trimmedOrderId })

    // Initialize Firestore
    const { app } = getFirebaseAdmin()
    const db = getFirestore(app)

    // Find order by orderId
    const ordersRef = db.collection('orders')
    const orderQuery = await ordersRef
      .where('orderId', '==', trimmedOrderId)
      .limit(1)
      .get()

    if (orderQuery.empty) {
      log.error('Order not found', { orderId: trimmedOrderId })
      throw createError({
        statusCode: 404,
        message: 'Objednávka s týmto kódom neexistuje',
      })
    }

    const orderDoc = orderQuery.docs[0]
    const order = orderDoc.data() as Order
    log.info('Order found', { orderId: trimmedOrderId, clientId: order.clientId })

    // Get client document
    const clientRef = db.collection('clients').doc(order.clientId)
    const clientDoc = await clientRef.get()

    if (!clientDoc.exists) {
      log.error('Client not found', { clientId: order.clientId })
      throw createError({
        statusCode: 404,
        message: 'Klient pre túto objednávku neexistuje',
      })
    }

    const client = clientDoc.data() as Client

    // Check if client is already linked to a different account
    if (client.firebaseUid && client.firebaseUid !== firebaseUid) {
      log.error('Client already linked to different account', {
        clientId: order.clientId,
        existingUid: client.firebaseUid,
        attemptedUid: firebaseUid,
      })
      throw createError({
        statusCode: 409,
        message: 'Tento účet je už prepojený s iným prihlásením',
      })
    }

    // Check if already linked to this account (idempotent)
    if (client.firebaseUid === firebaseUid) {
      log.info('Account already linked', { clientId: order.clientId, firebaseUid })
      
      const duration = Date.now() - startTime
      log.success(`Account already linked (${duration}ms)`)

      return {
        success: true,
        alreadyLinked: true,
        client: {
          clientId: order.clientId,
          fullName: client.fullName,
          email: client.email,
          currentPlan: client.currentPlan,
          accountStatus: client.accountStatus,
        },
        order: {
          orderId: order.orderId,
          package: order.package,
          orderStatus: order.orderStatus,
          deliveryStartDate: order.deliveryStartDate,
        },
      }
    }

    // Link the account
    await clientRef.update({
      firebaseUid,
      updatedAt: Timestamp.now(),
    })

    const duration = Date.now() - startTime
    log.success(`Account linked successfully (${duration}ms)`, {
      clientId: order.clientId,
      firebaseUid,
      orderId: trimmedOrderId,
    })

    return {
      success: true,
      alreadyLinked: false,
      client: {
        clientId: order.clientId,
        fullName: client.fullName,
        email: client.email,
        currentPlan: client.currentPlan,
        accountStatus: client.accountStatus,
      },
      order: {
        orderId: order.orderId,
        package: order.package,
        orderStatus: order.orderStatus,
        deliveryStartDate: order.deliveryStartDate,
      },
    }
  } catch (error: any) {
    const duration = Date.now() - startTime
    log.error(`Account linking failed (${duration}ms)`, {
      error: error.message,
      statusCode: error.statusCode,
    })

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: error.message || 'Nepodarilo sa prepojiť účet',
    })
  }
})
