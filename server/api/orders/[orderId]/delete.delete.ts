/**
 * Delete Order API Endpoint
 *
 * DELETE /api/orders/:orderId/delete
 *
 * Deletes an order. Supports:
 * - Demo orders (isDemo: true) - deletes client if no other orders
 * - Cash orders (paymentMethod: 'cash') - decrements client stats
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getFirebaseAdmin } from '~~/server/utils/firebase-admin'

// Logging helper for consistent format
const log = {
  info: (msg: string, data?: object) => console.log(`[DELETE-ORDER] ${msg}`, data ? JSON.stringify(data) : ''),
  success: (msg: string, data?: object) => console.log(`[DELETE-ORDER] ✅ ${msg}`, data ? JSON.stringify(data) : ''),
  error: (msg: string, data?: object) => console.error(`[DELETE-ORDER] ❌ ${msg}`, data ? JSON.stringify(data) : ''),
}

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  log.info('=== DELETE ORDER STARTED ===')

  try {
    // Get order ID from route params
    const orderId = getRouterParam(event, 'orderId')

    if (!orderId) {
      throw createError({
        statusCode: 400,
        message: 'Order ID is required',
      })
    }

    log.info('Deleting order:', { orderId })

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

    // Check if deletion is allowed (demo order OR cash payment)
    const isCashOrder = order.paymentMethod === 'cash' ||
      order.stripePaymentIntentId?.startsWith('cash_payment_')

    if (!order.isDemo && !isCashOrder) {
      throw createError({
        statusCode: 403,
        message: 'Len demo alebo hotovostné objednávky môžu byť vymazané',
      })
    }

    const clientId = order.clientId
    log.info('Order verified for deletion:', { orderId, clientId, isDemo: order.isDemo, isCash: isCashOrder })

    // Delete the order
    await orderDoc.ref.delete()
    log.success('Order deleted:', { orderId })

    let clientDeleted = false
    let clientUpdated = false

    if (clientId) {
      if (order.isDemo) {
        // Demo order: check if client has other orders, delete if not
        const remainingOrdersQuery = await ordersRef
          .where('clientId', '==', clientId)
          .get()

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
      } else {
        // Cash order: decrement client stats
        const clientRef = db.collection('clients').doc(clientId)
        const clientDoc = await clientRef.get()

        if (clientDoc.exists) {
          await clientRef.update({
            totalOrders: FieldValue.increment(-1),
            totalSpent: FieldValue.increment(-order.totalPrice),
            updatedAt: new Date(),
          })
          clientUpdated = true
          log.success('Client stats decremented:', {
            clientId,
            decrementedOrders: 1,
            decrementedSpent: order.totalPrice
          })
        }
      }
    }

    const duration = Date.now() - startTime
    log.success(`Order deletion completed in ${duration}ms`, {
      orderId,
      clientId,
      clientDeleted,
      clientUpdated,
    })

    log.info('=== DELETE ORDER COMPLETE ===')

    return {
      success: true,
      orderId,
      clientDeleted,
      clientUpdated,
      message: 'Objednávka bola vymazaná',
    }
  } catch (error: any) {
    const duration = Date.now() - startTime
    log.error(`Order deletion FAILED after ${duration}ms`, {
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
      message: error.message || 'Nepodarilo sa vymazať objednávku',
    })
  }
})
