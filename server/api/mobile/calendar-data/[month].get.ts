/**
 * GET /api/mobile/calendar-data/[month]
 * Get calendar status data for a month (published dates and user selections)
 * Returns lightweight data for calendar indicators
 */

import { getFirebaseAdmin } from '~~/server/utils/firebase-admin'
import { requireAuth, handleApiError } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const user = requireAuth(event)
    const month = getRouterParam(event, 'month')

    if (!month) {
      throw createError({
        statusCode: 400,
        message: 'Mesiac je povinný'
      })
    }

    // Validate month format (YYYY-MM)
    const monthRegex = /^\d{4}-\d{2}$/
    if (!monthRegex.test(month)) {
      throw createError({
        statusCode: 400,
        message: 'Neplatný formát mesiaca (očakávaný YYYY-MM)'
      })
    }

    const { firestore } = getFirebaseAdmin()

    // Calculate date range for the month
    const [year, monthNum] = month.split('-').map(Number)
    const startDate = `${month}-01`
    const lastDay = new Date(year, monthNum, 0).getDate()
    const endDate = `${month}-${lastDay.toString().padStart(2, '0')}`

    // Query published meals in the date range
    const mealsRef = firestore.collection('dailyMeals')
    const mealsQuery = await mealsRef
      .where('isPublished', '==', true)
      .get()

    // Filter meals that fall within the month range
    const publishedDates: string[] = []
    mealsQuery.forEach(doc => {
      const docId = doc.id // Document ID is the date (YYYY-MM-DD)
      if (docId >= startDate && docId <= endDate) {
        publishedDates.push(docId)
      }
    })

    // Find the client linked to this Firebase user
    const clientsRef = firestore.collection('clients')
    const clientQuery = await clientsRef
      .where('firebaseUid', '==', user.uid)
      .limit(1)
      .get()

    const userSelections: Record<string, boolean> = {}

    if (!clientQuery.empty) {
      const clientId = clientQuery.docs[0].id

      // Query user's selections for the published dates
      if (publishedDates.length > 0) {
        const selectionsRef = firestore.collection('mealSelections')
        
        // Firestore 'in' query has a limit of 30 items, so we batch if needed
        const batches = []
        for (let i = 0; i < publishedDates.length; i += 30) {
          const batchDates = publishedDates.slice(i, i + 30)
          const selectionIds = batchDates.map(date => `${clientId}_${date}`)
          batches.push(
            selectionsRef
              .where('__name__', 'in', selectionIds)
              .get()
          )
        }

        const batchResults = await Promise.all(batches)
        
        // Initialize all published dates as false (no selection)
        publishedDates.forEach(date => {
          userSelections[date] = false
        })

        // Mark dates that have selections as true
        batchResults.forEach(snapshot => {
          snapshot.forEach(doc => {
            // Extract date from selection ID (clientId_YYYY-MM-DD)
            const parts = doc.id.split('_')
            const date = parts[parts.length - 1]
            if (date) {
              userSelections[date] = true
            }
          })
        })
      }
    }

    return {
      month,
      publishedDates: publishedDates.sort(),
      userSelections
    }
  } catch (error: any) {
    return handleApiError(error, 'Nepodarilo sa načítať dáta kalendára')
  }
})
