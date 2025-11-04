import { getFirebaseAdmin } from '~~/server/utils/firebase-admin'
import {
  parseWeekId,
  getSaturdayOfWeek,
  getWeekNumber,
  isDayComplete
} from '~~/server/utils/mealsHelper'
import type { DayName, DayMeals } from '~/lib/types/meals'
import { DAY_LABELS } from '~/lib/types/meals'

export default defineEventHandler(async (event) => {
  try {
    const weekId = getRouterParam(event, 'weekId')

    if (!weekId) {
      throw createError({
        statusCode: 400,
        message: 'ID týždňa je povinné'
      })
    }

    // Validate weekId format (YYYY-MM-DD)
    const weekIdRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!weekIdRegex.test(weekId)) {
      throw createError({
        statusCode: 400,
        message: 'Neplatný formát ID týždňa. Očakávaný formát: YYYY-MM-DD'
      })
    }

    const body = await readBody(event)

    if (!body || !body.days) {
      throw createError({
        statusCode: 400,
        message: 'Požiadavka musí obsahovať objekt days'
      })
    }

    // Validate that all required days and meals are present and complete
    const dayNames: DayName[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const validatedDays: Record<string, DayMeals> = {}

    for (const day of dayNames) {
      const dayData = body.days[day]

      if (!dayData) {
        throw createError({
          statusCode: 400,
          message: `Chýbajú údaje pre ${DAY_LABELS[day]}`
        })
      }

      // Check if day is complete (all fields filled)
      if (!isDayComplete(dayData)) {
        throw createError({
          statusCode: 400,
          message: `Všetky jedlá musia byť vyplnené pre ${DAY_LABELS[day]}. Obed vyžaduje obe možnosti (Variant A a Variant B), ostatné jedlá vyžadujú jednu hodnotu.`
        })
      }

      // Mark day as complete since validation passed
      validatedDays[day] = {
        ...dayData,
        isComplete: true
      }
    }

    // Prepare the document data
    const monday = parseWeekId(weekId)
    const saturday = getSaturdayOfWeek(monday)
    const weekNumber = getWeekNumber(monday)
    const year = monday.getFullYear()

    const { firestore } = getFirebaseAdmin()
    const mealsRef = firestore.collection('meals').doc(weekId)
    const doc = await mealsRef.get()

    const now = new Date()

    const weekMealsData = {
      weekStart: monday,
      weekEnd: saturday,
      year,
      weekNumber,
      days: validatedDays,
      updatedAt: now,
      ...(doc.exists ? {} : { createdAt: now })
    }

    await mealsRef.set(weekMealsData, { merge: true })

    return {
      success: true,
      message: 'Jedlá boli úspešne uložené',
      weekId,
      data: weekMealsData
    }
  } catch (error: any) {
    console.error('Error saving meals:', error)

    // If it's already a H3Error (from createError), rethrow it
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: 'Nepodarilo sa uložiť jedlá'
    })
  }
})
