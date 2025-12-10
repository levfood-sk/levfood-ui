/**
 * POST /api/mobile/cancelled-deliveries
 * Cancel a delivery day for a user
 * Extends subscription by +1 day
 */

import { getFirebaseAdmin } from '~~/server/utils/firebase-admin'
import { requireAuth, handleApiError } from '~~/server/utils/auth'

const CUTOFF_HOURS = 48

export default defineEventHandler(async (event) => {
  try {
    const user = requireAuth(event)
    const body = await readBody(event)

    const { date, action } = body // action: 'cancel' | 'reactivate'

    if (!date) {
      throw createError({
        statusCode: 400,
        message: 'Dátum je povinný'
      })
    }

    if (!action || !['cancel', 'reactivate'].includes(action)) {
      throw createError({
        statusCode: 400,
        message: 'Neplatná akcia. Použite "cancel" alebo "reactivate"'
      })
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) {
      throw createError({
        statusCode: 400,
        message: 'Neplatný formát dátumu'
      })
    }

    // Check if date is not in the past
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const cancellationDate = new Date(date)
    cancellationDate.setHours(0, 0, 0, 0)

    if (cancellationDate < today) {
      throw createError({
        statusCode: 400,
        message: 'Nemôžete zrušiť doručenie pre minulý dátum'
      })
    }

    // Check 48h cutoff
    const now = new Date()
    const hoursUntilDelivery = (cancellationDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    if (hoursUntilDelivery < CUTOFF_HOURS) {
      throw createError({
        statusCode: 400,
        message: `Zmeny nie sú možné menej ako ${CUTOFF_HOURS} hodín pred doručením`
      })
    }

    const { firestore } = getFirebaseAdmin()

    // Find the client linked to this Firebase user
    const clientsRef = firestore.collection('clients')
    const clientQuery = await clientsRef
      .where('firebaseUid', '==', user.uid)
      .limit(1)
      .get()

    if (clientQuery.empty) {
      throw createError({
        statusCode: 403,
        message: 'Účet nie je prepojený s klientom'
      })
    }

    const clientDoc = clientQuery.docs[0]
    const clientId = clientDoc.id

    // Get active order
    const ordersRef = firestore.collection('orders')
    const orderQuery = await ordersRef
      .where('clientId', '==', clientId)
      .where('orderStatus', 'in', ['pending', 'approved'])
      .limit(1)
      .get()

    if (orderQuery.empty) {
      throw createError({
        statusCode: 403,
        message: 'Nemáte aktívnu objednávku'
      })
    }

    const orderDoc = orderQuery.docs[0]
    const orderData = orderDoc.data()

    // Document ID for cancellation
    const cancellationId = `${clientId}_${date}`
    const cancellationRef = firestore.collection('cancelledDeliveries').doc(cancellationId)

    if (action === 'cancel') {
      // Check if already cancelled
      const existingDoc = await cancellationRef.get()
      if (existingDoc.exists) {
        throw createError({
          statusCode: 400,
          message: 'Doručenie na tento deň je už zrušené'
        })
      }

      // Create cancellation record
      const cancellationData = {
        clientId,
        orderId: orderData.orderId,
        date,
        creditApplied: false, // Will be set to true when subscription is extended
        cancelledAt: new Date()
      }

      await cancellationRef.set(cancellationData)

      // Extend subscription by 1 day
      // Update the order's end date or add to credit days
      const orderRef = firestore.collection('orders').doc(orderDoc.id)
      
      // Get current end date
      let deliveryEndDate: Date
      if (orderData.deliveryEndDate?.toDate) {
        deliveryEndDate = orderData.deliveryEndDate.toDate()
      } else if (orderData.deliveryEndDate) {
        deliveryEndDate = new Date(orderData.deliveryEndDate)
      } else {
        // Calculate from start date + days count if no end date
        deliveryEndDate = new Date()
        deliveryEndDate.setDate(deliveryEndDate.getDate() + (orderData.daysCount || 30))
      }

      // Add 1 day
      deliveryEndDate.setDate(deliveryEndDate.getDate() + 1)

      await orderRef.update({
        deliveryEndDate,
        creditDays: (orderData.creditDays || 0) + 1
      })

      // Mark credit as applied
      await cancellationRef.update({ creditApplied: true })

      return {
        success: true,
        message: 'Doručenie bolo zrušené. +1 deň bol pripočítaný k predplatnému.',
        date,
        action: 'cancel',
        newEndDate: deliveryEndDate.toISOString().split('T')[0]
      }
    } else {
      // Reactivate
      const existingDoc = await cancellationRef.get()
      if (!existingDoc.exists) {
        throw createError({
          statusCode: 400,
          message: 'Doručenie na tento deň nie je zrušené'
        })
      }

      const existingData = existingDoc.data()

      // Remove the credit day if it was applied
      if (existingData?.creditApplied) {
        const orderRef = firestore.collection('orders').doc(orderDoc.id)
        
        let deliveryEndDate: Date
        if (orderData.deliveryEndDate?.toDate) {
          deliveryEndDate = orderData.deliveryEndDate.toDate()
        } else if (orderData.deliveryEndDate) {
          deliveryEndDate = new Date(orderData.deliveryEndDate)
        } else {
          deliveryEndDate = new Date()
        }

        // Subtract 1 day
        deliveryEndDate.setDate(deliveryEndDate.getDate() - 1)

        await orderRef.update({
          deliveryEndDate,
          creditDays: Math.max((orderData.creditDays || 0) - 1, 0)
        })
      }

      // Delete the cancellation record
      await cancellationRef.delete()

      return {
        success: true,
        message: 'Doručenie bolo obnovené.',
        date,
        action: 'reactivate'
      }
    }
  } catch (error: any) {
    return handleApiError(error, 'Nepodarilo sa spracovať požiadavku')
  }
})
