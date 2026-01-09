// Legacy types (keeping for backward compatibility during migration)
export interface MealOptions {
  optionA: string
  optionB: string
}

export interface DayMeals {
  ranaiky: string
  desiata: string
  obed: MealOptions
  polievka: string
  olovrant: string
  vecera: string
  isComplete: boolean
}

// New date-based types for daily meals

export interface RanajkyOptions {
  optionA: string
  optionB: string
}

export interface ObedOptions {
  optionA: string
  optionB: string
  optionC: string
}

export interface DailyMeal {
  date: string // "YYYY-MM-DD"
  meals: {
    desiata: string
    polievka: string
    olovrant: string
    vecera: string
  }
  ranajkyOptions: RanajkyOptions
  obedOptions: ObedOptions
  isPublished: boolean
  createdAt: Date
  updatedAt: Date
}

// User meal selection for a specific day
export type RanajkyChoice = 'A' | 'B'
export type ObedChoice = 'A' | 'B' | 'C'

export interface MealSelection {
  clientId: string
  orderId: string
  date: string // "YYYY-MM-DD"
  selectedRanajky: RanajkyChoice
  selectedObed: ObedChoice
  packageTier: string
  autoFilled?: boolean // true if auto-filled by system, undefined/false if user-selected
  createdAt: Date
  updatedAt: Date
}

// Cancelled delivery tracking
export interface CancelledDelivery {
  clientId: string
  orderId: string
  date: string
  creditApplied: boolean
  cancelledAt: Date
}

export interface WeekMeals {
  weekStart: Date
  weekEnd: Date
  year: number
  weekNumber: number
  days: {
    monday?: DayMeals
    tuesday?: DayMeals
    wednesday?: DayMeals
    thursday?: DayMeals
    friday?: DayMeals
    saturday?: DayMeals
  }
  createdAt: Date
  updatedAt: Date
}

export type DayName = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday'

export type MealType = 'ranajky' | 'desiata' | 'obed' | 'polievka' | 'olovrant' | 'vecera'

export const MEAL_LABELS: Record<MealType, string> = {
  ranajky: 'Raňajky',
  desiata: 'Desiata',
  obed: 'Obed',
  polievka: 'Polievka',
  olovrant: 'Olovrant',
  vecera: 'Večera'
}

export const RANAJKY_LABELS = {
  optionA: 'Variant A',
  optionB: 'Variant B'
} as const

export const OBED_LABELS = {
  optionA: 'Variant A',
  optionB: 'Variant B',
  optionC: 'Variant C'
} as const

export const DAY_LABELS: Record<DayName, string> = {
  monday: 'Pondelok',
  tuesday: 'Utorok',
  wednesday: 'Streda',
  thursday: 'Štvrtok',
  friday: 'Piatok',
  saturday: 'Sobota'
}

export const DAY_SHORT_LABELS: Record<DayName, string> = {
  monday: 'Po',
  tuesday: 'Ut',
  wednesday: 'St',
  thursday: 'Št',
  friday: 'Pi',
  saturday: 'So'
}
