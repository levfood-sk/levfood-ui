/**
 * Get Current Mobile User API Endpoint
 *
 * GET /api/mobile/me
 *
 * Returns the client data linked to the authenticated Firebase user.
 * Used by mobile app to check if user has already linked their account.
 */

import { getFirestore } from 'firebase-admin/firestore'
import { getFirebaseAdmin } from '~~/server/utils/firebase-admin'
import { requireAuth } from '~~/server/utils/auth'
import type { Order, Client } from '~~/app/lib/types/order'

// Logging helper for consistent format
const log = {
  info: (msg: string, data?: object) => console.log(`[ME] ${msg}`, data ? JSON.stringify(data) : ''),
  success: (msg: string, data?: object) => console.log(`[ME] ✅ ${msg}`, data ? JSON.stringify(data) : ''),
}

export default defineEventHandler(async (event) => {
  const startTime = Date.now()

  try {
    // Require authentication
    const user = requireAuth(event)
    const firebaseUid = user.uid

    log.info('Fetching user data', { firebaseUid })

    // Initialize Firestore
    const { app } = getFirebaseAdmin()
    const db = getFirestore(app)

    // Find client by firebaseUid
    const clientsRef = db.collection('clients')
    const clientQuery = await clientsRef
      .where('firebaseUid', '==', firebaseUid)
      .limit(1)
      .get()

    if (clientQuery.empty) {
      const duration = Date.now() - startTime
      log.info(`No linked account found (${duration}ms)`, { firebaseUid })

      return {
        linked: false,
        client: null,
        activeOrders: [],
      }
    }

    const clientDoc = clientQuery.docs[0]
    const client = clientDoc.data() as Client
    const clientId = clientDoc.id

    log.info('Client found', { clientId, email: client.email })

    // Fetch active orders (wrapped in try-catch - orders are non-critical)
    let activeOrders: Array<{
      orderId: string
      package: string
      orderStatus: string
      deliveryStartDate: string
      daysCount: number
      totalPrice: number
    }> = []

    try {
      const ordersRef = db.collection('orders')
      const ordersQuery = await ordersRef
        .where('clientId', '==', clientId)
        .where('orderStatus', 'in', ['pending', 'approved'])
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get()

      activeOrders = ordersQuery.docs.map(doc => {
        const order = doc.data() as Order
        return {
          orderId: order.orderId,
          package: order.package,
          orderStatus: order.orderStatus,
          deliveryStartDate: order.deliveryStartDate,
          daysCount: order.daysCount,
          totalPrice: order.totalPrice,
        }
      })
    } catch (ordersError: any) {
      // Orders query may fail if Firestore index is missing - this is non-critical
      log.info('Orders fetch skipped (index may be missing)', { error: ordersError.message })
    }

    const duration = Date.now() - startTime
    log.success(`User data fetched (${duration}ms)`, {
      clientId,
      activeOrdersCount: activeOrders.length,
    })

    return {
      linked: true,
      client: {
        clientId,
        firstName: client.firstName,
        lastName: client.lastName,
        fullName: client.fullName,
        email: client.email,
        phone: client.phone,
        currentPlan: client.currentPlan,
        accountStatus: client.accountStatus,
        subscriptionEndDate: client.subscriptionEndDate,
      },
      activeOrders,
    }
  } catch (error: any) {
    const duration = Date.now() - startTime
    log.info(`Request failed (${duration}ms)`, { error: error.message })

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: error.message || 'Nepodarilo sa načítať údaje',
    })
  }
})
