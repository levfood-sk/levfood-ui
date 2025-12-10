/**
 * GET /api/mobile/meals/[date]
 * Get meals for a specific date for mobile app
 * Returns only published meals in mobile-friendly format
 */

import { getFirebaseAdmin } from '~~/server/utils/firebase-admin'
import { requireAuth, handleApiError } from '~~/server/utils/auth'

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
        message: 'Neplatný formát dátumu'
      })
    }

    const { firestore } = getFirebaseAdmin()
    const mealsRef = firestore.collection('dailyMeals').doc(date)
    const doc = await mealsRef.get()

    if (!doc.exists) {
      return {
        date,
        available: false,
        meals: null
      }
    }

    const data = doc.data()

    // Only return published meals
    if (!data?.isPublished) {
      return {
        date,
        available: false,
        meals: null
      }
    }

    // Transform to mobile-friendly format
    return {
      date,
      available: true,
      meals: {
        desiata: data.meals?.desiata ? {
          id: `${date}-desiata`,
          name: data.meals.desiata
        } : null,
        polievka: data.meals?.polievka ? {
          id: `${date}-polievka`,
          name: data.meals.polievka
        } : null,
        olovrant: data.meals?.olovrant ? {
          id: `${date}-olovrant`,
          name: data.meals.olovrant
        } : null,
        vecera: data.meals?.vecera ? {
          id: `${date}-vecera`,
          name: data.meals.vecera
        } : null
      },
      ranajkyOptions: [
        {
          id: 'A',
          name: data.ranajkyOptions?.optionA || ''
        },
        {
          id: 'B',
          name: data.ranajkyOptions?.optionB || ''
        }
      ],
      obedOptions: [
        {
          id: 'A',
          name: data.obedOptions?.optionA || ''
        },
        {
          id: 'B',
          name: data.obedOptions?.optionB || ''
        },
        {
          id: 'C',
          name: data.obedOptions?.optionC || ''
        }
      ]
    }
  } catch (error: any) {
    return handleApiError(error, 'Nepodarilo sa načítať jedlá')
  }
})
