import { getFirebaseAdmin } from '~~/server/utils/firebase-admin'
import { requireAuth, handleApiError } from '~~/server/utils/auth'
import type { DailyMeal } from '~/lib/types/meals'

/**
 * GET /api/meals/daily/[date]
 * Get meals for a specific date
 */
export default defineEventHandler(async (event) => {
  try {
    requireAuth(event)
    const date = getRouterParam(event, 'date')

    if (!date) {
      throw createError({
        statusCode: 400,
        message: 'Dátum je povinný'
      })
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) {
      throw createError({
        statusCode: 400,
        message: 'Neplatný formát dátumu. Očakávaný formát: YYYY-MM-DD'
      })
    }

    const { firestore } = getFirebaseAdmin()
    const mealsRef = firestore.collection('dailyMeals').doc(date)
    const doc = await mealsRef.get()

    if (doc.exists) {
      return {
        date,
        ...doc.data()
      }
    }

    // Return empty structure if document doesn't exist
    const emptyDailyMeal: Omit<DailyMeal, 'createdAt' | 'updatedAt'> = {
      date,
      meals: {
        desiata: '',
        polievka: '',
        olovrant: '',
        vecera: ''
      },
      ranajkyOptions: {
        optionA: '',
        optionB: ''
      },
      obedOptions: {
        optionA: '',
        optionB: '',
        optionC: ''
      },
      isPublished: false
    }

    return emptyDailyMeal
  } catch (error: any) {
    return handleApiError(error, 'Nepodarilo sa načítať jedlá pre daný deň')
  }
})
