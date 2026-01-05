<script setup lang="ts">
import type {
  CalendarDataResponse,
  MobileDailyMeals,
  MealSelection,
  MealSlot,
} from '~/lib/types/client-portal'
import { PACKAGE_MEAL_SLOTS, getPackageTier } from '~/lib/types/client-portal'
import {
  getCurrentMonth,
  getTodayISO,
  formatDateSlovak,
  formatMonthSlovak,
  addMonths,
  getDatesInMonth,
  canModifyDate,
  isValidDeliveryDay,
  calculateDeliveriesRemaining,
} from '~/utils/delivery-cutoff'

definePageMeta({
  layout: false,
  middleware: 'client',
  ssr: false, // Client-only page - requires Firebase auth
})

const { client, activeOrders, signOut } = useClientAuth()
const { getCalendarData, getMealsForDate, getMealSelection, saveMealSelection, skipDelivery } = useClientApi()
const router = useRouter()

// Current state
const currentMonth = ref(getCurrentMonth())
const selectedDate = ref(getTodayISO())
const loading = ref(true)
const error = ref<string | null>(null)

// Calendar data
const calendarData = ref<CalendarDataResponse | null>(null)
const dailyMeals = ref<MobileDailyMeals | null>(null)
const mealSelection = ref<MealSelection | null>(null)

// Pending selections (before saving)
const pendingRanajky = ref<'A' | 'B' | null>(null)
const pendingObed = ref<'A' | 'B' | 'C' | null>(null)

// Caches
const mealsCache = ref<Record<string, MobileDailyMeals | null>>({})
const selectionsCache = ref<Record<string, MealSelection | null>>({})

// Modal states
const ranajkyModalOpen = ref(false)
const obedModalOpen = ref(false)
const skipModalOpen = ref(false)
const savingSelection = ref(false)
const skippingDelivery = ref(false)

// Derived state
const activeOrder = computed(() => activeOrders.value[0] || null)
const deliveryDays = computed(() => (activeOrder.value?.duration === '6' ? 6 : 5) as 5 | 6)
const packageTier = computed(() => getPackageTier(activeOrder.value?.package || null))
const mealSlots = computed(() => PACKAGE_MEAL_SLOTS[packageTier.value])

const deliveriesRemaining = computed(() => {
  if (!activeOrder.value) return 0
  return calculateDeliveriesRemaining(activeOrder.value, calendarData.value?.cancelledDates || [])
})

const selectedDateFormatted = computed(() => formatDateSlovak(selectedDate.value))
const currentMonthFormatted = computed(() => formatMonthSlovak(currentMonth.value))

const canModifySelectedDate = computed(() => canModifyDate(selectedDate.value, deliveryDays.value))

const isDateCancelled = computed(() => calendarData.value?.cancelledDates.includes(selectedDate.value) || false)

const isDatePublished = computed(() => calendarData.value?.publishedDates.includes(selectedDate.value) || false)

// Check if date is outside subscription period
const isDateOutsideSubscription = computed(() => {
  if (!activeOrder.value?.deliveryEndDate) return false
  const endDate = new Date(activeOrder.value.deliveryEndDate)
  endDate.setHours(23, 59, 59, 999)
  const selected = new Date(selectedDate.value)
  selected.setHours(0, 0, 0, 0)
  return selected > endDate
})

// Calendar grid
const calendarDays = computed(() => {
  const dates = getDatesInMonth(currentMonth.value)
  const firstDateStr = dates[0]
  if (!firstDateStr) return []
  const firstDate = new Date(firstDateStr)
  const startDayOfWeek = firstDate.getDay()
  // Adjust for Monday start (0 = Sunday in JS, we want 0 = Monday)
  const offset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1

  const grid: (string | null)[] = []

  // Add empty cells for days before the first of the month
  for (let i = 0; i < offset; i++) {
    grid.push(null)
  }

  // Add all days of the month
  grid.push(...dates)

  return grid
})

// Day names
const dayNames = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne']

