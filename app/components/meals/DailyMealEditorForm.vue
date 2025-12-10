<template>
  <div v-if="date" class="space-y-6">
    <div class="mb-6">
      <h3 class="text-2xl font-semibold text-slate-900">
        {{ formattedDate }}
      </h3>
      <div v-if="isPublished" class="flex items-center gap-2 mt-2">
        <UIcon name="i-heroicons-check-circle-solid" class="w-5 h-5 text-green-500" />
        <span class="text-sm text-green-600 font-medium">Publikované</span>
      </div>
    </div>

    <div class="space-y-6">
      <!-- Ranajky (Breakfast) - A/B options -->
      <div class="space-y-3">
        <h4 class="font-medium text-gray-700">{{ MEAL_LABELS.ranajky }}</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-sm text-gray-600 mb-1">{{ RANAJKY_LABELS.optionA }}</label>
            <UInput
              v-model="formData.ranajkyOptions.optionA"
              placeholder="Zadajte názov jedla"
              size="md"
            />
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">{{ RANAJKY_LABELS.optionB }}</label>
            <UInput
              v-model="formData.ranajkyOptions.optionB"
              placeholder="Zadajte názov jedla"
              size="md"
            />
          </div>
        </div>
      </div>

      <!-- Desiata -->
      <div class="space-y-3">
        <h4 class="font-medium text-gray-700">{{ MEAL_LABELS.desiata }}</h4>
        <UInput
          v-model="formData.meals.desiata"
          placeholder="Zadajte názov jedla"
          size="md"
        />
      </div>

      <!-- Polievka -->
      <div class="space-y-3">
        <h4 class="font-medium text-gray-700">{{ MEAL_LABELS.polievka }}</h4>
        <UInput
          v-model="formData.meals.polievka"
          placeholder="Zadajte názov jedla"
          size="md"
        />
      </div>

      <!-- Obed (Lunch) - 3 options -->
      <div class="space-y-3">
        <h4 class="font-medium text-gray-700">{{ MEAL_LABELS.obed }}</h4>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label class="block text-sm text-gray-600 mb-1">{{ OBED_LABELS.optionA }}</label>
            <UInput
              v-model="formData.obedOptions.optionA"
              placeholder="Zadajte názov jedla"
              size="md"
            />
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">{{ OBED_LABELS.optionB }}</label>
            <UInput
              v-model="formData.obedOptions.optionB"
              placeholder="Zadajte názov jedla"
              size="md"
            />
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">{{ OBED_LABELS.optionC }}</label>
            <UInput
              v-model="formData.obedOptions.optionC"
              placeholder="Zadajte názov jedla"
              size="md"
            />
          </div>
        </div>
      </div>

      <!-- Olovrant -->
      <div class="space-y-3">
        <h4 class="font-medium text-gray-700">{{ MEAL_LABELS.olovrant }}</h4>
        <UInput
          v-model="formData.meals.olovrant"
          placeholder="Zadajte názov jedla"
          size="md"
        />
      </div>

      <!-- Vecera -->
      <div class="space-y-3">
        <h4 class="font-medium text-gray-700">{{ MEAL_LABELS.vecera }}</h4>
        <UInput
          v-model="formData.meals.vecera"
          placeholder="Zadajte názov jedla"
          size="md"
        />
      </div>
    </div>

    <div class="flex flex-col md:flex-row items-stretch md:items-center gap-3 pt-4">
      <button
        class="flex items-center justify-center hero-button border-2 border-transparent bg-[var(--color-orange)] text-[var(--color-dark-green)] font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg font-condensed disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        :disabled="isSaving"
        @click="handleSave"
      >
        <UIcon v-if="isSaving" name="i-heroicons-arrow-path" class="w-5 h-5 mr-2 animate-spin" />
        {{ isSaving ? 'Ukladám...' : (isFormComplete ? 'Uložiť a publikovať' : 'Uložiť koncept') }}
      </button>

      <button
        class="flex items-center justify-center hero-button border-2 border-[var(--color-orange)] text-[var(--color-orange)] font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:bg-[var(--color-orange)] hover:text-[var(--color-dark-green)] hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        @click="handleCancel"
      >
        Zrušiť
      </button>

      <div v-if="!isFormComplete" class="text-sm text-gray-500 md:ml-4">
        Vyplňte všetky polia pre publikovanie
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DailyMeal, RanajkyOptions, ObedOptions } from '~/lib/types/meals'
import { MEAL_LABELS, RANAJKY_LABELS, OBED_LABELS } from '~/lib/types/meals'

