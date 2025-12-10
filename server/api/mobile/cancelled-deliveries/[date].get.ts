/**
 * GET /api/mobile/cancelled-deliveries/[date]
 * Check if a specific date is cancelled for the user
 */

import { getFirebaseAdmin } from '~~/server/utils/firebase-admin'
import { requireAuth, handleApiError } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const user = requireAuth(event)
    const date = getRouterParam(event, 'date')

    if (!date) {
      throw createError({
        statusCode: 400,
        message: 'Dátum je povinný'
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

    // Check if cancellation exists
    const cancellationId = `${clientId}_${date}`
    const cancellationRef = firestore.collection('cancelledDeliveries').doc(cancellationId)
    const cancellationDoc = await cancellationRef.get()

    return {
      date,
      isCancelled: cancellationDoc.exists,
      cancellation: cancellationDoc.exists ? {
        cancelledAt: cancellationDoc.data()?.cancelledAt?.toDate?.() || null,
        creditApplied: cancellationDoc.data()?.creditApplied || false
      } : null
    }
  } catch (error: any) {
    return handleApiError(error, 'Nepodarilo sa načítať stav zrušenia')
  }
})
