import { getFirebaseAdmin } from '~~/server/utils/firebase-admin'
import {
  parseWeekId,
  getSaturdayOfWeek,
  getWeekNumber,
  createEmptyDayMeals
} from '~~/server/utils/mealsHelper'
import type { WeekMeals } from '~/lib/types/meals'

export default defineEventHandler(async (event) => {
  try {
    const weekId = getRouterParam(event, 'weekId')

    if (!weekId) {
      throw createError({
        statusCode: 400,
        message: 'Week ID is required'
      })
    }

    // Validate weekId format (YYYY-MM-DD)
    const weekIdRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!weekIdRegex.test(weekId)) {
      throw createError({
        statusCode: 400,
        message: 'Invalid week ID format. Expected YYYY-MM-DD'
      })
    }

    const { firestore } = getFirebaseAdmin()
    const mealsRef = firestore.collection('meals').doc(weekId)
    const doc = await mealsRef.get()

    if (doc.exists) {
      const data = doc.data()
      return {
        weekId,
        ...data
      }
    }

    // If document doesn't exist, return empty structure
    const monday = parseWeekId(weekId)
    const saturday = getSaturdayOfWeek(monday)
    const weekNumber = getWeekNumber(monday)
    const year = monday.getFullYear()

    const emptyWeekMeals: WeekMeals = {
      weekStart: monday,
      weekEnd: saturday,
      year,
      weekNumber,
      days: {
        monday: createEmptyDayMeals(),
        tuesday: createEmptyDayMeals(),
        wednesday: createEmptyDayMeals(),
        thursday: createEmptyDayMeals(),
        friday: createEmptyDayMeals(),
        saturday: createEmptyDayMeals()
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }

    return {
      weekId,
      ...emptyWeekMeals
    }
  } catch (error) {
    console.error('Error fetching meals:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch meals'
    })
  }
})
