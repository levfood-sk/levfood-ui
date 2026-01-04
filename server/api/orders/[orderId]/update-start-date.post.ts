/**
 * Update Delivery Start Date API Endpoint
 *
 * POST /api/orders/[orderId]/update-start-date
 *
 * Updates the delivery start date and recalculates the end date.
 * Validates that the new start date is a valid delivery day for the package type.
 */

import { Timestamp, getFirestore } from 'firebase-admin/firestore'
import { getFirebaseAdmin } from '~~/server/utils/firebase-admin'
import {
  parseDDMMYYYY,
  isValidDeliveryDay,
  calculateDeliveryEndDate,
  extendDeliveryEndDate,
} from '~~/server/utils/delivery-dates'
import type { Order, DurationType } from '~~/app/lib/types/order'

const log = {
  info: (msg: string, data?: object) => console.log(`[UPDATE-START-DATE] ${msg}`, data ? JSON.stringify(data) : ''),
  success: (msg: string, data?: object) => console.log(`[UPDATE-START-DATE] ✅ ${msg}`, data ? JSON.stringify(data) : ''),
  error: (msg: string, data?: object) => console.error(`[UPDATE-START-DATE] ❌ ${msg}`, data ? JSON.stringify(data) : ''),
}

export default defineEventHandler(async (event) => {
  const orderId = getRouterParam(event, 'orderId')
  const body = await readBody(event)

  log.info('=== UPDATE START DATE STARTED ===', { orderId })

  if (!orderId) {
    log.error('Missing orderId parameter')
    throw createError({
      statusCode: 400,
      message: 'Order ID is required',
    })
  }

  const { newStartDate } = body as { newStartDate: string }

  if (!newStartDate) {
    log.error('Missing newStartDate in body')
    throw createError({
      statusCode: 400,
      message: 'Nový dátum začiatku je povinný',
    })
  }

  // Validate date format (DD.MM.YYYY)
  const dateRegex = /^\d{2}\.\d{2}\.\d{4}$/
  if (!dateRegex.test(newStartDate)) {
    log.error('Invalid date format', { newStartDate })
    throw createError({
      statusCode: 400,
      message: 'Neplatný formát dátumu. Použite DD.MM.YYYY',
    })
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
      currentStartDate: order.deliveryStartDate,
      duration: order.duration,
      daysCount: order.daysCount,
    })

    // Parse the new start date
    const parsedStartDate = parseDDMMYYYY(newStartDate)

    // Validate that the new start date is a valid delivery day
    const duration = order.duration as DurationType
    if (!isValidDeliveryDay(parsedStartDate, duration)) {
      const dayOfWeek = parsedStartDate.getDay()
      let errorMessage: string

      if (dayOfWeek === 0) {
        errorMessage = 'Nedeľa nie je platný deň doručenia'
      } else if (dayOfWeek === 6 && duration === '5') {
        errorMessage = 'Sobota nie je platný deň doručenia pre 5-dňový balíček (Po-Pi)'
      } else {
        errorMessage = 'Tento deň nie je platný deň doručenia pre váš balíček'
      }

      log.error('Invalid delivery day selected', {
        newStartDate,
        dayOfWeek,
        duration,
      })

      throw createError({
        statusCode: 400,
        message: errorMessage,
      })
    }

    // Calculate new end date
    const baseEndDate = calculateDeliveryEndDate(newStartDate, duration, order.daysCount)

    // Apply credit days if any
    const creditDays = order.creditDays || 0
    const finalEndDate = creditDays > 0
      ? extendDeliveryEndDate(baseEndDate, duration, creditDays)
      : baseEndDate

    log.info('Calculated new end date', {
      newStartDate,
      baseEndDate: baseEndDate.toISOString(),
      creditDays,
      finalEndDate: finalEndDate.toISOString(),
    })

    // Update order
    await orderDoc.ref.update({
      deliveryStartDate: newStartDate,
      deliveryEndDate: Timestamp.fromDate(finalEndDate),
      updatedAt: new Date(),
    })

    log.success('Order updated successfully', {
      orderId,
      newStartDate,
      newEndDate: finalEndDate.toISOString(),
    })

    return {
      success: true,
      message: 'Dátum začiatku dodávky bol aktualizovaný',
      newStartDate,
      newEndDate: finalEndDate.toISOString(),
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
      message: error.message || 'Nepodarilo sa aktualizovať dátum začiatku',
    })
  }
})
