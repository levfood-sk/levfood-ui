import type { DayMeals, MealOptions } from '~/lib/types/meals'

/**
 * Get the Monday of the week for a given date
 */
export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day // Handle Sunday (0) and other days
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Get Saturday of the week for a given date
 */
export function getSaturdayOfWeek(date: Date): Date {
  const monday = getMondayOfWeek(date)
  const saturday = new Date(monday)
  saturday.setDate(monday.getDate() + 5)
  saturday.setHours(23, 59, 59, 999)
  return saturday
}

/**
 * Get ISO week number for a date
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

/**
 * Generate week ID in YYYY-MM-DD format (Monday date)
 */
export function getWeekId(date: Date): string {
  const monday = getMondayOfWeek(date)
  const year = monday.getFullYear()
  const month = String(monday.getMonth() + 1).padStart(2, '0')
  const day = String(monday.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Parse week ID back to Monday date
 */
export function parseWeekId(weekId: string): Date {
  const [year, month, day] = weekId.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Format date range for display (e.g., "6.1.2025 - 11.1.2025")
 */
export function formatDateRange(monday: Date, saturday: Date): string {
  const formatDate = (d: Date) => {
    return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`
  }
  return `${formatDate(monday)} - ${formatDate(saturday)}`
}

/**
 * Create empty meal options
 */
export function createEmptyMealOptions(): MealOptions {
  return {
    optionA: '',
    optionB: ''
  }
}

/**
 * Create empty day meals structure
 */
export function createEmptyDayMeals(): DayMeals {
  return {
    ranaiky: '',
    desiata: '',
    obed: createEmptyMealOptions(),
    polievka: '',
    olovrant: '',
    vecera: '',
    isComplete: false
  }
}

/**
 * Check if a day's meals are complete (all fields filled)
 */
export function isDayComplete(dayMeals: DayMeals): boolean {
  const meals: Array<keyof Omit<DayMeals, 'isComplete'>> = [
    'ranaiky', 'desiata', 'obed', 'polievka', 'olovrant', 'vecera'
  ]

  return meals.every(meal => {
    if (meal === 'obed') {
      const obedData = dayMeals.obed
      return obedData.optionA.trim() !== '' && obedData.optionB.trim() !== ''
    } else {
      const mealData = dayMeals[meal] as string
      return typeof mealData === 'string' && mealData.trim() !== ''
    }
  })
}

/**
 * Get date for a specific day in the week
 */
export function getDateForDay(monday: Date, dayIndex: number): Date {
  const date = new Date(monday)
  date.setDate(monday.getDate() + dayIndex)
  return date
}
