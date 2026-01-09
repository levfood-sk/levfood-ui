/**
 * POST /api/admin/auto-fill-meals
 * Auto-fill meal selections with Option A for clients who haven't selected
 *
 * Request body:
 * - dateFrom?: string (YYYY-MM-DD) - start of range, defaults to first modifiable date
 * - dateTo?: string (YYYY-MM-DD) - end of range (inclusive), defaults to dateFrom
 * - date?: string (YYYY-MM-DD) - backward compatibility, treated as both dateFrom and dateTo
 * - dryRun?: boolean - defaults to true (preview mode)
 *
 * This endpoint is designed to be called by:
 * - Admin UI manually
 * - Future cron job for automated filling
 */

import { getFirebaseAdmin } from '~~/server/utils/firebase-admin'
import { requireAuth, handleApiError } from '~~/server/utils/auth'
import {
  parseDDMMYYYY,
  getOrCalculateDeliveryEndDate,
  isValidDeliveryDay,
  getFirstModifiableDate,
  formatToYYYYMMDD
} from '~~/server/utils/delivery-dates'
import type { DurationType } from '~~/app/lib/types/order'

interface ClientToFill {
  clientId: string
  clientName: string
  email: string
  orderId: string
  packageTier: string
}

interface DateResult {
  date: string
  clientsToFill: number
  clientsFilled: number
  clients: ClientToFill[]
}

interface AutoFillResult {
  success: boolean
  dateFrom: string
  dateTo: string
  dryRun: boolean
  totalClientsToFill: number
  totalClientsFilled: number
  byDate: DateResult[]
  errors?: Array<{
    clientId: string
    date: string
    error: string
  }>
}

// Helper to generate all dates in a range
function getDateRange(fromDate: Date, toDate: Date): string[] {
  const dates: string[] = []
  const current = new Date(fromDate)
  current.setHours(0, 0, 0, 0)
  toDate.setHours(0, 0, 0, 0)

  while (current <= toDate) {
    dates.push(formatToYYYYMMDD(current))
    current.setDate(current.getDate() + 1)
  }

  return dates
}

// Helper to parse YYYY-MM-DD date string
function parseYYYYMMDD(dateStr: string): Date {
  const parts = dateStr.split('-').map(Number)
  const year = parts[0] ?? 2000
  const month = parts[1] ?? 1
  const day = parts[2] ?? 1
  const date = new Date(year, month - 1, day)
  date.setHours(0, 0, 0, 0)
  return date
}

