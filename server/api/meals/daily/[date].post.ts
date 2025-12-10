import { getFirebaseAdmin } from '~~/server/utils/firebase-admin'
import { requireAuth, handleApiError } from '~~/server/utils/auth'
import type { DailyMeal, RanajkyOptions, ObedOptions } from '~/lib/types/meals'

/**
 * POST /api/meals/daily/[date]
 * Save meals for a specific date
 * Auto-publishes when all fields are complete
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

    const body = await readBody(event)

    if (!body) {
      throw createError({
        statusCode: 400,
        message: 'Telo požiadavky je povinné'
      })
    }

    // Validate required fields
    const { meals, ranajkyOptions, obedOptions } = body

    if (!meals || !ranajkyOptions || !obedOptions) {
      throw createError({
        statusCode: 400,
        message: 'Chýbajú povinné polia: meals, ranajkyOptions, obedOptions'
      })
    }

    // Check if all fields are complete for auto-publish
    const isComplete = isDailyMealComplete(meals, ranajkyOptions, obedOptions)

    const { firestore } = getFirebaseAdmin()
    const mealsRef = firestore.collection('dailyMeals').doc(date)
    const doc = await mealsRef.get()

    const now = new Date()

    const dailyMealData: Omit<DailyMeal, 'createdAt'> & { createdAt?: Date } = {
      date,
      meals: {
        desiata: meals.desiata || '',
        polievka: meals.polievka || '',
        olovrant: meals.olovrant || '',
        vecera: meals.vecera || ''
      },
      ranajkyOptions: {
        optionA: ranajkyOptions.optionA || '',
        optionB: ranajkyOptions.optionB || ''
      },
      obedOptions: {
        optionA: obedOptions.optionA || '',
        optionB: obedOptions.optionB || '',
        optionC: obedOptions.optionC || ''
      },
      isPublished: isComplete,
      updatedAt: now
    }

    if (!doc.exists) {
      dailyMealData.createdAt = now
    }

    await mealsRef.set(dailyMealData, { merge: true })

    return {
      success: true,
      message: isComplete 
        ? 'Jedlá boli uložené a publikované' 
        : 'Jedlá boli uložené (nie všetky polia sú vyplnené)',
      date,
      isPublished: isComplete,
      data: dailyMealData
    }
  } catch (error: any) {
    return handleApiError(error, 'Nepodarilo sa uložiť jedlá')
  }
})

/**
 * Check if all meal fields are filled
 */
function isDailyMealComplete(
  meals: { desiata: string; polievka: string; olovrant: string; vecera: string },
  ranajkyOptions: RanajkyOptions,
  obedOptions: ObedOptions
): boolean {
  // Check regular meals
  const mealsComplete = 
    meals.desiata?.trim() !== '' &&
    meals.polievka?.trim() !== '' &&
    meals.olovrant?.trim() !== '' &&
    meals.vecera?.trim() !== ''

  // Check ranajky options (both A and B required)
  const ranajkyComplete = 
    ranajkyOptions.optionA?.trim() !== '' &&
    ranajkyOptions.optionB?.trim() !== ''

  // Check obed options (all 3 required)
  const obedComplete = 
    obedOptions.optionA?.trim() !== '' &&
    obedOptions.optionB?.trim() !== '' &&
    obedOptions.optionC?.trim() !== ''

  return mealsComplete && ranajkyComplete && obedComplete
}
