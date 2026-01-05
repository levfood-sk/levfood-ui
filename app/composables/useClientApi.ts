/**
 * Client API Composable
 * API wrapper for all meal/calendar endpoints with authentication
 */

import type {
  CalendarDataResponse,
  MobileDailyMeals,
  MealSelectionResponse,
  SaveSelectionRequest,
  SaveSelectionResponse,
  SkipDeliveryResponse,
  DeliveryChangeRequest,
  DeliveryChangeResponse,
} from '~/lib/types/client-portal'

export const useClientApi = () => {
  const { getIdToken } = useClientAuth()

  // Helper to get auth headers
  const getAuthHeaders = async (): Promise<HeadersInit> => {
    const token = await getIdToken()
    if (!token) {
      throw new Error('Nie ste prihlásený')
    }
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  }

  /**
   * Get calendar data for a month
   * @param month - Month in YYYY-MM format
   */
  const getCalendarData = async (month: string): Promise<CalendarDataResponse> => {
    const headers = await getAuthHeaders()
    return await $fetch<CalendarDataResponse>(`/api/mobile/calendar-data/${month}`, {
      headers,
    })
  }

  /**
   * Get daily meals for a specific date
   * @param date - Date in YYYY-MM-DD format
   */
  const getMealsForDate = async (date: string): Promise<MobileDailyMeals> => {
    const headers = await getAuthHeaders()
    return await $fetch<MobileDailyMeals>(`/api/mobile/meals/${date}`, {
      headers,
    })
  }

  /**
   * Get user's meal selection for a specific date
   * @param date - Date in YYYY-MM-DD format
   */
  const getMealSelection = async (date: string): Promise<MealSelectionResponse> => {
    const headers = await getAuthHeaders()
    return await $fetch<MealSelectionResponse>(`/api/mobile/meal-selections/${date}`, {
      headers,
    })
  }

  /**
   * Save meal selection for a date
   * @param data - Selection data with date, ranajky, and obed
   */
  const saveMealSelection = async (data: SaveSelectionRequest): Promise<SaveSelectionResponse> => {
    const headers = await getAuthHeaders()
    // API expects selectedRanajky/selectedObed field names
    return await $fetch<SaveSelectionResponse>('/api/mobile/meal-selections', {
      method: 'POST',
      headers,
      body: {
        date: data.date,
        selectedRanajky: data.ranajky,
        selectedObed: data.obed,
      },
    })
  }

  /**
   * Skip a delivery day
   * @param date - Date in YYYY-MM-DD format
   */
  const skipDelivery = async (date: string): Promise<SkipDeliveryResponse> => {
    const headers = await getAuthHeaders()
    return await $fetch<SkipDeliveryResponse>('/api/mobile/cancelled-deliveries', {
      method: 'POST',
      headers,
      body: { dates: [date] },
    })
  }

  /**
   * Request a delivery address change
   * Change takes effect after a 4-day period
   */
  const requestDeliveryChange = async (data: DeliveryChangeRequest): Promise<DeliveryChangeResponse> => {
    const headers = await getAuthHeaders()
    return await $fetch<DeliveryChangeResponse>('/api/mobile/delivery-change', {
      method: 'POST',
      headers,
      body: data,
    })
  }

  return {
    getCalendarData,
    getMealsForDate,
    getMealSelection,
    saveMealSelection,
    skipDelivery,
    requestDeliveryChange,
  }
}