export default defineEventHandler(async (event) => {
  try {
    requireAuth(event)
    const body = await readBody(event)

    // Parse request parameters with backward compatibility
    let dateFrom = body.dateFrom as string | undefined
    let dateTo = body.dateTo as string | undefined
    const legacyDate = body.date as string | undefined
    const dryRun = body.dryRun !== false // Default to true

    // Backward compatibility: if only 'date' is provided, use it for both
    if (legacyDate && !dateFrom && !dateTo) {
      dateFrom = legacyDate
      dateTo = legacyDate
    }

    // If no dates provided, use first modifiable date
    if (!dateFrom) {
      const firstModifiable = getFirstModifiableDate()
      dateFrom = formatToYYYYMMDD(firstModifiable)
    }
    if (!dateTo) {
      dateTo = dateFrom
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(dateFrom) || !dateRegex.test(dateTo)) {
      throw createError({
        statusCode: 400,
        message: 'Neplatný formát dátumu (očakávaný YYYY-MM-DD)'
      })
    }

    // Parse dates and validate range
    const fromDate = parseYYYYMMDD(dateFrom)
    const toDate = parseYYYYMMDD(dateTo)

    if (fromDate > toDate) {
      throw createError({
        statusCode: 400,
        message: 'Dátum "od" musí byť pred dátumom "do"'
      })
    }

    const { firestore } = getFirebaseAdmin()

    // Get all dates in the range
    const allDates = getDateRange(fromDate, toDate)

    // Get all approved orders (once, for all dates)
    const approvedOrdersQuery = await firestore.collection('orders')
      .where('orderStatus', '==', 'approved')
      .get()

    // Process each date
    const byDate: DateResult[] = []
    const allErrors: Array<{ clientId: string; date: string; error: string }> = []
    let totalClientsToFill = 0
    let totalClientsFilled = 0
    const nowTimestamp = new Date()

    for (const date of allDates) {
      const targetDate = parseYYYYMMDD(date)

      // Get existing selections for this date
      const selectionsQuery = await firestore.collection('mealSelections')
        .where('date', '==', date)
        .get()

      const clientsWithSelections = new Set(
        selectionsQuery.docs.map(doc => doc.data().clientId)
      )

      // Find clients with active orders for this date who haven't selected
      const orderDataMap = new Map<string, { orderId: string; packageTier: string }>()

      for (const orderDoc of approvedOrdersQuery.docs) {
        const order = orderDoc.data()
        const orderClientId = order.clientId

        // Skip if client already made a selection for this date
        if (clientsWithSelections.has(orderClientId)) {
          continue
        }

        // Parse delivery start date (DD.MM.YYYY format)
        const startDate = parseDDMMYYYY(order.deliveryStartDate)
        startDate.setHours(0, 0, 0, 0)

        // Skip if target date is before start date
        if (targetDate < startDate) {
          continue
        }

        // Calculate or get delivery end date
        const endDate = getOrCalculateDeliveryEndDate({
          deliveryStartDate: order.deliveryStartDate,
          duration: order.duration as DurationType,
          daysCount: order.daysCount || (order.duration === '5' ? 20 : 24),
          deliveryEndDate: order.deliveryEndDate,
          creditDays: order.creditDays
        })
        endDate.setHours(0, 0, 0, 0)

        // Skip if target date is after end date
        if (targetDate > endDate) {
          continue
        }

        // Check if target date is a valid delivery day for this package duration
        const duration = (order.duration || '5') as DurationType
        if (!isValidDeliveryDay(targetDate, duration)) {
          continue
        }

        // Store order data for this client (only if not already added)
        if (!orderDataMap.has(orderClientId)) {
          orderDataMap.set(orderClientId, {
            orderId: order.orderId,
            packageTier: order.package || 'UNKNOWN'
          })
        }
      }

      // Get client IDs that need to be processed
      const pendingClientIds = Array.from(orderDataMap.keys())

      // Check for cancelled deliveries for this date
      const cancelledSet = new Set<string>()
      if (pendingClientIds.length > 0) {
        const cancelledIds = pendingClientIds.map(id => `${id}_${date}`)
        for (let i = 0; i < cancelledIds.length; i += 10) {
          const batch = cancelledIds.slice(i, i + 10)
          const cancelledQuery = await firestore.collection('cancelledDeliveries')
            .where('__name__', 'in', batch)
            .get()

          cancelledQuery.docs.forEach(doc => {
            const clientId = doc.data().clientId
            cancelledSet.add(clientId)
          })
        }
      }

      // Filter out cancelled deliveries
      const filteredClientIds = pendingClientIds.filter(id => !cancelledSet.has(id))

      // Fetch client data
      const clientsMap = new Map<string, { fullName: string; email: string }>()
      if (filteredClientIds.length > 0) {
        const clientChunks = []
        for (let i = 0; i < filteredClientIds.length; i += 10) {
          clientChunks.push(filteredClientIds.slice(i, i + 10))
        }

        for (const chunk of clientChunks) {
          const clientsQuery = await firestore.collection('clients')
            .where('__name__', 'in', chunk)
            .get()

          clientsQuery.docs.forEach(doc => {
            const data = doc.data()
            clientsMap.set(doc.id, {
              fullName: data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Neznámy',
              email: data.email || ''
            })
          })
        }
      }

      // Build list of clients to fill for this date
      const clientsToFill: ClientToFill[] = []
      for (const clientId of filteredClientIds) {
        const clientInfo = clientsMap.get(clientId)
        const orderInfo = orderDataMap.get(clientId)

        if (clientInfo && orderInfo) {
          clientsToFill.push({
            clientId,
            clientName: clientInfo.fullName,
            email: clientInfo.email,
            orderId: orderInfo.orderId,
            packageTier: orderInfo.packageTier
          })
        }
      }

      // Sort by client name
      clientsToFill.sort((a, b) => a.clientName.localeCompare(b.clientName, 'sk'))

      let clientsFilled = 0

      // Execute auto-fill if not dry run
      if (!dryRun) {
        for (const client of clientsToFill) {
          try {
            const selectionId = `${client.clientId}_${date}`
            const selectionRef = firestore.collection('mealSelections').doc(selectionId)

            // Double-check that selection doesn't exist (race condition prevention)
            const existingDoc = await selectionRef.get()
            if (existingDoc.exists) {
              continue // Skip if selection was created since we started
            }

            const selectionData = {
              clientId: client.clientId,
              orderId: client.orderId,
              date,
              selectedRanajky: 'A',
              selectedObed: 'A',
              packageTier: client.packageTier,
              autoFilled: true,
              createdAt: nowTimestamp,
              updatedAt: nowTimestamp
            }

            await selectionRef.set(selectionData)
            clientsFilled++
          } catch (error: any) {
            allErrors.push({
              clientId: client.clientId,
              date,
              error: error.message || 'Neznáma chyba'
            })
          }
        }
      }

      // Add this date's results
      byDate.push({
        date,
        clientsToFill: clientsToFill.length,
        clientsFilled,
        clients: clientsToFill
      })

      totalClientsToFill += clientsToFill.length
      totalClientsFilled += clientsFilled
    }

    const result: AutoFillResult = {
      success: allErrors.length === 0,
      dateFrom,
      dateTo,
      dryRun,
      totalClientsToFill,
      totalClientsFilled,
      byDate,
      ...(allErrors.length > 0 && { errors: allErrors })
    }

    return result
  } catch (error: any) {
    return handleApiError(error, 'Nepodarilo sa automaticky vyplniť výbery jedál')
  }
})
