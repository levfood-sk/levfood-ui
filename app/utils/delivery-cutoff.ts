/**
 * Delivery Cutoff Utilities
 * Client-side validation for delivery modifications matching server logic
 */

import type { OrderSummary } from '~/lib/types/client-portal'

// Slovak day names
const SLOVAK_DAYS = ['nedeľa', 'pondelok', 'utorok', 'streda', 'štvrtok', 'piatok', 'sobota']
const SLOVAK_MONTHS = [
  'január', 'február', 'marec', 'apríl', 'máj', 'jún',
  'júl', 'august', 'september', 'október', 'november', 'december',
]

/**
 * Cutoff logic: Days until first modifiable delivery date
 * Based on production schedule (matching server)
 */
const CUTOFF_DAYS: Record<number, number> = {
  0: 4, // Sunday → Thursday (+4 days)
  1: 4, // Monday → Friday (+4 days)
  2: 4, // Tuesday → Saturday (+4 days)
  3: 5, // Wednesday → Monday (+5 days)
  4: 5, // Thursday → Tuesday (+5 days)
  5: 5, // Friday → Wednesday (+5 days)
  6: 5, // Saturday → Thursday (+5 days)
}

/**
 * Get the first modifiable date based on production schedule
 * @param now - Current date (optional, defaults to now)
 */
export function getFirstModifiableDate(now?: Date): Date {
  const today = now || new Date()
  const dayOfWeek = today.getDay()
  const daysToAdd = CUTOFF_DAYS[dayOfWeek]

  const result = new Date(today)
  result.setDate(result.getDate() + daysToAdd)
  result.setHours(0, 0, 0, 0)

  return result
}

/**
 * Check if a date can be modified (meal selection or skip)
 * @param targetDate - Date string in YYYY-MM-DD format
 * @param deliveryDays - Number of delivery days per week (5 or 6)
 */
export function canModifyDate(targetDate: string, deliveryDays: 5 | 6 = 5): boolean {
  const target = parseDate(targetDate)
  if (!target) return false

  const firstModifiable = getFirstModifiableDate()
  target.setHours(0, 0, 0, 0)

  // Can only modify dates on or after the first modifiable date
  if (target < firstModifiable) {
    return false
  }

  // Check if it's a valid delivery day
  return isValidDeliveryDay(targetDate, deliveryDays)
}

/**
 * Check if date is a valid delivery day based on package
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param deliveryDays - Number of delivery days per week (5 or 6)
 */
export function isValidDeliveryDay(dateStr: string, deliveryDays: 5 | 6 = 5): boolean {
  const date = parseDate(dateStr)
  if (!date) return false

  const dayOfWeek = date.getDay()

  // 5-day delivery: Monday to Friday (1-5)
  if (deliveryDays === 5) {
    return dayOfWeek >= 1 && dayOfWeek <= 5
  }

  // 6-day delivery: Monday to Saturday (1-6)
  return dayOfWeek >= 1 && dayOfWeek <= 6
}

/**
 * Format date in Slovak (e.g., "piatok 26. 12.")
 * @param dateStr - Date string in YYYY-MM-DD format
 */
export function formatDateSlovak(dateStr: string): string {
  const date = parseDate(dateStr)
  if (!date) return dateStr

  const dayName = SLOVAK_DAYS[date.getDay()]
  const day = date.getDate()
  const month = date.getMonth() + 1

  return `${dayName} ${day}. ${month}.`
}

/**
 * Format date with full month name (e.g., "26. december 2025")
 * @param dateStr - Date string in YYYY-MM-DD format
 */
export function formatDateFullSlovak(dateStr: string): string {
  const date = parseDate(dateStr)
  if (!date) return dateStr

  const day = date.getDate()
  const month = SLOVAK_MONTHS[date.getMonth()]
  const year = date.getFullYear()

  return `${day}. ${month} ${year}`
}

/**
 * Format month name in Slovak (e.g., "Január 2026")
 * @param month - Month string in YYYY-MM format
 */
export function formatMonthSlovak(month: string): string {
  const [year, monthNum] = month.split('-').map(Number)
  if (!year || !monthNum || monthNum < 1 || monthNum > 12) return month

  const monthName = SLOVAK_MONTHS[monthNum - 1]
  return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`
}

/**
 * Calculate remaining deliveries for an order
 * @param order - Order summary
 * @param cancelledDates - Array of cancelled date strings
 */
export function calculateDeliveriesRemaining(
  order: OrderSummary,
  cancelledDates: string[] = []
): number {
  if (!order.deliveryEndDate) return 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const endDate = parseDate(order.deliveryEndDate)
  if (!endDate || endDate < today) return 0

  const deliveryDays = order.duration === '6' ? 6 : 5
  let count = 0

  const current = new Date(today)
  while (current <= endDate) {
    const dateStr = formatDateISO(current)
    if (isValidDeliveryDay(dateStr, deliveryDays) && !cancelledDates.includes(dateStr)) {
      count++
    }
    current.setDate(current.getDate() + 1)
  }

  return count
}

/**
 * Parse date string to Date object
 * @param dateStr - Date string in YYYY-MM-DD format
 */
export function parseDate(dateStr: string): Date | null {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return null
  }

  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)

  // Validate the date components match
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }

  return date
}

/**
 * Format Date to ISO string (YYYY-MM-DD)
 * @param date - Date object
 */
export function formatDateISO(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get current month in YYYY-MM format
 */
export function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayISO(): string {
  return formatDateISO(new Date())
}

/**
 * Add months to a month string
 * @param month - Month in YYYY-MM format
 * @param delta - Number of months to add (negative to subtract)
 */
export function addMonths(month: string, delta: number): string {
  const [year, m] = month.split('-').map(Number)
  const date = new Date(year, m - 1 + delta, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Get all dates in a month
 * @param month - Month in YYYY-MM format
 */
export function getDatesInMonth(month: string): string[] {
  const [year, m] = month.split('-').map(Number)
  const dates: string[] = []

  const firstDay = new Date(year, m - 1, 1)
  const lastDay = new Date(year, m, 0)

  const current = new Date(firstDay)
  while (current <= lastDay) {
    dates.push(formatDateISO(current))
    current.setDate(current.getDate() + 1)
  }

  return dates
}
