/**
 * Update Delivery Information API Endpoint
 *
 * POST /api/orders/[orderId]/update-delivery
 *
 * Updates the delivery type, city, and address for an order.
 * Validates that city and address are provided when delivery type is 'domov'.
 */

import { getFirestore } from 'firebase-admin/firestore'
import { getFirebaseAdmin } from '~~/server/utils/firebase-admin'
import type { Order, DeliveryType, DeliveryCity } from '~~/app/lib/types/order'
import { DELIVERY_CITIES } from '~~/app/lib/types/order'

const log = {
  info: (msg: string, data?: object) => console.log(`[UPDATE-DELIVERY] ${msg}`, data ? JSON.stringify(data) : ''),
  success: (msg: string, data?: object) => console.log(`[UPDATE-DELIVERY] ${msg}`, data ? JSON.stringify(data) : ''),
  error: (msg: string, data?: object) => console.error(`[UPDATE-DELIVERY] ${msg}`, data ? JSON.stringify(data) : ''),
}

interface UpdateDeliveryBody {
  deliveryType: DeliveryType
  deliveryCity?: DeliveryCity
  deliveryAddress?: string
}

export default defineEventHandler(async (event) => {
  const orderId = getRouterParam(event, 'orderId')
  const body = await readBody<UpdateDeliveryBody>(event)

  log.info('=== UPDATE DELIVERY STARTED ===', { orderId })

  if (!orderId) {
    log.error('Missing orderId parameter')
    throw createError({
      statusCode: 400,
      message: 'Order ID is required',
    })
  }

  const { deliveryType, deliveryCity, deliveryAddress } = body

  // Validate delivery type
  if (!deliveryType || !['prevádzka', 'domov'].includes(deliveryType)) {
    log.error('Invalid delivery type', { deliveryType })
    throw createError({
      statusCode: 400,
      message: 'Typ doručenia je povinný',
    })
  }

  // Validate city and address for home delivery
  if (deliveryType === 'domov') {
    if (!deliveryCity) {
      log.error('Missing delivery city for home delivery')
      throw createError({
        statusCode: 400,
        message: 'Mesto/obec je povinné pre doručenie domov',
      })
    }

    if (!DELIVERY_CITIES.includes(deliveryCity)) {
      log.error('Invalid delivery city', { deliveryCity })
      throw createError({
        statusCode: 400,
        message: 'Neplatné mesto/obec',
      })
    }

    if (!deliveryAddress || deliveryAddress.trim().length < 5) {
      log.error('Missing or too short delivery address', { deliveryAddress })
      throw createError({
        statusCode: 400,
        message: 'Adresa doručenia je povinná (minimálne 5 znakov)',
      })
    }
  }

  try {
    const { app } = getFirebaseAdmin()
    const db = getFirestore(app)

    // Find order by orderId
    log.info('Finding order...', { orderId })
    const ordersRef = db.collection('orders')
    const orderQuery = await ordersRef
      .where('orderId', '==', orderId)
      .limit(1)
      .get()

    if (orderQuery.empty) {
      log.error('Order not found', { orderId })
      throw createError({
        statusCode: 404,
        message: 'Objednávka nenájdená',
      })
    }

    const orderDoc = orderQuery.docs[0]
    const order = orderDoc.data() as Order

    log.info('Order found', {
      orderId,
      currentDeliveryType: order.deliveryType,
      currentDeliveryCity: order.deliveryCity,
      newDeliveryType: deliveryType,
      newDeliveryCity: deliveryCity,
    })

    // Prepare update data
    const updateData: Partial<Order> & { updatedAt: Date } = {
      deliveryType,
      updatedAt: new Date(),
    }

    if (deliveryType === 'domov') {
      updateData.deliveryCity = deliveryCity
      updateData.deliveryAddress = deliveryAddress?.trim()
    } else {
      // For prevádzka, clear city and address
      updateData.deliveryCity = undefined
      updateData.deliveryAddress = ''
    }

    // Update order
    await orderDoc.ref.update(updateData)

    log.success('Order delivery info updated successfully', {
      orderId,
      deliveryType,
      deliveryCity: updateData.deliveryCity,
    })

    return {
      success: true,
      message: 'Informácie o doručení boli aktualizované',
      deliveryType,
      deliveryCity: updateData.deliveryCity,
      deliveryAddress: updateData.deliveryAddress,
    }
  } catch (error: any) {
    log.error('Update failed', {
      orderId,
      error: error.message,
      statusCode: error.statusCode,
    })

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: error.message || 'Nepodarilo sa aktualizovať informácie o doručení',
    })
  }
})
