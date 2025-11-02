<template>
  <UCard
    class="cursor-pointer hover:ring-2 hover:ring-orange transition-all px-0 py-0"
    :class="[
      isSelected
        ? 'bg-[var(--color-orange)] text-[var(--color-beige)]'
        : ''
    ]"
    @click="handleClick"
  >
    <div class="flex flex-col items-center gap-1">
      <div class="flex items-center justify-between w-full">
        <span
          class="text-sm font-medium"
          :class="isSelected ? 'text-[var(--color-beige)]' : 'text-gray-600'"
        >
          {{ dayShortLabel }}
        </span>
        <UIcon
          v-if="isComplete"
          name="i-heroicons-check-circle-solid"
          class="w-4 h-4"
          :class="isSelected ? 'text-[var(--color-beige)]' : 'text-green-500'"
        />
      </div>
      <div class="text-center">
        <p
          class="text-xl font-bold"
          :class="isSelected ? 'text-[var(--color-beige)]' : 'text-gray-900'"
        >
          {{ dayNumber }}
        </p>
        <p
          class="text-xs"
          :class="isSelected ? 'text-[var(--color-beige)]' : 'text-gray-500'"
        >
          {{ monthName }}
        </p>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { DayName } from '~/lib/types/meals'
import { DAY_SHORT_LABELS } from '~/lib/types/meals'

interface Props {
  day: DayName
  date: Date
  isComplete: boolean
  isSelected: boolean
}

interface Emits {
  (e: 'click', day: DayName): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const dayShortLabel = computed(() => DAY_SHORT_LABELS[props.day])

const dayNumber = computed(() => props.date.getDate())

const monthName = computed(() => {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Máj', 'Jún',
    'Júl', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'
  ]
  return months[props.date.getMonth()]
})

function handleClick() {
  emit('click', props.day)
}
</script>
