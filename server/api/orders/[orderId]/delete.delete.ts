/**
 * Delete Demo Order API Endpoint
 *
 * DELETE /api/orders/:orderId/delete
 *
 * Deletes a demo order and optionally the associated client if they have no other orders.
 * Only works for orders with isDemo: true flag.
 */

import { getFirestore } from 'firebase-admin/firestore'
import { getFirebaseAdmin } from '~~/server/utils/firebase-admin'

// Logging helper for consistent format
const log = {
  info: (msg: string, data?: object) => console.log(`[DELETE-DEMO-ORDER] ${msg}`, data ? JSON.stringify(data) : ''),
  success: (msg: string, data?: object) => console.log(`[DELETE-DEMO-ORDER] ✅ ${msg}`, data ? JSON.stringify(data) : ''),
  error: (msg: string, data?: object) => console.error(`[DELETE-DEMO-ORDER] ❌ ${msg}`, data ? JSON.stringify(data) : ''),
}

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  log.info('=== DELETE DEMO ORDER STARTED ===')

  try {
    // Get order ID from route params
    const orderId = getRouterParam(event, 'orderId')

    if (!orderId) {
      throw createError({
        statusCode: 400,
        message: 'Order ID is required',
      })
    }

    log.info('Deleting demo order:', { orderId })

    // Initialize Firebase Admin
    const { app } = getFirebaseAdmin()
    const db = getFirestore(app)

    // Find order by orderId (6-digit ID)
    const ordersRef = db.collection('orders')
    const orderQuery = await ordersRef
      .where('orderId', '==', orderId)
      .limit(1)
      .get()

    if (orderQuery.empty) {
      throw createError({
        statusCode: 404,
        message: 'Objednávka nenájdená',
      })
    }

    const orderDoc = orderQuery.docs[0]
    const order = orderDoc.data()

    // Verify this is a demo order
    if (!order.isDemo) {
      throw createError({
        statusCode: 403,
        message: 'Len demo objednávky môžu byť vymazané',
      })
    }

    const clientId = order.clientId
    log.info('Order verified as demo:', { orderId, clientId })

    // Delete the order
    await orderDoc.ref.delete()
    log.success('Order deleted:', { orderId })

    // Check if client has other orders (non-demo)
    let clientDeleted = false
    if (clientId) {
      // Query for any remaining orders from this client
      const remainingOrdersQuery = await ordersRef
        .where('clientId', '==', clientId)
        .get()

      // Check if client has any non-demo orders
      const hasNonDemoOrders = remainingOrdersQuery.docs.some(doc => !doc.data().isDemo)
      const remainingOrderCount = remainingOrdersQuery.size

      log.info('Checking client orders:', {
        clientId,
        remainingOrderCount,
        hasNonDemoOrders
      })

      if (remainingOrderCount === 0) {
        // No remaining orders at all, delete the client
        const clientRef = db.collection('clients').doc(clientId)
        const clientDoc = await clientRef.get()

        if (clientDoc.exists) {
          await clientRef.delete()
          clientDeleted = true
          log.success('Client deleted (no remaining orders):', { clientId })
        }
      } else if (!hasNonDemoOrders) {
        // Only demo orders remain - still delete the client
        // First delete all remaining demo orders
        const batch = db.batch()
        remainingOrdersQuery.docs.forEach(doc => {
          batch.delete(doc.ref)
        })
        await batch.commit()
        log.success('Deleted remaining demo orders:', { count: remainingOrderCount })

        // Now delete the client
        const clientRef = db.collection('clients').doc(clientId)
        const clientDoc = await clientRef.get()

        if (clientDoc.exists) {
          await clientRef.delete()
          clientDeleted = true
          log.success('Client deleted (only had demo orders):', { clientId })
        }
      } else {
        log.info('Client has non-demo orders, keeping client:', { clientId })
      }
    }

    const duration = Date.now() - startTime
    log.success(`Demo order deletion completed in ${duration}ms`, {
      orderId,
      clientId,
      clientDeleted,
    })

    log.info('=== DELETE DEMO ORDER COMPLETE ===')

    return {
      success: true,
      orderId,
      clientDeleted,
      message: 'Demo objednávka bola vymazaná',
    }
  } catch (error: any) {
    const duration = Date.now() - startTime
    log.error(`Demo order deletion FAILED after ${duration}ms`, {
      error: error.message,
      statusCode: error.statusCode,
    })

    // Handle specific error types
    if (error.statusCode) {
      throw error
    }

    // Generic error
    throw createError({
      statusCode: 500,
      message: error.message || 'Nepodarilo sa vymazať demo objednávku',
    })
  }
})
