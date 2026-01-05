/**
 * Client Portal Types
 * Types for the web client portal, matching the mobile app
 */

import type { DeliveryType, DeliveryCity, PendingDeliveryChange } from './order'
export type { DeliveryType, DeliveryCity, PendingDeliveryChange }

export interface Client {
  clientId: string
  firstName?: string
  lastName?: string
  fullName: string
  email: string
  phone?: string
  currentPlan: string | null
  accountStatus: 'aktívny' | 'neaktívny'
  subscriptionEndDate?: string | null
}

export interface OrderSummary {
  orderId: string
  package: string
  orderStatus: 'pending' | 'approved' | 'cancelled'
  deliveryStartDate: string
  deliveryEndDate?: string
  duration?: '5' | '6'
  daysCount?: number
  totalPrice?: number
  creditDays?: number
  deliveryType?: DeliveryType
  deliveryCity?: DeliveryCity
  deliveryAddress?: string
  pendingDeliveryChange?: PendingDeliveryChange
}

export interface MeResponse {
  linked: boolean
  client: Client | null
  activeOrders: OrderSummary[]
}

export interface LinkAccountResponse {
  success: boolean
  alreadyLinked: boolean
  client: Client
  order: OrderSummary
}

// Calendar and Meal types
export interface CalendarDataResponse {
  month: string
  publishedDates: string[]
  userSelections: Record<string, boolean>
  cancelledDates: string[]
}

export interface MealItem {
  id: string
  name: string
}

export interface RanajkyOption {
  id: 'A' | 'B'
  name: string
}

export interface ObedOption {
  id: 'A' | 'B' | 'C'
  name: string
}

export interface MobileDailyMeals {
  date: string
  available: boolean
  meals: {
    desiata: MealItem | null
    polievka: MealItem | null
    olovrant: MealItem | null
    vecera: MealItem | null
  } | null
  ranajkyOptions: RanajkyOption[]
  obedOptions: ObedOption[]
}

export interface MealSelection {
  selectedRanajky: 'A' | 'B' | null
  selectedObed: 'A' | 'B' | 'C' | null
  updatedAt: string | null
}

export interface MealSelectionResponse {
  date: string
  hasSelection: boolean
  selection: MealSelection | null
}

export interface SaveSelectionResponse {
  success: boolean
  message: string
  selection: MealSelection
}

export interface SkipDeliveryResponse {
  success: boolean
  message: string
  dates: string[]
  action: 'cancel'
  newEndDate: string
  creditDaysAdded: number
}

export interface DeliveryChangeRequest {
  deliveryType: DeliveryType
  deliveryCity?: DeliveryCity
  deliveryAddress?: string
}

export interface DeliveryChangeResponse {
  success: boolean
  message: string
  pendingChange: PendingDeliveryChange
  effectiveDateFormatted: string
}

export interface SaveSelectionRequest {
  date: string
  ranajky: 'A' | 'B' | null
  obed: 'A' | 'B' | 'C' | null
}

// Package meal slots configuration
export type PackageTier = 'EKONOMY' | 'STANDARD' | 'PREMIUM' | 'OFFICE'
export type MealSlot = 'ranajky' | 'desiata' | 'polievka' | 'obed' | 'olovrant' | 'vecera'

export const PACKAGE_MEAL_SLOTS: Record<PackageTier, MealSlot[]> = {
  EKONOMY: ['ranajky', 'polievka', 'obed', 'vecera'],
  STANDARD: ['ranajky', 'polievka', 'obed', 'olovrant', 'vecera'],
  PREMIUM: ['ranajky', 'desiata', 'polievka', 'obed', 'olovrant', 'vecera'],
  OFFICE: ['ranajky', 'desiata', 'polievka', 'obed'],
}

// Meal slot display labels in Slovak
export const MEAL_SLOT_LABELS: Record<MealSlot, string> = {
  ranajky: 'Raňajky',
  desiata: 'Desiata',
  polievka: 'Polievka',
  obed: 'Obed',
  olovrant: 'Olovrant',
  vecera: 'Večera',
}

// Helper to get package tier from package name
export function getPackageTier(packageName: string | null): PackageTier {
  if (!packageName) return 'STANDARD'
  const upper = packageName.toUpperCase()
  if (upper.includes('EKONOMY') || upper.includes('ECONOMY')) return 'EKONOMY'
  if (upper.includes('PREMIUM')) return 'PREMIUM'
  if (upper.includes('OFFICE')) return 'OFFICE'
  return 'STANDARD'
}
