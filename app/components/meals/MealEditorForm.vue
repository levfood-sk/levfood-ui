<template>
  <div v-if="day && date" class="space-y-6">
    <div class="mb-6">
      <h3 class="text-2xl font-semibold text-slate-900">
        {{ dayLabel }} {{ formattedDate }}
      </h3>
    </div>

    <div class="space-y-6">
      <div
        v-for="mealType in mealTypes"
        :key="mealType"
        class="space-y-3"
      >
        <h4 class="font-medium text-gray-700">{{ MEAL_LABELS[mealType] }}</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-sm text-gray-600 mb-1">Variant A</label>
            <UInput
              v-model="formData[mealType].optionA"
              placeholder="Zadajte názov jedla"
              size="md"
            />
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">Variant B</label>
            <UInput
              v-model="formData[mealType].optionB"
              placeholder="Zadajte názov jedla"
              size="md"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="flex flex-col md:flex-row items-stretch md:items-center gap-3 pt-4">
      <button
        class="flex items-center hero-button border-2 border-transparent bg-[var(--color-orange)] text-[var(--color-dark-green)] font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg font-condensed disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        :disabled="!isFormValid || isSaving"
        @click="handleSave"
      >
        <UIcon v-if="isSaving" name="i-heroicons-arrow-path" class="w-5 h-5 mr-2 animate-spin" />
        {{ isSaving ? 'Ukladám...' : 'Uložiť deň' }}
      </button>

      <button
        class="flex items-center hero-button border-2 border-[var(--color-orange)] text-[var(--color-orange)] font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:bg-[var(--color-orange)] hover:text-[var(--color-dark-green)] hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        @click="handleCancel"
      >
        Zrušiť
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DayName, MealType, DayMeals } from '~/lib/types/meals'
import { MEAL_LABELS, DAY_LABELS } from '~/lib/types/meals'

interface Props {
  day: DayName | null
  date: Date | null
  initialData: DayMeals | null
}

interface Emits {
  (e: 'save', data: DayMeals): void
  (e: 'cancel'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const isSaving = ref(false)

const mealTypes: MealType[] = ['ranaiky', 'desiata', 'obed', 'polievka', 'olovrant', 'vecera']

const formData = ref<Omit<DayMeals, 'isComplete'>>({
  ranaiky: { optionA: '', optionB: '' },
  desiata: { optionA: '', optionB: '' },
  obed: { optionA: '', optionB: '' },
  polievka: { optionA: '', optionB: '' },
  olovrant: { optionA: '', optionB: '' },
  vecera: { optionA: '', optionB: '' }
})

const dayLabel = computed(() => {
  return props.day ? DAY_LABELS[props.day] : ''
})

const formattedDate = computed(() => {
  if (!props.date) return ''
  const months = [
    'Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún',
    'Júl', 'August', 'September', 'Október', 'November', 'December'
  ]
  return `${props.date.getDate()}. ${months[props.date.getMonth()]} ${props.date.getFullYear()}`
})

const isFormValid = computed(() => {
  return mealTypes.every(meal => {
    return formData.value[meal].optionA.trim() !== '' &&
           formData.value[meal].optionB.trim() !== ''
  })
})

// Watch for initialData changes to populate form
watch(() => props.initialData, (newData) => {
  if (newData) {
    formData.value = {
      ranaiky: { ...newData.ranaiky },
      desiata: { ...newData.desiata },
      obed: { ...newData.obed },
      polievka: { ...newData.polievka },
      olovrant: { ...newData.olovrant },
      vecera: { ...newData.vecera }
    }
  } else {
    // Reset form if no initial data
    formData.value = {
      ranaiky: { optionA: '', optionB: '' },
      desiata: { optionA: '', optionB: '' },
      obed: { optionA: '', optionB: '' },
      polievka: { optionA: '', optionB: '' },
      olovrant: { optionA: '', optionB: '' },
      vecera: { optionA: '', optionB: '' }
    }
  }
}, { immediate: true, deep: true })

function handleCancel() {
  emit('cancel')
}

function handleSave() {
  if (!isFormValid.value) {
    return
  }

  const dayMealsData: DayMeals = {
    ...formData.value,
    isComplete: true
  }

  emit('save', dayMealsData)
}
</script>
