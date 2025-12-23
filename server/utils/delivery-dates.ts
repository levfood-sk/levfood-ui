import type { DurationType } from '~~/app/lib/types/order'

/**
 * Delivery Date Utilities
 *
 * Centralized utility for all delivery date calculations.
 * Handles 5-day packages (Mon-Fri) and 6-day packages (Mon-Sat).
 * Sunday is NEVER a delivery day.
 */

/**
 * Parse a date string in DD.MM.YYYY format to a Date object
 * @param dateStr - Date string in DD.MM.YYYY format (e.g., "13.01.2026")
 * @returns Date object at midnight, local time
 */
export function parseDDMMYYYY(dateStr: string): Date {
  const parts = dateStr.split('.')
  if (parts.length === 3) {
    const day = parseInt(parts[0] || '', 10)
    const month = parseInt(parts[1] || '', 10) - 1 // JavaScript months are 0-indexed
    const year = parseInt(parts[2] || '', 10)
    const date = new Date(year, month, day)
    date.setHours(0, 0, 0, 0)
    return date
  }
  // Fallback to standard parsing if format is different
  const date = new Date(dateStr)
  date.setHours(0, 0, 0, 0)
  return date
}

/**
 * Format a Date object to DD.MM.YYYY string
 * @param date - Date object to format
 * @returns String in DD.MM.YYYY format (e.g., "13.01.2026")
 */
export function formatToDDMMYYYY(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}.${month}.${year}`
}

/**
 * Format a Date object to YYYY-MM-DD string (ISO format for APIs)
 * @param date - Date object to format
 * @returns String in YYYY-MM-DD format (e.g., "2026-01-13")
 */
export function formatToYYYYMMDD(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${year}-${month}-${day}`
}

/**
 * Check if a given date is a valid delivery day
 * - Sunday (0) is NEVER a delivery day for any package
 * - Saturday (6) is a delivery day ONLY for 6-day packages
 * - Monday-Friday are always valid
 *
 * @param date - The date to check
 * @param duration - '5' (Mon-Fri) or '6' (Mon-Sat)
 * @returns true if the date is a valid delivery day
 */
export function isValidDeliveryDay(date: Date, duration: DurationType): boolean {
  const dayOfWeek = date.getDay() // 0=Sunday, 6=Saturday

  // Sunday is NEVER a delivery day
  if (dayOfWeek === 0) return false

  // Saturday is only valid for 6-day packages
  if (dayOfWeek === 6 && duration === '5') return false

  return true
}

/**
 * Get the next valid delivery day from a given date
 * If the given date is already a valid delivery day, returns a copy of it.
 * Otherwise, returns the next valid delivery day.
 *
 * @param date - Starting date
 * @param duration - '5' or '6'
 * @returns The next valid delivery day (new Date object)
 */
export function getNextValidDeliveryDay(date: Date, duration: DurationType): Date {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)

  while (!isValidDeliveryDay(result, duration)) {
    result.setDate(result.getDate() + 1)
  }

  return result
}

/**
 * Calculate the delivery end date given a start date and total deliveries
 *
 * Algorithm:
 * 1. Start from deliveryStartDate
 * 2. If start date is not a valid delivery day, move to the next valid day
 * 3. Count forward through valid delivery days only
 * 4. For 5-day: Mon-Fri (skip Sat, Sun)
 * 5. For 6-day: Mon-Sat (skip Sun only)
 * 6. Stop when you've counted daysCount valid days
 * 7. Return that final date
 *
 * @param startDateStr - Start date in DD.MM.YYYY format
 * @param duration - '5' or '6'
 * @param daysCount - Total number of deliveries (typically 20 or 24)
 * @returns Date object representing the last delivery day
 */
export function calculateDeliveryEndDate(
  startDateStr: string,
  duration: DurationType,
  daysCount: number,
): Date {
  const startDate = parseDDMMYYYY(startDateStr)
  let currentDate = new Date(startDate)
  currentDate.setHours(0, 0, 0, 0)
  let deliveryDaysCount = 0

  // Make sure we start on a valid delivery day
  currentDate = getNextValidDeliveryDay(currentDate, duration)

  // Count daysCount valid delivery days
  while (deliveryDaysCount < daysCount) {
    if (isValidDeliveryDay(currentDate, duration)) {
      deliveryDaysCount++
      if (deliveryDaysCount === daysCount) {
        break // This is the last delivery day
      }
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return currentDate
}

/**
 * Extend a delivery end date by adding valid delivery days
 * Used when a user cancels a delivery and gets credit days
 *
 * For example:
 * - 5-day package ends Friday, +1 credit = next Monday
 * - 6-day package ends Saturday, +1 credit = next Monday
 *
 * @param currentEndDate - Current end date (Date object)
 * @param duration - '5' or '6'
 * @param daysToAdd - Number of valid delivery days to add
 * @returns New end date (new Date object)
 */
export function extendDeliveryEndDate(
  currentEndDate: Date,
  duration: DurationType,
  daysToAdd: number,
): Date {
  let result = new Date(currentEndDate)
  result.setHours(0, 0, 0, 0)

  let addedDays = 0
  while (addedDays < daysToAdd) {
    result.setDate(result.getDate() + 1)
    if (isValidDeliveryDay(result, duration)) {
      addedDays++
    }
  }

  return result
}

/**
 * Order data subset needed for end date calculation
 */
export interface OrderDateData {
  deliveryStartDate: string
  duration: DurationType
  daysCount: number
  deliveryEndDate?: Date | { toDate: () => Date } | null
  creditDays?: number
}

/**
 * Get or calculate delivery end date from order data
 * Handles legacy orders that may not have deliveryEndDate stored
 *
 * Priority:
 * 1. If deliveryEndDate exists, use it
 * 2. Otherwise, calculate from deliveryStartDate + daysCount + creditDays
 *
 * @param order - Order data with delivery information
 * @returns Date object representing the computed end date
 */
export function getOrCalculateDeliveryEndDate(order: OrderDateData): Date {
  const creditDays = order.creditDays || 0

  // If deliveryEndDate exists, use it
  if (order.deliveryEndDate) {
    let endDate: Date

    // Handle Firestore Timestamp with toDate() method
    if (typeof (order.deliveryEndDate as any).toDate === 'function') {
      endDate = (order.deliveryEndDate as { toDate: () => Date }).toDate()
    } else {
      endDate = new Date(order.deliveryEndDate as Date)
    }

    endDate.setHours(0, 0, 0, 0)
    return endDate
  }

  // Calculate from scratch for legacy orders
  const baseEndDate = calculateDeliveryEndDate(
    order.deliveryStartDate,
    order.duration,
    order.daysCount,
  )

  // Add credit days if any
  if (creditDays > 0) {
    return extendDeliveryEndDate(baseEndDate, order.duration, creditDays)
  }

  return baseEndDate
}
