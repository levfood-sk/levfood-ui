/**
 * GET /api/mobile/cancelled-deliveries
 * Get all cancelled delivery dates for the authenticated user
 */

import { getFirebaseAdmin } from '~~/server/utils/firebase-admin'
import { requireAuth, handleApiError } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const user = requireAuth(event)
    const { firestore } = getFirebaseAdmin()

    // Find the client linked to this Firebase user
    const clientsRef = firestore.collection('clients')
    const clientQuery = await clientsRef
      .where('firebaseUid', '==', user.uid)
      .limit(1)
      .get()

    if (clientQuery.empty) {
      return {
        cancelledDates: []
      }
    }

    const clientDoc = clientQuery.docs[0]
    const clientId = clientDoc.id

    // Get all cancelled deliveries for this client
    const cancelledRef = firestore.collection('cancelledDeliveries')
    const cancelledQuery = await cancelledRef
      .where('clientId', '==', clientId)
      .orderBy('date', 'asc')
      .get()

    const cancelledDates = cancelledQuery.docs.map(doc => {
      const data = doc.data()
      return {
        date: data.date,
        cancelledAt: data.cancelledAt?.toDate?.()?.toISOString() || data.cancelledAt,
        creditApplied: data.creditApplied || false
      }
    })

    return {
      cancelledDates
    }
  } catch (error: any) {
    return handleApiError(error, 'Nepodarilo sa načítať zrušené doručenia')
  }
})
