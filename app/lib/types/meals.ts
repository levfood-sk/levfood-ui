export interface MealOptions {
  optionA: string
  optionB: string
}

export interface DayMeals {
  ranaiky: MealOptions
  desiata: MealOptions
  obed: MealOptions
  polievka: MealOptions
  olovrant: MealOptions
  vecera: MealOptions
  isComplete: boolean
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

export type MealType = 'ranaiky' | 'desiata' | 'obed' | 'polievka' | 'olovrant' | 'vecera'

export const MEAL_LABELS: Record<MealType, string> = {
  ranaiky: 'Raňajky',
  desiata: 'Desiata',
  obed: 'Obed',
  polievka: 'Polievka',
  olovrant: 'Olovrant',
  vecera: 'Večera'
}

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
