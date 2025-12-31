/**
 * Composable to check if promotional discounts are currently active
 * Based on DISCOUNT_END_DATE environment variable
 *
 * The discount expires on 2026-01-01 at 00:01 Bratislava time (Europe/Bratislava = UTC+1)
 */
export function useDiscount() {
  const config = useRuntimeConfig()

  /**
   * Check if discounts are currently active
   * Returns true if current time is before the discount end date
   */
  const isDiscountActive = computed(() => {
    const endDateStr = config.public.discountEndDate
    if (!endDateStr) return false

    try {
      // Parse ISO date string and apply Bratislava timezone (UTC+1)
      // Format expected: "2026-01-01T00:01:00"
      const endDate = new Date(endDateStr + '+01:00')

      // Check if the date is valid
      if (isNaN(endDate.getTime())) {
        console.warn('[useDiscount] Invalid DISCOUNT_END_DATE format:', endDateStr)
        return false
      }

      return new Date() < endDate
    } catch (error) {
      console.warn('[useDiscount] Error parsing DISCOUNT_END_DATE:', error)
      return false
    }
  })

  return {
    isDiscountActive,
  }
}