// Logout handler
const handleLogout = async () => {
  await signOut()
  router.push('/client/login')
}

// Load calendar data for current month
const loadCalendarData = async () => {
  try {
    calendarData.value = await getCalendarData(currentMonth.value)
  } catch (err: any) {
    console.error('Error loading calendar data:', err)
    error.value = err.data?.message || 'Nepodarilo sa načítať kalendár'
  }
}

// Load meals and selection for selected date
const loadDateData = async (date: string) => {
  // Check cache first
  if (mealsCache.value[date] !== undefined) {
    dailyMeals.value = mealsCache.value[date]
  }
  if (selectionsCache.value[date] !== undefined) {
    const cached = selectionsCache.value[date]
    mealSelection.value = cached
    pendingRanajky.value = cached?.selectedRanajky || null
    pendingObed.value = cached?.selectedObed || null
    if (mealsCache.value[date] !== undefined) return
  }

  loading.value = true
  error.value = null

  try {
    const [mealsResponse, selectionResponse] = await Promise.all([
      getMealsForDate(date),
      getMealSelection(date),
    ])

    dailyMeals.value = mealsResponse
    mealsCache.value[date] = mealsResponse

    mealSelection.value = selectionResponse.selection
    selectionsCache.value[date] = selectionResponse.selection
    pendingRanajky.value = selectionResponse.selection?.selectedRanajky || null
    pendingObed.value = selectionResponse.selection?.selectedObed || null
  } catch (err: any) {
    console.error('Error loading date data:', err)
    error.value = err.data?.message || 'Nepodarilo sa načítať jedálniček'
    dailyMeals.value = null
    mealSelection.value = null
  } finally {
    loading.value = false
  }
}

// Handle date selection
const selectDate = (date: string | null) => {
  if (!date) return
  if (!isValidDeliveryDay(date, deliveryDays.value)) return

  selectedDate.value = date
  loadDateData(date)
}

// Handle month navigation
const goToPreviousMonth = () => {
  currentMonth.value = addMonths(currentMonth.value, -1)
  loadCalendarData()
}

const goToNextMonth = () => {
  currentMonth.value = addMonths(currentMonth.value, 1)
  loadCalendarData()
}

// Handle ranajky selection
const handleRanajkyConfirm = (selection: 'A' | 'B' | 'C') => {
  pendingRanajky.value = selection as 'A' | 'B'
  ranajkyModalOpen.value = false
}

// Handle obed selection
const handleObedConfirm = (selection: 'A' | 'B' | 'C') => {
  pendingObed.value = selection
  obedModalOpen.value = false
}

// Check if selections have changed from saved state
const hasUnsavedChanges = computed(() => {
  if (!pendingRanajky.value || !pendingObed.value) return false
  const saved = mealSelection.value
  if (!saved) return true // No saved selection yet
  return saved.selectedRanajky !== pendingRanajky.value || saved.selectedObed !== pendingObed.value
})

// Check if both selections are made
const canSave = computed(() => {
  return pendingRanajky.value && pendingObed.value && hasUnsavedChanges.value
})

// Save meal selections
const saveSelections = async () => {
  if (!pendingRanajky.value || !pendingObed.value) return

  savingSelection.value = true
  error.value = null

  try {
    const response = await saveMealSelection({
      date: selectedDate.value,
      ranajky: pendingRanajky.value,
      obed: pendingObed.value,
    })

    // Update cache and state
    mealSelection.value = response.selection
    selectionsCache.value[selectedDate.value] = response.selection

    // Update calendar data to reflect the new selection
    if (calendarData.value) {
      calendarData.value.userSelections[selectedDate.value] = true
    }
  } catch (err: any) {
    console.error('Error saving selection:', err)
    error.value = err.data?.message || 'Nepodarilo sa uložiť výber'
  } finally {
    savingSelection.value = false
  }
}

