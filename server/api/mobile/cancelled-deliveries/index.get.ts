/**
 * GET /api/mobile/cancelled-deliveries
 * Get all cancelled delivery dates for the authenticated user
 */

import { getFirebaseAdmin } from '~~/server/utils/firebase-admin'
import { requireAuth, handleApiError } from '~~/server/utils/auth'

/**
 * Check if a date can still be reactivated based on cutoff rules
 */
function getFirstSkippableDate(now: Date = new Date()): Date {
  const dayOfWeek = now.getDay()

  const daysToAdd: Record<number, number> = {
    0: 4,
    1: 4,
    2: 4,
    3: 5,
    4: 5,
    5: 5,
    6: 5,
  }

  const result = new Date(now)
  result.setDate(result.getDate() + daysToAdd[dayOfWeek])
  result.setHours(0, 0, 0, 0)

  return result
}

function canReactivateDate(dateStr: string, now: Date = new Date()): boolean {
  // Parse as local date to avoid timezone issues
  const parts = dateStr.split("-")
  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10) - 1
  const day = parseInt(parts[2], 10)
  const target = new Date(year, month, day)
  target.setHours(0, 0, 0, 0)

  const today = new Date(now)
  today.setHours(0, 0, 0, 0)

  if (target <= today) return false

  const firstSkippable = getFirstSkippableDate(now)
  return target >= firstSkippable
}

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

    const now = new Date()
    const cancelledDates = cancelledQuery.docs.map(doc => {
      const data = doc.data()
      return {
        date: data.date,
        cancelledAt: data.cancelledAt?.toDate?.()?.toISOString() || data.cancelledAt,
        creditApplied: data.creditApplied || false,
        canReactivate: canReactivateDate(data.date, now)
      }
    })

    return {
      cancelledDates
    }
  } catch (error: any) {
    return handleApiError(error, 'Nepodarilo sa načítať zrušené doručenia')
  }
})
