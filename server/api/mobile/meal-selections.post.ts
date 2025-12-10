/**
 * POST /api/mobile/meal-selections
 * Save user's meal selections for a specific date
 */

import { getFirebaseAdmin } from '~~/server/utils/firebase-admin'
import { requireAuth, handleApiError } from '~~/server/utils/auth'
import type { RanajkyChoice, ObedChoice } from '~/lib/types/meals'

const CUTOFF_HOURS = 48

export default defineEventHandler(async (event) => {
  try {
    const user = requireAuth(event)
    const body = await readBody(event)

    const { date, selectedRanajky, selectedObed } = body

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

    // Validate selections
    if (!selectedRanajky || !['A', 'B'].includes(selectedRanajky)) {
      throw createError({
        statusCode: 400,
        message: 'Neplatný výber raňajok'
      })
    }

    if (!selectedObed || !['A', 'B', 'C'].includes(selectedObed)) {
      throw createError({
        statusCode: 400,
        message: 'Neplatný výber obeda'
      })
    }

    // Check if date is not in the past
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const selectionDate = new Date(date)
    selectionDate.setHours(0, 0, 0, 0)

    if (selectionDate < today) {
      throw createError({
        statusCode: 400,
        message: 'Nemôžete upraviť výber pre minulý dátum'
      })
    }

    // Check 48h cutoff
    const now = new Date()
    const hoursUntilDelivery = (selectionDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    
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
    const clientData = clientDoc.data()

    // Get active order for package tier info
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

    // Save the selection using compound ID: clientId_date
    const selectionId = `${clientId}_${date}`
    const selectionRef = firestore.collection('mealSelections').doc(selectionId)
    
    const nowTimestamp = new Date()
    const existingDoc = await selectionRef.get()

    const selectionData = {
      clientId,
      orderId: orderData.orderId,
      date,
      selectedRanajky: selectedRanajky as RanajkyChoice,
      selectedObed: selectedObed as ObedChoice,
      packageTier: orderData.package || clientData.currentPlan,
      updatedAt: nowTimestamp,
      ...(existingDoc.exists ? {} : { createdAt: nowTimestamp })
    }

    await selectionRef.set(selectionData, { merge: true })

    return {
      success: true,
      message: 'Výber bol uložený',
      selection: selectionData
    }
  } catch (error: any) {
    return handleApiError(error, 'Nepodarilo sa uložiť výber')
  }
})