// Handle skip delivery
const handleSkipConfirm = async () => {
  skippingDelivery.value = true
  error.value = null

  try {
    await skipDelivery(selectedDate.value)

    // Update calendar data
    if (calendarData.value) {
      calendarData.value.cancelledDates.push(selectedDate.value)
    }

    skipModalOpen.value = false
  } catch (err: any) {
    console.error('Error skipping delivery:', err)
    error.value = err.data?.message || 'Nepodarilo sa preskočiť doručenie'
  } finally {
    skippingDelivery.value = false
  }
}

// Get date status for calendar display
const getDateStatus = (date: string | null): 'published' | 'selected' | 'cancelled' | null => {
  if (!date || !calendarData.value) return null
  if (calendarData.value.cancelledDates.includes(date)) return 'cancelled'
  if (calendarData.value.userSelections[date]) return 'selected'
  if (calendarData.value.publishedDates.includes(date)) return 'published'
  return null
}

// Get meal data for a slot
const getMealForSlot = (slot: MealSlot) => {
  if (!dailyMeals.value) return null

  if (slot === 'ranajky') {
    // Return selected ranajky option or first available
    const options = dailyMeals.value.ranajkyOptions
    if (pendingRanajky.value) {
      return options.find((o) => o.id === pendingRanajky.value) || null
    }
    return options[0] || null
  }

  if (slot === 'obed') {
    // Return selected obed option or first available
    const options = dailyMeals.value.obedOptions
    if (pendingObed.value) {
      return options.find((o) => o.id === pendingObed.value) || null
    }
    return options[0] || null
  }

  // Fixed meals
  return dailyMeals.value.meals?.[slot as keyof typeof dailyMeals.value.meals] || null
}

// Initialize
onMounted(async () => {
  loading.value = true
  await loadCalendarData()
  await loadDateData(selectedDate.value)
  loading.value = false
})
</script>

