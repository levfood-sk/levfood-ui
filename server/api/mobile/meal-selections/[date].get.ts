/**
 * GET /api/mobile/meal-selections/[date]
 * Get user's meal selection for a specific date
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

    // Get the selection using compound ID: clientId_date
    const selectionId = `${clientId}_${date}`
    const selectionRef = firestore.collection('mealSelections').doc(selectionId)
    const selectionDoc = await selectionRef.get()

    if (!selectionDoc.exists) {
      return {
        date,
        hasSelection: false,
        selection: null
      }
    }

    const selectionData = selectionDoc.data()

    return {
      date,
      hasSelection: true,
      selection: {
        selectedRanajky: selectionData?.selectedRanajky || null,
        selectedObed: selectionData?.selectedObed || null,
        updatedAt: selectionData?.updatedAt?.toDate?.() || selectionData?.updatedAt || null
      }
    }
  } catch (error: any) {
    return handleApiError(error, 'Nepodarilo sa načítať výber')
  }
})
