/**
 * Delete Client API Endpoint
 *
 * DELETE /api/clients/:clientId/delete
 *
 * Deletes a client and optionally their orders.
 * - If client has no orders: just delete the client
 * - If client has only cash/demo orders: delete all orders and client
 * - If client has card payment orders: reject deletion (need to handle refunds first)
 */

import { getFirestore } from 'firebase-admin/firestore'
import { getFirebaseAdmin } from '~~/server/utils/firebase-admin'

// Logging helper for consistent format
const log = {
  info: (msg: string, data?: object) => console.log(`[DELETE-CLIENT] ${msg}`, data ? JSON.stringify(data) : ''),
  success: (msg: string, data?: object) => console.log(`[DELETE-CLIENT] ✅ ${msg}`, data ? JSON.stringify(data) : ''),
  error: (msg: string, data?: object) => console.error(`[DELETE-CLIENT] ❌ ${msg}`, data ? JSON.stringify(data) : ''),
}

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  log.info('=== DELETE CLIENT STARTED ===')

  try {
    // Get client ID from route params
    const clientId = getRouterParam(event, 'clientId')

    if (!clientId) {
      throw createError({
        statusCode: 400,
        message: 'Client ID is required',
      })
    }

    log.info('Deleting client:', { clientId })

    // Initialize Firebase Admin
    const { app } = getFirebaseAdmin()
    const db = getFirestore(app)

    // Find client
    const clientRef = db.collection('clients').doc(clientId)
    const clientDoc = await clientRef.get()

    if (!clientDoc.exists) {
      throw createError({
        statusCode: 404,
        message: 'Zákazník nenájdený',
      })
    }

    const client = clientDoc.data()
    log.info('Client found:', { clientId, email: client?.email })

    // Check for existing orders
    const ordersRef = db.collection('orders')
    const ordersQuery = await ordersRef
      .where('clientId', '==', clientId)
      .get()

    const orders = ordersQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    log.info('Found orders:', { count: orders.length })

    // Check if any orders are card payments (not deletable)
    const hasCardOrders = orders.some(order => {
      const isCashOrder = order.paymentMethod === 'cash' ||
        order.stripePaymentIntentId?.startsWith('cash_payment_')
      const isDemo = order.isDemo === true
      return !isCashOrder && !isDemo
    })

    if (hasCardOrders) {
      log.error('Cannot delete client with card payment orders', { clientId })
      throw createError({
        statusCode: 403,
        message: 'Zákazník má objednávky zaplatené kartou. Najprv vymažte tieto objednávky jednotlivo.',
      })
    }

    // Delete all orders (they are all cash or demo)
    if (orders.length > 0) {
      const batch = db.batch()
      ordersQuery.docs.forEach(doc => {
        batch.delete(doc.ref)
      })
      await batch.commit()
      log.success('Deleted orders:', { count: orders.length })
    }

    // Delete the client
    await clientRef.delete()
    log.success('Client deleted:', { clientId })

    const duration = Date.now() - startTime
    log.success(`Client deletion completed in ${duration}ms`, {
      clientId,
      ordersDeleted: orders.length,
    })

    log.info('=== DELETE CLIENT COMPLETE ===')

    return {
      success: true,
      clientId,
      ordersDeleted: orders.length,
      message: 'Zákazník bol vymazaný',
    }
  } catch (error: any) {
    const duration = Date.now() - startTime
    log.error(`Client deletion FAILED after ${duration}ms`, {
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
      message: error.message || 'Nepodarilo sa vymazať zákazníka',
    })
  }
})