interface Props {
  date: string | null
  initialData: DailyMeal | null
}

interface FormData {
  meals: {
    desiata: string
    polievka: string
    olovrant: string
    vecera: string
  }
  ranajkyOptions: RanajkyOptions
  obedOptions: ObedOptions
}

interface Emits {
  (e: 'save', data: FormData): void
  (e: 'cancel'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const isSaving = ref(false)

const formData = ref<FormData>({
  meals: {
    desiata: '',
    polievka: '',
    olovrant: '',
    vecera: ''
  },
  ranajkyOptions: {
    optionA: '',
    optionB: ''
  },
  obedOptions: {
    optionA: '',
    optionB: '',
    optionC: ''
  }
})

const isPublished = computed(() => props.initialData?.isPublished === true)

const formattedDate = computed(() => {
  if (!props.date) return ''
  const [year, month, day] = props.date.split('-').map(Number)
  const dateObj = new Date(year, month - 1, day)
  const months = [
    'Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún',
    'Júl', 'August', 'September', 'Október', 'November', 'December'
  ]
  const dayNames = ['Nedeľa', 'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota']
  return `${dayNames[dateObj.getDay()]} ${day}. ${months[month - 1]} ${year}`
})

const isFormComplete = computed(() => {
  // Check regular meals
  const mealsComplete = 
    formData.value.meals.desiata?.trim() !== '' &&
    formData.value.meals.polievka?.trim() !== '' &&
    formData.value.meals.olovrant?.trim() !== '' &&
    formData.value.meals.vecera?.trim() !== ''

  // Check ranajky options
  const ranajkyComplete = 
    formData.value.ranajkyOptions.optionA?.trim() !== '' &&
    formData.value.ranajkyOptions.optionB?.trim() !== ''

  // Check obed options
  const obedComplete = 
    formData.value.obedOptions.optionA?.trim() !== '' &&
    formData.value.obedOptions.optionB?.trim() !== '' &&
    formData.value.obedOptions.optionC?.trim() !== ''

  return mealsComplete && ranajkyComplete && obedComplete
})

// Watch for initialData changes to populate form
watch(() => props.initialData, (newData) => {
  if (newData) {
    formData.value = {
      meals: {
        desiata: newData.meals?.desiata || '',
        polievka: newData.meals?.polievka || '',
        olovrant: newData.meals?.olovrant || '',
        vecera: newData.meals?.vecera || ''
      },
      ranajkyOptions: {
        optionA: newData.ranajkyOptions?.optionA || '',
        optionB: newData.ranajkyOptions?.optionB || ''
      },
      obedOptions: {
        optionA: newData.obedOptions?.optionA || '',
        optionB: newData.obedOptions?.optionB || '',
        optionC: newData.obedOptions?.optionC || ''
      }
    }
  } else {
    // Reset form if no initial data
    formData.value = {
      meals: {
        desiata: '',
        polievka: '',
        olovrant: '',
        vecera: ''
      },
      ranajkyOptions: {
        optionA: '',
        optionB: ''
      },
      obedOptions: {
        optionA: '',
        optionB: '',
        optionC: ''
      }
    }
  }
}, { immediate: true, deep: true })

function handleCancel() {
  emit('cancel')
}

function handleSave() {
  emit('save', { ...formData.value })
}
</script>
