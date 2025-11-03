<template>
  <div class="container mx-auto max-w-7xl">
    <div class="mb-8">
      <h1 class="text-3xl font-bold mb-2">Pridanie Jedla</h1>
      <p class="text-gray-600">Spravujte jedálny lístok pre každý deň v týždni</p>
    </div>

    <div class="space-y-8">
      <!-- Week Navigator -->
      <MealsWeekNavigator
        :current-monday="currentMonday"
        @update:current-monday="handleWeekChange"
      />

      <!-- Loading State -->
      <div v-if="isLoading" class="flex justify-center py-12">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-[var(--color-orange)]" />
      </div>

      <!-- Days Grid (All 7 days in one row) -->
      <div v-else class="grid grid-cols-7 gap-2">
        <MealsDayCard
          v-for="(day, index) in daysOfWeek"
          :key="day"
          :day="day"
          :date="getDayDate(index)"
          :is-complete="isDayComplete(day)"
          :is-selected="selectedDay === day"
          @click="handleDayClick"
        />

        <!-- Sunday (Disabled) -->
        <UCard class="opacity-50 cursor-not-allowed p-2">
          <div class="flex flex-col items-center gap-1">
            <span class="text-sm font-medium text-gray-400">Ne</span>
            <div class="text-center">
              <p class="text-xl font-bold text-gray-400">{{ sundayDate.getDate() }}</p>
              <p class="text-xs text-gray-400">{{ getSundayMonth() }}</p>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Meal Editor Form (inline, shown when day is selected) -->
      <div v-if="selectedDay && !isLoading">
        <UCard>
          <MealsMealEditorForm
            :day="selectedDay"
            :date="selectedDayDate"
            :initial-data="selectedDayData"
            @save="handleMealsSave"
            @cancel="handleCancelEdit"
          />
        </UCard>
      </div>

      <!-- Save All Button (if any changes were made) -->
      <div v-if="hasUnsavedChanges && !selectedDay" class="flex justify-end">
        <button
          class="flex items-center hero-button border-2 border-transparent bg-[var(--color-orange)] text-[var(--color-dark-green)] font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg font-condensed disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          :disabled="!canSave || isSaving"
          @click="handleSave"
        >
          <UIcon v-if="isSaving" name="i-heroicons-arrow-path" class="w-5 h-5 mr-2 animate-spin" />
          {{ isSaving ? 'Ukladám...' : 'Uložiť celý týždeň' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DayName, DayMeals, WeekMeals } from '~/lib/types/meals'

definePageMeta({
  layout: 'dashboard'
})

const toast = useToast()

// State
const currentMonday = ref<Date>(getMondayOfCurrentWeek())
const weekMealsData = ref<WeekMeals | null>(null)
const isLoading = ref(false)
const isSaving = ref(false)
const selectedDay = ref<DayName | null>(null)
const hasUnsavedChanges = ref(false)

const daysOfWeek: DayName[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

// Computed
const currentWeekId = computed(() => {
  return getWeekId(currentMonday.value)
})

const sundayDate = computed(() => {
  const sunday = new Date(currentMonday.value)
  sunday.setDate(sunday.getDate() + 6)
  return sunday
})

const selectedDayDate = computed(() => {
  if (!selectedDay.value) return null
  const dayIndex = daysOfWeek.indexOf(selectedDay.value)
  return getDayDate(dayIndex)
})

const selectedDayData = computed(() => {
  if (!selectedDay.value || !weekMealsData.value?.days) {
    return null
  }
  return weekMealsData.value.days[selectedDay.value] || null
})

const canSave = computed(() => {
  if (!weekMealsData.value) return false

  // Check if all days are complete
  return daysOfWeek.every(day => {
    const dayData = weekMealsData.value!.days[day]
    return dayData?.isComplete === true
  })
})

// Methods
function getMondayOfCurrentWeek(): Date {
  const today = new Date()
  const day = today.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function getWeekId(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDayDate(dayIndex: number): Date {
  const date = new Date(currentMonday.value)
  date.setDate(date.getDate() + dayIndex)
  return date
}

function getSundayMonth(): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Máj', 'Jún', 'Júl', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']
  return months[sundayDate.value.getMonth()] || ''
}

function isDayComplete(day: DayName): boolean {
  return weekMealsData.value?.days[day]?.isComplete === true
}

async function fetchWeekMeals() {
  isLoading.value = true
  try {
    const response = await $fetch(`/api/meals/${currentWeekId.value}`)
    weekMealsData.value = response as any
    hasUnsavedChanges.value = false
  } catch (error) {
    console.error('Error fetching week meals:', error)
    toast.add({
      title: 'Chyba',
      description: 'Nepodarilo sa načítať jedálny lístok',
      color: 'error',
    })
  } finally {
    isLoading.value = false
  }
}

function handleWeekChange(newMonday: Date) {
  currentMonday.value = newMonday
}

function handleDayClick(day: DayName) {
  selectedDay.value = day
}

function handleCancelEdit() {
  selectedDay.value = null
}

function handleMealsSave(dayMeals: DayMeals) {
  if (!weekMealsData.value || !selectedDay.value) return

  // Update the day's meals in local state
  if (!weekMealsData.value.days) {
    weekMealsData.value.days = {}
  }

  weekMealsData.value.days[selectedDay.value] = dayMeals
  hasUnsavedChanges.value = true
  selectedDay.value = null

  toast.add({
    title: 'Úspech',
    description: 'Deň bol uložený. Nezabudnite uložiť celý týždeň.',
    color: 'success',
  })
}

async function handleSave() {
  if (!weekMealsData.value || !canSave.value) return

  isSaving.value = true
  try {
    await $fetch(`/api/meals/${currentWeekId.value}`, {
      method: 'POST',
      body: {
        days: weekMealsData.value.days
      }
    })

    hasUnsavedChanges.value = false
    toast.add({
      title: 'Úspech',
      description: 'Celý týždeň bol úspešne uložený',
      color: 'success',
    })
  } catch (error: any) {
    console.error('Error saving meals:', error)
    toast.add({
      title: 'Chyba',
      description: error.data?.message || 'Nepodarilo sa uložiť jedálny lístok',
      color: 'error',
    })
  } finally {
    isSaving.value = false
  }
}

// Initial load
onMounted(() => {
  fetchWeekMeals()
})

// Watch for week changes
watch(currentWeekId, () => {
  selectedDay.value = null
  fetchWeekMeals()
})

// Auto-select first day when week loads (after data is fetched)
watch(() => weekMealsData.value, (newData) => {
  if (newData && !selectedDay.value && daysOfWeek.length > 0) {
    selectedDay.value = daysOfWeek[0]
  }
}, { immediate: false })
</script>