<template>
  <div class="min-h-screen bg-[var(--color-beige)]">
    <!-- Header with user info -->
    <header class="sticky top-0 z-40 border-b border-[var(--color-dark-green)]/10 bg-[var(--color-beige)]">
      <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <!-- Logo -->
        <NuxtLink to="/client" class="flex items-center">
          <img
            src="~/assets/icons/logo-long-orange.svg"
            alt="LevFood"
            class="h-8"
          />
        </NuxtLink>

        <!-- User info + logout -->
        <ClientOnly>
          <div class="flex items-center gap-4">
            <div class="text-right">
              <p class="font-semibold text-[var(--color-dark-green)]">
                {{ client?.fullName || 'Klient' }}
              </p>
              <p class="text-sm text-[var(--color-dark-green)]/70">
                {{ activeOrder?.package || 'Balíček' }} · <span class="text-[var(--color-orange)] font-medium">{{ deliveriesRemaining }} doručení</span>
              </p>
            </div>
            <button
              type="button"
              class="rounded-lg bg-[var(--color-orange)]/10 px-3 py-1.5 text-sm font-medium text-[var(--color-orange)] hover:bg-[var(--color-orange)]/20"
              @click="handleLogout"
            >
              Odhlásiť
            </button>
          </div>
        </ClientOnly>
      </div>
    </header>

    <!-- Main content - side by side layout -->
    <main class="mx-auto max-w-6xl px-4 py-6">
      <div class="grid items-start gap-6 lg:grid-cols-2">
        <!-- Left side: Calendar -->
        <div class="space-y-4">
          <!-- Month navigation -->
          <div class="flex h-9 items-center justify-between">
            <button
              type="button"
              class="rounded-full p-2 text-[var(--color-dark-green)] transition-colors hover:bg-[var(--color-dark-green)]/10"
              @click="goToPreviousMonth"
            >
              <UIcon name="i-heroicons-chevron-left" class="size-6" />
            </button>
            <h2 class="text-lg font-semibold text-[var(--color-dark-green)]">
              {{ currentMonthFormatted }}
            </h2>
            <button
              type="button"
              class="rounded-full p-2 text-[var(--color-dark-green)] transition-colors hover:bg-[var(--color-dark-green)]/10"
              @click="goToNextMonth"
            >
              <UIcon name="i-heroicons-chevron-right" class="size-6" />
            </button>
          </div>

          <!-- Calendar grid -->
          <div class="rounded-2xl bg-white p-4 shadow-sm">
            <!-- Day names -->
            <div class="mb-2 grid grid-cols-7 gap-1">
              <div
                v-for="day in dayNames"
                :key="day"
                class="py-2 text-center text-xs font-medium text-[var(--color-dark-green)]/60"
              >
                {{ day }}
              </div>
            </div>

            <!-- Dates grid -->
            <div class="grid grid-cols-7 gap-1">
              <template v-for="(date, index) in calendarDays" :key="index">
                <!-- Empty cell -->
                <div v-if="!date" class="aspect-square" />

                <!-- Date cell -->
                <button
                  v-else
                  type="button"
                  class="relative aspect-square rounded-lg text-sm font-medium transition-colors"
                  :class="{
                    'bg-[var(--color-dark-green)] text-white': date === selectedDate,
                    'text-[var(--color-dark-green)] hover:bg-[var(--color-dark-green)]/10':
                      date !== selectedDate && isValidDeliveryDay(date, deliveryDays),
                    'text-[var(--color-dark-green)]/30 cursor-not-allowed': !isValidDeliveryDay(date, deliveryDays),
                    'line-through': getDateStatus(date) === 'cancelled',
                  }"
                  :disabled="!isValidDeliveryDay(date, deliveryDays)"
                  @click="selectDate(date)"
                >
                  {{ new Date(date).getDate() }}

                  <!-- Status dot -->
                  <span
                    v-if="getDateStatus(date) && getDateStatus(date) !== 'cancelled'"
                    class="absolute bottom-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full"
                    :class="{
                      'bg-[var(--color-orange)]': getDateStatus(date) === 'published',
                      'bg-green-500': getDateStatus(date) === 'selected',
                    }"
                  />
                </button>
              </template>
            </div>

            <!-- Legend -->
            <div class="mt-4 flex items-center justify-center gap-4 text-xs text-[var(--color-dark-green)]/60">
              <div class="flex items-center gap-1">
                <span class="size-2 rounded-full bg-[var(--color-orange)]" />
                <span>Menu dostupné</span>
              </div>
              <div class="flex items-center gap-1">
                <span class="size-2 rounded-full bg-green-500" />
                <span>Vybraté</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right side: Meal picker -->
        <div class="space-y-4">
          <!-- Selected date header -->
          <div class="flex h-9 items-center justify-between">
            <h3 class="text-lg font-semibold capitalize text-[var(--color-dark-green)]">
              {{ selectedDateFormatted }}
            </h3>
            <span
              v-if="canModifySelectedDate"
              class="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700"
            >
              Možné upraviť
            </span>
            <span
              v-else
              class="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500"
            >
              <UIcon name="i-heroicons-lock-closed" class="size-3" />
              Uzamknutý deň
            </span>
          </div>

          <!-- Error message -->
          <UAlert
            v-if="error"
            variant="soft"
            color="error"
            :title="error"
            :close-button="{ icon: 'i-heroicons-x-mark-20-solid', color: 'error', variant: 'link' }"
            @close="error = null"
          />

          <!-- Cancelled date message -->
          <div
            v-if="isDateCancelled"
            class="rounded-2xl bg-amber-50 p-4 text-center"
          >
            <UIcon name="i-heroicons-x-circle" class="mx-auto size-8 text-amber-500" />
            <p class="mt-2 font-medium text-amber-800">Doručenie bolo preskočené</p>
            <p class="text-sm text-amber-700">Váš kredit bol predĺžený o 1 deň.</p>
          </div>

          <!-- Date outside subscription message -->
          <div
            v-else-if="isDateOutsideSubscription"
            class="rounded-2xl bg-white p-6 text-center shadow-sm"
          >
            <div class="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-[var(--color-beige)]">
              <UIcon name="i-heroicons-calendar-days" class="size-8 text-[var(--color-dark-green)]/50" />
            </div>
            <p class="font-semibold text-[var(--color-dark-green)]">Tento deň nie je súčasťou vášho predplatného</p>
            <p class="mt-2 text-sm text-[var(--color-dark-green)]/60">
              Vaše predplatné končí {{ activeOrder?.deliveryEndDate ? formatDateSlovak(activeOrder.deliveryEndDate) : '' }}.
            </p>
          </div>

          <!-- No menu message -->
          <div
            v-else-if="!isDatePublished && !loading"
            class="rounded-2xl bg-white p-6 text-center shadow-sm"
          >
            <UIcon name="i-heroicons-calendar" class="mx-auto size-12 text-[var(--color-dark-green)]/30" />
            <p class="mt-3 text-[var(--color-dark-green)]/60">
              Menu pre tento deň ešte nie je dostupné.
            </p>
          </div>

          <!-- Loading -->
          <div
            v-else-if="loading"
            class="flex items-center justify-center py-8"
          >
            <UIcon name="i-heroicons-arrow-path" class="size-8 animate-spin text-[var(--color-dark-green)]/30" />
          </div>

          <!-- Meal cards -->
          <template v-else-if="dailyMeals">
            <div class="space-y-3">
              <ClientMealCard
                v-for="slot in mealSlots"
                :key="slot"
                :meal-type="slot"
                :meal="getMealForSlot(slot)"
                :is-selectable="slot === 'ranajky' || slot === 'obed'"
                :selected-option="slot === 'ranajky' ? pendingRanajky : slot === 'obed' ? pendingObed : null"
                :disabled="!canModifySelectedDate || savingSelection"
                @select="slot === 'ranajky' ? (ranajkyModalOpen = true) : (obedModalOpen = true)"
              />
            </div>

            <!-- Action buttons -->
            <div v-if="canModifySelectedDate && !isDateCancelled" class="space-y-3 pt-2">
              <!-- Save selection button -->
              <UButton
                block
                size="lg"
                color="neutral"
                class="h-12 bg-[var(--color-dark-green)] font-medium text-white"
                :loading="savingSelection"
                :disabled="!canSave || savingSelection"
                @click="saveSelections"
              >
                <UIcon v-if="!savingSelection" name="i-heroicons-check" class="mr-2 size-5" />
                {{ savingSelection ? 'Ukladám...' : 'Uložiť výber' }}
              </UButton>

              <!-- Skip delivery button -->
              <UButton
                block
                size="lg"
                variant="outline"
                color="neutral"
                class="h-12 border-[var(--color-orange)] font-medium text-[var(--color-orange)] hover:bg-[var(--color-orange)]/10"
                :disabled="skippingDelivery"
                @click="skipModalOpen = true"
              >
                <UIcon name="i-heroicons-calendar-days" class="mr-2 size-5" />
                Preskočiť doručenie
              </UButton>
            </div>
          </template>
        </div>
      </div>
    </main>

    <!-- Ranajky selection modal -->
    <ClientMealSelectionModal
      v-model:open="ranajkyModalOpen"
      meal-type="ranajky"
      :options="dailyMeals?.ranajkyOptions || []"
      :current-selection="pendingRanajky"
      @confirm="handleRanajkyConfirm"
    />

    <!-- Obed selection modal -->
    <ClientMealSelectionModal
      v-model:open="obedModalOpen"
      meal-type="obed"
      :options="dailyMeals?.obedOptions || []"
      :current-selection="pendingObed"
      :loading="savingSelection"
      @confirm="handleObedConfirm"
    />

    <!-- Skip delivery modal -->
    <ClientSkipDeliveryModal
      v-model:open="skipModalOpen"
      :date="selectedDate"
      :formatted-date="selectedDateFormatted"
      :loading="skippingDelivery"
      @confirm="handleSkipConfirm"
    />
  </div>
</template>
